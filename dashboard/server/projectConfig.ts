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
}
