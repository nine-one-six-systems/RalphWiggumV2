import fs from 'fs/promises';
import path from 'path';
import type { ProjectConfig } from '../src/types';

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
  private projectPath: string;
  private config: ProjectConfig;
  private enabledAgents: string[];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.enabledAgents = [...ALL_AGENT_IDS];
    this.config = {
      projectPath,
      hasAgentsMd: false,
      hasClaudeMd: false,
      hasImplementationPlan: false,
      hasSpecs: false,
      hasCursorRules: false,
      hasLoopSh: false,
      enabledAgents: this.enabledAgents,
    };
    this.refresh();
  }

  async refresh() {
    const checks = await Promise.all([
      this.fileExists('AGENTS.md'),
      this.fileExists('CLAUDE.md'),
      this.fileExists('IMPLEMENTATION_PLAN.md'),
      this.dirExists('specs'),
      this.dirExists('.cursor/rules'),
      this.fileExists('loop.sh'),
    ]);

    // Parse enabled agents from CLAUDE.md
    this.enabledAgents = await this.parseEnabledAgents();

    this.config = {
      projectPath: this.projectPath,
      hasAgentsMd: checks[0],
      hasClaudeMd: checks[1],
      hasImplementationPlan: checks[2],
      hasSpecs: checks[3],
      hasCursorRules: checks[4],
      hasLoopSh: checks[5],
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

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
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
      const content = await this.readFile('CLAUDE.md');
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
}
