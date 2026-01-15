import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ProjectConfig, AgentInfo, CursorRuleInfo } from '../src/types';

const CONFIG_FILES = {
  'AGENTS.md': 'AGENTS.md',
  'CLAUDE.md': 'CLAUDE.md',
  'IMPLEMENTATION_PLAN.md': 'IMPLEMENTATION_PLAN.md',
  'PROMPT_build.md': 'PROMPT_build.md',
  'PROMPT_plan.md': 'PROMPT_plan.md',
  'PROMPT_plan_slc.md': 'PROMPT_plan_slc.md',
  'PROMPT_plan_work.md': 'PROMPT_plan_work.md',
  'AUDIENCE_JTBD.md': 'AUDIENCE_JTBD.md',
};

const ALL_AGENT_IDS = ['react-typescript-expert', 'accessibility-expert', 'qol-ux-expert'];

export class ProjectConfigManager {
  private projectPath: string;  // Target project to analyze
  private ralphPath: string;    // RalphWiggumV2's directory (for templates/prompts)
  private config: ProjectConfig;
  private enabledAgents: string[];

  constructor(projectPath: string, ralphPath?: string) {
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
    this.enabledAgents = [...ALL_AGENT_IDS];
    this.config = {
      projectPath,
      hasAgentsMd: false,
      hasClaudeMd: false,
      hasImplementationPlan: false,
      hasPRD: false,
      hasAudienceJTBD: false,
      hasSpecs: false,
      hasCursorRules: false,
      hasLoopSh: false,
      enabledAgents: this.enabledAgents,
    };
    this.refresh();
  }

  // Get the path where Ralph config files should be stored/read
  // In embedded mode, these go in the target project
  getRalphConfigPath(): string {
    return this.projectPath;
  }

  // Get the path to RalphWiggumV2's own directory (for templates)
  getRalphTemplatePath(): string {
    return this.ralphPath;
  }

  // Get the target project path being analyzed
  getTargetProjectPath(): string {
    return this.projectPath;
  }

  async refresh() {
    const checks = await Promise.all([
      this.fileExists('AGENTS.md'),
      this.fileExists('IMPLEMENTATION_PLAN.md'),
      this.fileExists('PRD.md'),
      this.fileExists('AUDIENCE_JTBD.md'),
      this.dirExists('specs'),
      this.dirExists('.cursor/rules'),
      this.fileExists('loop.sh'),
    ]);

    // Check for CLAUDE.md in both possible locations
    const hasClaudeMdRoot = await this.fileExists('CLAUDE.md');
    const hasClaudeMdDir = await this.fileExists('.claude/CLAUDE.md');
    const hasClaudeMd = hasClaudeMdRoot || hasClaudeMdDir;

    // Parse enabled agents from CLAUDE.md
    this.enabledAgents = await this.parseEnabledAgents();

    this.config = {
      projectPath: this.projectPath,
      hasAgentsMd: checks[0],
      hasClaudeMd,
      hasImplementationPlan: checks[1],
      hasPRD: checks[2],
      hasAudienceJTBD: checks[3],
      hasSpecs: checks[4],
      hasCursorRules: checks[5],
      hasLoopSh: checks[6],
      enabledAgents: this.enabledAgents,
    };

    return this.config;
  }

  getConfig(): ProjectConfig {
    return { ...this.config };
  }

  async readFile(filename: string): Promise<string> {
    // Validate filename to prevent path traversal
    if (filename.includes('..') || path.isAbsolute(filename)) {
      throw new Error('Invalid filename');
    }

    const filePath = path.join(this.projectPath, filename);
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filename: string, content: string): Promise<void> {
    // Validate filename to prevent path traversal
    if (filename.includes('..') || path.isAbsolute(filename)) {
      throw new Error('Invalid filename');
    }

    const filePath = path.join(this.projectPath, filename);
    console.log(`Writing ${filename} to: ${filePath}`);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Successfully wrote ${filename} to ${filePath}`);
    await this.refresh();
  }

  async listSpecs(): Promise<string[]> {
    try {
      const specsDir = path.join(this.projectPath, 'specs');
      const files = await fs.readdir(specsDir);
      return files.filter((f) => f.endsWith('.md'));
    } catch {
      return [];
    }
  }

  async listCursorRules(): Promise<string[]> {
    try {
      const rulesDir = path.join(this.projectPath, '.cursor', 'rules');
      const files = await fs.readdir(rulesDir);
      return files.filter((f) => f.endsWith('.mdc'));
    } catch {
      return [];
    }
  }

  private async fileExists(filename: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectPath, filename));
      return true;
    } catch {
      return false;
    }
  }

  private async dirExists(dirname: string): Promise<boolean> {
    try {
      const stat = await fs.stat(path.join(this.projectPath, dirname));
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  // Parse CLAUDE.md to determine which agents are enabled
  private async parseEnabledAgents(): Promise<string[]> {
    try {
      const content = await this.readClaudeMd();
      const enabled: string[] = [];

      for (const agentId of ALL_AGENT_IDS) {
        // An agent is enabled if its ID appears in the file without being wrapped in DISABLED comment
        const disabledPattern = new RegExp(`<!-- DISABLED: ${agentId}[\\s\\S]*?-->`, 'g');
        const enabledPattern = new RegExp(`\`${agentId}\``, 'g');

        // Check if agent appears in the file (not disabled)
        const contentWithoutDisabled = content.replace(disabledPattern, '');
        if (enabledPattern.test(contentWithoutDisabled)) {
          enabled.push(agentId);
        }
      }

      return enabled;
    } catch {
      // If CLAUDE.md doesn't exist, return all agents as enabled by default
      return [...ALL_AGENT_IDS];
    }
  }

  // Read CLAUDE.md from either possible location
  private async readClaudeMd(): Promise<string> {
    // Try .claude/CLAUDE.md first (newer location)
    try {
      return await fs.readFile(path.join(this.projectPath, '.claude', 'CLAUDE.md'), 'utf-8');
    } catch {
      // Fall back to root CLAUDE.md
      return await fs.readFile(path.join(this.projectPath, 'CLAUDE.md'), 'utf-8');
    }
  }

  // Get CLAUDE.md path (whichever exists)
  private async getClaudeMdPath(): Promise<string | null> {
    const dirPath = path.join(this.projectPath, '.claude', 'CLAUDE.md');
    const rootPath = path.join(this.projectPath, 'CLAUDE.md');

    try {
      await fs.access(dirPath);
      return dirPath;
    } catch {
      try {
        await fs.access(rootPath);
        return rootPath;
      } catch {
        return null;
      }
    }
  }

  getEnabledAgents(): string[] {
    return [...this.enabledAgents];
  }

  async toggleAgent(agentId: string, enabled: boolean): Promise<string[]> {
    if (!ALL_AGENT_IDS.includes(agentId)) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    try {
      let content = await this.readFile('CLAUDE.md');

      if (enabled) {
        // Remove DISABLED comments for this agent
        const disabledPattern = new RegExp(
          `<!-- DISABLED: ${agentId}\\n([\\s\\S]*?)-->\\n?`,
          'g'
        );
        content = content.replace(disabledPattern, '$1');
      } else {
        // Wrap agent sections in DISABLED comments
        content = this.disableAgentInContent(content, agentId);
      }

      await this.writeFile('CLAUDE.md', content);
      return this.enabledAgents;
    } catch (err) {
      console.error('Error toggling agent:', err);
      throw err;
    }
  }

  private disableAgentInContent(content: string, agentId: string): string {
    // Pattern to match table row for this agent
    const tableRowPattern = new RegExp(
      `(\\| [^|]+ \\| \`${agentId}\` \\|)`,
      'g'
    );

    // Pattern to match "Delegate to X when:" section
    const delegatePattern = new RegExp(
      `(\\*\\*Delegate to \`${agentId}\` when:\\*\\*\\n(?:- [^\\n]+\\n)+)`,
      'g'
    );

    // Wrap table row in comment
    content = content.replace(tableRowPattern, `<!-- DISABLED: ${agentId}\n$1\n-->`);

    // Wrap delegate section in comment
    content = content.replace(delegatePattern, `<!-- DISABLED: ${agentId}\n$1-->\n`);

    return content;
  }

  // List all available agents from global (~/.claude/agents/) and project (.claude/agents/)
  async listAvailableAgents(): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = [];

    // Global agents directory
    const globalAgentsDir = path.join(os.homedir(), '.claude', 'agents');
    // Project agents directory
    const projectAgentsDir = path.join(this.projectPath, '.claude', 'agents');

    // Parse agent file to extract name and description from YAML frontmatter
    const parseAgentFile = async (filePath: string, source: 'global' | 'project'): Promise<AgentInfo | null> => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const filename = path.basename(filePath, '.md');

        // Parse YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
          return null;
        }

        const frontmatter = frontmatterMatch[1];

        // Extract name and description
        const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
        const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

        const id = nameMatch ? nameMatch[1].trim() : filename;
        const description = descMatch ? descMatch[1].trim() : '';

        // Check if agent is enabled (appears in CLAUDE.md)
        const enabled = this.enabledAgents.includes(id);

        return {
          id,
          name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description,
          source,
          enabled,
          filePath,
        };
      } catch {
        return null;
      }
    };

    // Scan global agents
    try {
      const globalFiles = await fs.readdir(globalAgentsDir);
      for (const file of globalFiles) {
        if (file.endsWith('.md')) {
          const agent = await parseAgentFile(path.join(globalAgentsDir, file), 'global');
          if (agent) {
            agents.push(agent);
          }
        }
      }
    } catch {
      // Global agents directory doesn't exist
    }

    // Scan project agents
    try {
      const projectFiles = await fs.readdir(projectAgentsDir);
      for (const file of projectFiles) {
        if (file.endsWith('.md')) {
          const agent = await parseAgentFile(path.join(projectAgentsDir, file), 'project');
          if (agent) {
            // Don't add duplicates (project overrides global)
            const existingIndex = agents.findIndex(a => a.id === agent.id);
            if (existingIndex >= 0) {
              agents[existingIndex] = agent;
            } else {
              agents.push(agent);
            }
          }
        }
      }
    } catch {
      // Project agents directory doesn't exist
    }

    return agents;
  }

  // List cursor rules with detailed info from frontmatter
  async listCursorRulesDetailed(): Promise<CursorRuleInfo[]> {
    const rules: CursorRuleInfo[] = [];
    const rulesDir = path.join(this.projectPath, '.cursor', 'rules');

    try {
      const files = await fs.readdir(rulesDir);

      for (const file of files) {
        // Include both .mdc (enabled) and .mdc.disabled (disabled) files
        const isDisabled = file.endsWith('.mdc.disabled');
        const isMdc = file.endsWith('.mdc') || isDisabled;

        if (!isMdc) continue;

        const filePath = path.join(rulesDir, file);

        try {
          const content = await fs.readFile(filePath, 'utf-8');

          // Parse MDC frontmatter
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

          let description = '';
          let globs: string[] = [];

          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];

            // Extract description
            const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
            if (descMatch) {
              description = descMatch[1].trim();
            }

            // Extract globs (can be array or single value)
            const globsMatch = frontmatter.match(/^globs:\s*\[([^\]]+)\]/m);
            if (globsMatch) {
              globs = globsMatch[1]
                .split(',')
                .map(g => g.trim().replace(/['"]/g, ''));
            }
          }

          // Get the base filename without .disabled extension
          const baseFile = isDisabled ? file.replace('.disabled', '') : file;
          const id = baseFile.replace('.mdc', '');

          rules.push({
            id,
            name: baseFile,
            description,
            globs,
            enabled: !isDisabled,
            filePath,
          });
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Rules directory doesn't exist
    }

    // Sort by filename
    return rules.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Toggle cursor rule by renaming file (.mdc ↔ .mdc.disabled)
  async toggleCursorRule(ruleId: string, enabled: boolean): Promise<CursorRuleInfo[]> {
    const rulesDir = path.join(this.projectPath, '.cursor', 'rules');

    const enabledPath = path.join(rulesDir, `${ruleId}.mdc`);
    const disabledPath = path.join(rulesDir, `${ruleId}.mdc.disabled`);

    try {
      if (enabled) {
        // Enable: rename .mdc.disabled to .mdc
        await fs.rename(disabledPath, enabledPath);
      } else {
        // Disable: rename .mdc to .mdc.disabled
        await fs.rename(enabledPath, disabledPath);
      }
    } catch (err) {
      console.error('Error toggling cursor rule:', err);
      throw err;
    }

    return this.listCursorRulesDetailed();
  }

  // List CLAUDE.md files in parent project and Ralph directory
  async listClaudeMdFiles(): Promise<ClaudeMdFile[]> {
    const files: ClaudeMdFile[] = [];

    // Helper to get file info
    const getFileInfo = async (filePath: string, location: string): Promise<ClaudeMdFile | null> => {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;
        return {
          path: filePath,
          location,
          exists: true,
          lineCount: lines,
        };
      } catch {
        return {
          path: filePath,
          location,
          exists: false,
          lineCount: 0,
        };
      }
    };

    // Check parent project's CLAUDE.md locations
    const parentClaudeDir = path.join(this.projectPath, '.claude', 'CLAUDE.md');
    const parentClaudeRoot = path.join(this.projectPath, 'CLAUDE.md');

    const parentDirInfo = await getFileInfo(parentClaudeDir, 'parent (.claude/CLAUDE.md)');
    if (parentDirInfo) files.push(parentDirInfo);

    const parentRootInfo = await getFileInfo(parentClaudeRoot, 'parent (CLAUDE.md)');
    if (parentRootInfo) files.push(parentRootInfo);

    // Check Ralph's own CLAUDE.md
    const ralphClaudeRoot = path.join(this.ralphPath, 'CLAUDE.md');
    const ralphInfo = await getFileInfo(ralphClaudeRoot, 'ralph (CLAUDE.md)');
    if (ralphInfo) files.push(ralphInfo);

    return files;
  }

  // Read a specific CLAUDE.md file by path
  async readClaudeMdFile(filePath: string): Promise<string> {
    // Security: only allow reading from known locations
    const allowedPaths = [
      path.join(this.projectPath, '.claude', 'CLAUDE.md'),
      path.join(this.projectPath, 'CLAUDE.md'),
      path.join(this.ralphPath, 'CLAUDE.md'),
    ];

    const normalizedPath = path.normalize(filePath);
    if (!allowedPaths.includes(normalizedPath)) {
      throw new Error('Invalid CLAUDE.md path');
    }

    return await fs.readFile(normalizedPath, 'utf-8');
  }

  // Apply Ralph's CLAUDE.md to the parent project
  async applyRalphClaudeMd(): Promise<void> {
    const ralphClaudePath = path.join(this.ralphPath, 'CLAUDE.md');
    const targetPath = path.join(this.projectPath, '.claude', 'CLAUDE.md');

    // Read Ralph's CLAUDE.md
    const content = await fs.readFile(ralphClaudePath, 'utf-8');

    // Ensure .claude directory exists
    await fs.mkdir(path.join(this.projectPath, '.claude'), { recursive: true });

    // Write to parent project
    await fs.writeFile(targetPath, content, 'utf-8');

    // Refresh config
    await this.refresh();
  }
}

// Type for CLAUDE.md file info
export interface ClaudeMdFile {
  path: string;
  location: string;
  exists: boolean;
  lineCount: number;
}
