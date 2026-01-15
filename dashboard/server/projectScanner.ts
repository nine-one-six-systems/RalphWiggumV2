import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Subproject detected within a monorepo/multi-project structure
export interface SubProject {
  name: string;
  path: string;
  language: 'typescript' | 'javascript' | 'go' | 'python' | 'unknown';
  framework: string | null;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
}

// Discovered markdown document for PRD context selection
export interface DiscoveredDoc {
  path: string;           // Relative path from project root
  name: string;           // File basename
  size: number;           // File size in bytes
  directory: string;      // Parent directory (for grouping in UI)
}

export interface ProjectScan {
  projectName: string;
  projectPath: string;
  scanMode: 'embedded' | 'standalone';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
  framework: string | null;
  language: 'typescript' | 'javascript' | 'python' | 'go' | 'mixed' | 'unknown';
  detectedCommands: {
    build?: string;
    dev?: string;
    test?: string;
    lint?: string;
    typecheck?: string;
  };
  existingDocs: Array<{
    path: string;
    name: string;
    size: number;
  }>;
  // All discovered markdown files for PRD context selection
  allMarkdownFiles: DiscoveredDoc[];
  hasRalphConfig: {
    agentsMd: boolean;
    claudeMd: boolean;
    implementationPlan: boolean;
    loopSh: boolean;
    specsDir: boolean;
    cursorRules: boolean;
  };
  hasRalphSubdirectory: boolean;
  structure: Array<{
    path: string;
    type: 'dir' | 'file';
  }>;
  // Monorepo support
  subprojects: SubProject[];
  isMonorepo: boolean;
}

export class ProjectScanner extends EventEmitter {
  private projectPath: string;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  async scan(): Promise<ProjectScan> {
    const [
      packageManager,
      packageJson,
      existingDocs,
      allMarkdownFiles,
      hasRalphConfig,
      structure,
      language,
      hasRalphSubdirectory,
      subprojects,
    ] = await Promise.all([
      this.detectPackageManager(),
      this.readPackageJson(),
      this.findExistingDocs(),
      this.findAllMarkdownFiles(),
      this.checkRalphConfig(),
      this.scanStructure(),
      this.detectLanguage(),
      this.checkRalphSubdirectory(),
      this.scanSubprojects(),
    ]);

    // Determine if this is a monorepo (has subprojects but no root package.json)
    const isMonorepo = subprojects.length > 0 && !packageJson;

    // Get aggregated info from subprojects if monorepo
    const aggregatedLanguage = isMonorepo
      ? this.aggregateLanguages(subprojects)
      : language;
    const aggregatedFramework = isMonorepo
      ? this.aggregateFrameworks(subprojects)
      : this.detectFramework(packageJson);

    // Project name: use directory name for monorepo, package.json name otherwise
    const projectName = isMonorepo
      ? path.basename(this.projectPath)
      : (packageJson?.name as string) || path.basename(this.projectPath);

    const detectedCommands = isMonorepo ? {} : this.extractCommands(packageJson, packageManager);

    // Determine scan mode based on whether Ralph is a subdirectory
    const scanMode: 'embedded' | 'standalone' = hasRalphSubdirectory ? 'embedded' : 'standalone';

    return {
      projectName,
      projectPath: this.projectPath,
      scanMode,
      packageManager: isMonorepo ? null : packageManager,
      framework: aggregatedFramework,
      language: aggregatedLanguage,
      detectedCommands,
      existingDocs,
      allMarkdownFiles,
      hasRalphConfig,
      hasRalphSubdirectory,
      structure,
      subprojects,
      isMonorepo,
    };
  }

  // Check if RalphWiggumV2 exists as a subdirectory
  private async checkRalphSubdirectory(): Promise<boolean> {
    const ralphDirNames = ['RalphWiggumV2', 'ralphwiggumv2', 'ralph-wiggum-v2'];

    for (const dirName of ralphDirNames) {
      try {
        const dirPath = path.join(this.projectPath, dirName);
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          // Verify it's actually Ralph by checking for loop.sh
          await fs.access(path.join(dirPath, 'loop.sh'));
          return true;
        }
      } catch {
        // Directory doesn't exist or isn't Ralph, continue
      }
    }

    return false;
  }

  private async detectPackageManager(): Promise<ProjectScan['packageManager']> {
    const checks = [
      { file: 'bun.lockb', manager: 'bun' as const },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
      { file: 'yarn.lock', manager: 'yarn' as const },
      { file: 'package-lock.json', manager: 'npm' as const },
    ];

    for (const check of checks) {
      try {
        await fs.access(path.join(this.projectPath, check.file));
        return check.manager;
      } catch {
        // File doesn't exist, continue
      }
    }

    // Check if package.json exists (default to npm)
    try {
      await fs.access(path.join(this.projectPath, 'package.json'));
      return 'npm';
    } catch {
      return null;
    }
  }

  private async readPackageJson(): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(
        path.join(this.projectPath, 'package.json'),
        'utf-8'
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private detectFramework(packageJson: Record<string, unknown> | null): string | null {
    if (!packageJson) return null;

    const deps = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {}),
    };

    // Check for frameworks in priority order
    const frameworks = [
      { dep: 'next', name: 'Next.js' },
      { dep: '@remix-run/react', name: 'Remix' },
      { dep: 'nuxt', name: 'Nuxt' },
      { dep: 'astro', name: 'Astro' },
      { dep: 'svelte', name: 'Svelte' },
      { dep: 'vue', name: 'Vue' },
      { dep: 'vite', name: 'Vite' },
      { dep: 'react', name: 'React' },
      { dep: 'express', name: 'Express' },
      { dep: 'fastify', name: 'Fastify' },
      { dep: 'hono', name: 'Hono' },
      { dep: 'electron', name: 'Electron' },
    ];

    for (const fw of frameworks) {
      if (deps[fw.dep]) {
        // Get version for additional info
        const version = deps[fw.dep].replace(/^\^|~/, '');
        const majorVersion = version.split('.')[0];
        return `${fw.name} ${majorVersion}`;
      }
    }

    return null;
  }

  private async detectLanguage(): Promise<ProjectScan['language']> {
    const checks = [
      { file: 'tsconfig.json', lang: 'typescript' as const },
      { file: 'go.mod', lang: 'go' as const },
      { file: 'pyproject.toml', lang: 'python' as const },
      { file: 'requirements.txt', lang: 'python' as const },
      { file: 'Pipfile', lang: 'python' as const },
    ];

    for (const check of checks) {
      try {
        await fs.access(path.join(this.projectPath, check.file));
        return check.lang;
      } catch {
        // Continue checking
      }
    }

    // Check for package.json (JavaScript)
    try {
      await fs.access(path.join(this.projectPath, 'package.json'));
      return 'javascript';
    } catch {
      return 'unknown';
    }
  }

  private extractCommands(
    packageJson: Record<string, unknown> | null,
    packageManager: ProjectScan['packageManager']
  ): ProjectScan['detectedCommands'] {
    const commands: ProjectScan['detectedCommands'] = {};

    if (!packageJson || !packageManager) return commands;

    const scripts = packageJson.scripts as Record<string, string> | undefined;
    if (!scripts) return commands;

    const pm = packageManager;
    const run = pm === 'npm' ? 'npm run' : pm;

    // Map common script names to command types
    const scriptMappings: Record<string, keyof ProjectScan['detectedCommands']> = {
      build: 'build',
      dev: 'dev',
      start: 'dev',
      develop: 'dev',
      test: 'test',
      'test:unit': 'test',
      'test:e2e': 'test',
      lint: 'lint',
      'lint:fix': 'lint',
      typecheck: 'typecheck',
      'type-check': 'typecheck',
      tsc: 'typecheck',
    };

    for (const [scriptName, commandType] of Object.entries(scriptMappings)) {
      if (scripts[scriptName] && !commands[commandType]) {
        commands[commandType] = `${run} ${scriptName}`;
      }
    }

    // If no typecheck but typescript is present, suggest tsc
    if (!commands.typecheck) {
      const deps = {
        ...(packageJson.dependencies as Record<string, string> || {}),
        ...(packageJson.devDependencies as Record<string, string> || {}),
      };
      if (deps.typescript) {
        commands.typecheck = 'npx tsc --noEmit';
      }
    }

    return commands;
  }

  private async findExistingDocs(): Promise<ProjectScan['existingDocs']> {
    const docs: ProjectScan['existingDocs'] = [];

    // Common doc locations to check
    const docPaths = [
      'README.md',
      'readme.md',
      'CONTRIBUTING.md',
      'CHANGELOG.md',
      'ARCHITECTURE.md',
      'docs/README.md',
      'docs/architecture.md',
      'docs/design.md',
      'documentation/README.md',
      '.github/CONTRIBUTING.md',
    ];

    for (const docPath of docPaths) {
      try {
        const fullPath = path.join(this.projectPath, docPath);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          docs.push({
            path: docPath,
            name: path.basename(docPath),
            size: stat.size,
          });
        }
      } catch {
        // File doesn't exist, continue
      }
    }

    // Also check docs/ directory for any .md files
    try {
      const docsDir = path.join(this.projectPath, 'docs');
      const entries = await fs.readdir(docsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const docPath = `docs/${entry.name}`;
          // Avoid duplicates
          if (!docs.some(d => d.path === docPath)) {
            const stat = await fs.stat(path.join(docsDir, entry.name));
            docs.push({
              path: docPath,
              name: entry.name,
              size: stat.size,
            });
          }
        }
      }
    } catch {
      // docs/ doesn't exist
    }

    return docs;
  }

  // Find ALL markdown files recursively for PRD context selection
  private async findAllMarkdownFiles(): Promise<DiscoveredDoc[]> {
    const docs: DiscoveredDoc[] = [];
    const ignoreDirs = new Set([
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '.turbo',
      '.vercel',
      'coverage',
      '__pycache__',
      '.venv',
      'venv',
      'vendor',
      // Ignore RalphWiggumV2 subdirectory when scanning parent project
      'RalphWiggumV2',
      'ralphwiggumv2',
      'ralph-wiggum-v2',
    ]);

    const scanDir = async (dirPath: string, depth = 0): Promise<void> => {
      if (depth > 4) return; // Limit recursion depth

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (ignoreDirs.has(entry.name)) continue;

          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(this.projectPath, fullPath);

          if (entry.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.name.endsWith('.md')) {
            try {
              const stat = await fs.stat(fullPath);
              const directory = path.dirname(relativePath);
              docs.push({
                path: relativePath,
                name: entry.name,
                size: stat.size,
                directory: directory === '.' ? 'Root' : directory,
              });
            } catch {
              // Skip files we can't stat
            }
          }
        }
      } catch {
        // Can't read directory, skip
      }
    };

    await scanDir(this.projectPath);

    // Sort by path for consistent ordering
    return docs.sort((a, b) => a.path.localeCompare(b.path));
  }

  private async checkRalphConfig(): Promise<ProjectScan['hasRalphConfig']> {
    const checks = {
      agentsMd: 'AGENTS.md',
      claudeMd: 'CLAUDE.md',
      implementationPlan: 'IMPLEMENTATION_PLAN.md',
      loopSh: 'loop.sh',
      specsDir: 'specs',
      cursorRules: '.cursor/rules',
    };

    const results: ProjectScan['hasRalphConfig'] = {
      agentsMd: false,
      claudeMd: false,
      implementationPlan: false,
      loopSh: false,
      specsDir: false,
      cursorRules: false,
    };

    await Promise.all(
      Object.entries(checks).map(async ([key, filePath]) => {
        try {
          await fs.access(path.join(this.projectPath, filePath));
          results[key as keyof typeof results] = true;
        } catch {
          // File doesn't exist
        }
      })
    );

    // Also check if AGENTS.md is configured (not just template)
    if (results.agentsMd) {
      try {
        const content = await fs.readFile(
          path.join(this.projectPath, 'AGENTS.md'),
          'utf-8'
        );
        // Check if it's still the default template
        if (content.includes('[Replace with your project-specific')) {
          results.agentsMd = false; // Treat as unconfigured
        }
      } catch {
        // Error reading, keep as true
      }
    }

    return results;
  }

  private async scanStructure(): Promise<ProjectScan['structure']> {
    const structure: ProjectScan['structure'] = [];
    const ignoreDirs = new Set([
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.turbo',
      '.vercel',
      'coverage',
      '__pycache__',
      '.venv',
      'venv',
      // Ignore RalphWiggumV2 subdirectory when scanning parent project
      'RalphWiggumV2',
      'ralphwiggumv2',
      'ralph-wiggum-v2',
    ]);

    const scanDir = async (dirPath: string, depth = 0): Promise<void> => {
      if (depth > 2) return; // Limit depth

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (ignoreDirs.has(entry.name)) continue;

          const relativePath = path.relative(
            this.projectPath,
            path.join(dirPath, entry.name)
          );

          if (entry.isDirectory()) {
            structure.push({ path: relativePath, type: 'dir' });
            await scanDir(path.join(dirPath, entry.name), depth + 1);
          } else if (depth === 0) {
            // Only include top-level files
            structure.push({ path: relativePath, type: 'file' });
          }
        }
      } catch {
        // Can't read directory
      }
    };

    await scanDir(this.projectPath);
    return structure;
  }

  // Scan for subprojects in subdirectories (monorepo support)
  private async scanSubprojects(): Promise<SubProject[]> {
    const subprojects: SubProject[] = [];
    const ignoreDirs = new Set([
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      '.turbo',
      '.vercel',
      'coverage',
      '__pycache__',
      '.venv',
      'venv',
      'RalphWiggumV2',
      'ralphwiggumv2',
      'ralph-wiggum-v2',
      '.claude',
      '.cursor',
    ]);

    try {
      const entries = await fs.readdir(this.projectPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (ignoreDirs.has(entry.name)) continue;

        const subPath = path.join(this.projectPath, entry.name);

        // Check for nested projects (e.g., mod-troubleshooter/backend, mod-troubleshooter/frontend)
        const nestedProjects = await this.scanNestedProjects(subPath, entry.name);
        if (nestedProjects.length > 0) {
          subprojects.push(...nestedProjects);
          continue;
        }

        // Check for direct project at this level
        const project = await this.detectProjectAt(subPath, entry.name);
        if (project) {
          subprojects.push(project);
        }
      }
    } catch {
      // Can't read directory
    }

    return subprojects;
  }

  // Scan for nested projects within a directory (e.g., project/backend, project/frontend)
  private async scanNestedProjects(dirPath: string, parentName: string): Promise<SubProject[]> {
    const nestedProjects: SubProject[] = [];
    const ignoreDirs = new Set([
      'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
    ]);

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (ignoreDirs.has(entry.name)) continue;

        const nestedPath = path.join(dirPath, entry.name);
        const project = await this.detectProjectAt(nestedPath, `${parentName}/${entry.name}`);
        if (project) {
          nestedProjects.push(project);
        }
      }
    } catch {
      // Can't read directory
    }

    return nestedProjects;
  }

  // Detect if a directory is a project and return its info
  private async detectProjectAt(dirPath: string, relativePath: string): Promise<SubProject | null> {
    // Check for package.json (Node.js/TypeScript)
    try {
      const pkgPath = path.join(dirPath, 'package.json');
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);

      // Detect language
      let language: SubProject['language'] = 'javascript';
      try {
        await fs.access(path.join(dirPath, 'tsconfig.json'));
        language = 'typescript';
      } catch { /* not TypeScript */ }

      return {
        name: pkg.name || path.basename(relativePath),
        path: relativePath,
        language,
        framework: this.detectFramework(pkg),
        packageManager: await this.detectPackageManagerIn(dirPath),
      };
    } catch { /* not a Node project */ }

    // Check for go.mod (Go)
    try {
      const goModPath = path.join(dirPath, 'go.mod');
      const content = await fs.readFile(goModPath, 'utf-8');
      // Extract module name from go.mod
      const moduleMatch = content.match(/^module\s+(.+)$/m);
      const moduleName = moduleMatch ? moduleMatch[1].trim() : path.basename(relativePath);

      return {
        name: moduleName,
        path: relativePath,
        language: 'go',
        framework: null,
        packageManager: null,
      };
    } catch { /* not a Go project */ }

    // Check for pyproject.toml or requirements.txt (Python)
    try {
      await fs.access(path.join(dirPath, 'pyproject.toml'));
      return {
        name: path.basename(relativePath),
        path: relativePath,
        language: 'python',
        framework: null,
        packageManager: null,
      };
    } catch { /* not pyproject.toml */ }

    try {
      await fs.access(path.join(dirPath, 'requirements.txt'));
      return {
        name: path.basename(relativePath),
        path: relativePath,
        language: 'python',
        framework: null,
        packageManager: null,
      };
    } catch { /* not Python */ }

    return null;
  }

  // Detect package manager in a specific directory
  private async detectPackageManagerIn(dirPath: string): Promise<SubProject['packageManager']> {
    const checks = [
      { file: 'bun.lockb', manager: 'bun' as const },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
      { file: 'yarn.lock', manager: 'yarn' as const },
      { file: 'package-lock.json', manager: 'npm' as const },
    ];

    for (const check of checks) {
      try {
        await fs.access(path.join(dirPath, check.file));
        return check.manager;
      } catch {
        // File doesn't exist, continue
      }
    }

    // Default to npm if package.json exists
    try {
      await fs.access(path.join(dirPath, 'package.json'));
      return 'npm';
    } catch {
      return null;
    }
  }

  // Aggregate languages from subprojects
  private aggregateLanguages(subprojects: SubProject[]): ProjectScan['language'] {
    const languages = new Set(subprojects.map(s => s.language));
    if (languages.size === 0) return 'unknown';
    if (languages.size === 1) {
      const lang = languages.values().next().value;
      // Map SubProject language to ProjectScan language
      if (lang === 'typescript' || lang === 'javascript' || lang === 'go' || lang === 'python') {
        return lang;
      }
      return 'unknown';
    }
    return 'mixed';
  }

  // Aggregate frameworks from subprojects
  private aggregateFrameworks(subprojects: SubProject[]): string | null {
    const frameworks = subprojects
      .map(s => s.framework)
      .filter((f): f is string => f !== null);
    if (frameworks.length === 0) return null;
    if (frameworks.length === 1) return frameworks[0];
    return frameworks.join(', ');
  }
}
