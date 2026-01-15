import { EventEmitter } from 'events';
import { spawn, ChildProcess, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

export type PlanMode = 'plan' | 'plan-slc' | 'plan-work';

interface PlanGeneratorStatus {
  generating: boolean;
  mode: PlanMode | null;
  startedAt: Date | null;
}

const PROMPT_FILES: Record<PlanMode, string> = {
  plan: 'PROMPT_plan.md',
  'plan-slc': 'PROMPT_plan_slc.md',
  'plan-work': 'PROMPT_plan_work.md',
};

export class PlanGenerator extends EventEmitter {
  private projectPath: string;
  private ralphPath: string;
  private process: ChildProcess | null = null;
  private status: PlanGeneratorStatus = {
    generating: false,
    mode: null,
    startedAt: null,
  };
  private accumulatedOutput: string = '';
  private accumulatedPlan: string = '';

  constructor(projectPath: string, ralphPath?: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
  }

  getStatus(): PlanGeneratorStatus {
    return { ...this.status };
  }

  async generatePlan(options: {
    goal: string;
    mode: PlanMode;
    workScope?: string;
    prdContext?: string;
  }): Promise<void> {
    if (this.status.generating) {
      throw new Error('Plan generation already in progress');
    }

    this.status = {
      generating: true,
      mode: options.mode,
      startedAt: new Date(),
    };
    this.accumulatedOutput = '';
    this.accumulatedPlan = '';
    this.emit('status', this.status);

    try {
      // Read the base prompt template
      const promptFile = PROMPT_FILES[options.mode];
      let basePrompt: string;

      try {
        // Try ralphPath first (where prompt files are located)
        basePrompt = await fs.readFile(
          path.join(this.ralphPath, promptFile),
          'utf-8'
        );
      } catch {
        try {
          // Fallback to projectPath
          basePrompt = await fs.readFile(
            path.join(this.projectPath, promptFile),
            'utf-8'
          );
        } catch {
          // Use default prompt if file doesn't exist
          basePrompt = this.getDefaultPrompt(options.mode);
        }
      }

      // Build the full goal with optional PRD context
      let fullGoal = options.goal;
      if (options.prdContext) {
        fullGoal = `${options.prdContext}\n\n## User Goal\n${options.goal}`;
      }

      // Replace the goal placeholder or append the goal
      let fullPrompt: string;
      if (basePrompt.includes('[YOUR PROJECT GOAL HERE]')) {
        fullPrompt = basePrompt.replace('[YOUR PROJECT GOAL HERE]', fullGoal);
      } else {
        fullPrompt = `${basePrompt}\n\nULTIMATE GOAL: ${fullGoal}`;
      }

      // For plan-work mode, also include the work scope
      if (options.mode === 'plan-work' && options.workScope) {
        fullPrompt = fullPrompt.replace('${WORK_SCOPE}', options.workScope);
      }

      // Build CLI arguments - make --model conditional for cross-platform compatibility
      const claudeArgs = [
        '-p',
        '--output-format=stream-json',
        '--verbose',
        '--dangerously-skip-permissions'
      ];

      // Add --model flag on Windows (confirmed working) or if explicitly enabled
      // macOS may have older CLI versions that don't support this flag
      const isWindows = process.platform === 'win32';
      if (isWindows || process.env.CLAUDE_MODEL_FLAG === 'true') {
        claudeArgs.push('--model', 'opus');
      }

      // Spawn Claude CLI
      // IMPORTANT: cwd is set to projectPath (parent directory) so Claude runs in the correct location
      // and any files it creates/writes will be in the parent directory, not ralph-wiggum-v2
      console.log(`Starting plan generation in directory: ${this.projectPath}`);
      this.process = spawn('claude', claudeArgs, {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,  // Required for Windows to find claude.cmd
      });

      // Write prompt to stdin
      this.process.stdin?.write(fullPrompt);
      this.process.stdin?.end();

      // Parse streaming JSON output
      if (this.process.stdout) {
        const rl = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          this.handleOutputLine(line);
        });
      }

      // Handle stderr
      this.process.stderr?.on('data', (data) => {
        const text = data.toString();
        this.emit('error', text);
      });

      // Handle process close
      this.process.on('close', (code) => {
        this.status = {
          generating: false,
          mode: null,
          startedAt: null,
        };
        this.process = null;

        if (code === 0) {
          this.emit('complete', {
            plan: this.accumulatedPlan,
            output: this.accumulatedOutput,
          });
        } else {
          this.emit('error', `Process exited with code ${code}`);
        }
        this.emit('status', this.status);
      });

      // Handle process error
      this.process.on('error', (err) => {
        this.status = {
          generating: false,
          mode: null,
          startedAt: null,
        };
        this.process = null;
        this.emit('error', err.message);
        this.emit('status', this.status);
      });

    } catch (err) {
      this.status = {
        generating: false,
        mode: null,
        startedAt: null,
      };
      this.emit('error', err instanceof Error ? err.message : 'Unknown error');
      this.emit('status', this.status);
    }
  }

  private handleOutputLine(line: string): void {
    try {
      const json = JSON.parse(line);

      // Handle different message types from stream-json format
      if (json.type === 'text' || json.type === 'content_block_delta') {
        const text = json.text || json.delta?.text || '';
        if (text) {
          this.accumulatedOutput += text;
          this.accumulatedPlan += text;
          this.emit('output', text);
        }
      } else if (json.type === 'message_start' || json.type === 'content_block_start') {
        // Message starting, could emit status update
      } else if (json.type === 'message_stop' || json.type === 'content_block_stop') {
        // Message complete
      } else if (json.type === 'assistant') {
        // Assistant response - extract text content
        if (json.message?.content) {
          for (const block of json.message.content) {
            if (block.type === 'text') {
              this.accumulatedOutput += block.text;
              this.accumulatedPlan += block.text;
              this.emit('output', block.text);
            }
          }
        }
      }
    } catch {
      // Non-JSON line - might be verbose output or logs
      if (line.trim()) {
        this.accumulatedOutput += line + '\n';
        this.emit('log', line);
      }
    }
  }

  cancel(): void {
    if (this.process) {
      const pid = this.process.pid;
      const isWindows = process.platform === 'win32';

      if (isWindows && pid) {
        // On Windows, use taskkill to kill the process tree
        exec(`taskkill /pid ${pid} /T /F`, () => {
          // Ignore errors, process may already be dead
        });
      } else {
        this.process.kill('SIGTERM');
      }

      this.status = {
        generating: false,
        mode: null,
        startedAt: null,
      };
      this.emit('cancelled');
      this.emit('status', this.status);
    }
  }

  private getDefaultPrompt(mode: PlanMode): string {
    if (mode === 'plan-slc') {
      return `Study the codebase and create an implementation plan using SLC (Simple, Lovable, Complete) methodology.
Focus on delivering value to users incrementally.

ULTIMATE GOAL: [YOUR PROJECT GOAL HERE]

Create a prioritized list of tasks in IMPLEMENTATION_PLAN.md format.`;
    }

    if (mode === 'plan-work') {
      return `Study the codebase and create a focused implementation plan for the following scope:
Work Scope: \${WORK_SCOPE}

ULTIMATE GOAL: [YOUR PROJECT GOAL HERE]

Create a prioritized list of tasks in IMPLEMENTATION_PLAN.md format.`;
    }

    // Default plan mode
    return `0a. Study \`specs/*\` to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study \`src/lib/*\` to understand shared utilities & components.
0d. For reference, the application source code is in \`src/*\`.

1. Study @IMPLEMENTATION_PLAN.md (if present) and compare it against \`specs/*\`. Create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented.

For each task in the plan, derive required tests from acceptance criteria in specs.

IMPORTANT: Plan only. Do NOT implement anything.

ULTIMATE GOAL: [YOUR PROJECT GOAL HERE]`;
  }
}
