import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export interface ProjectScan {
  projectName: string;
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
  hasRalphConfig: {
    agentsMd: boolean;
    claudeMd: boolean;
    implementationPlan: boolean;
    loopSh: boolean;
    specsDir: boolean;
    cursorRules: boolean;
  };
  structure: Array<{
    path: string;
    type: 'dir' | 'file';
  }>;
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
      hasRalphConfig,
      structure,
      language,
    ] = await Promise.all([
      this.detectPackageManager(),
      this.readPackageJson(),
      this.findExistingDocs(),
      this.checkRalphConfig(),
      this.scanStructure(),
      this.detectLanguage(),
    ]);

    const framework = this.detectFramework(packageJson);
    const detectedCommands = this.extractCommands(packageJson, packageManager);
    const projectName = packageJson?.name || path.basename(this.projectPath);

    return {
      projectName,
      packageManager,
      framework,
      language,
      detectedCommands,
      existingDocs,
      hasRalphConfig,
      structure,
    };
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
}
