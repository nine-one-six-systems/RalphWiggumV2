import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

interface PRDGeneratorStatus {
  generating: boolean;
  startedAt: Date | null;
}

interface PRDGeneratorOptions {
  productName: string;
  problemStatement: string;
  targetAudience: string;
  keyCapabilities: string[];
}

export class PRDGenerator extends EventEmitter {
  private projectPath: string;
  private process: ChildProcess | null = null;
  private status: PRDGeneratorStatus = {
    generating: false,
    startedAt: null,
  };
  private accumulatedOutput: string = '';

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  getStatus(): PRDGeneratorStatus {
    return { ...this.status };
  }

  async generatePRD(options: PRDGeneratorOptions): Promise<void> {
    if (this.status.generating) {
      throw new Error('PRD generation already in progress');
    }

    this.status = {
      generating: true,
      startedAt: new Date(),
    };
    this.accumulatedOutput = '';
    this.emit('status', this.status);

    try {
      // Read the prompt template
      let basePrompt: string;

      try {
        basePrompt = await fs.readFile(
          path.join(this.projectPath, 'PROMPT_prd.md'),
          'utf-8'
        );
      } catch {
        // Use default prompt if file doesn't exist
        basePrompt = this.getDefaultPrompt();
      }

      // Replace placeholders with form values
      const capabilitiesList = options.keyCapabilities
        .map((cap, i) => `${i + 1}. ${cap}`)
        .join('\n');

      let fullPrompt = basePrompt
        .replace('${PRODUCT_NAME}', options.productName)
        .replace('${PROBLEM_STATEMENT}', options.problemStatement)
        .replace('${TARGET_AUDIENCE}', options.targetAudience)
        .replace('${KEY_CAPABILITIES}', capabilitiesList);

      // Spawn Claude CLI
      this.process = spawn('claude', [
        '-p',
        '--output-format=stream-json',
        '--model', 'opus',
        '--verbose',
        '--dangerously-skip-permissions'
      ], {
        cwd: this.projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
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
          startedAt: null,
        };
        this.process = null;

        if (code === 0) {
          // Parse the accumulated output to extract PRD and Audience documents
          const parsed = this.parseDocuments(this.accumulatedOutput);
          this.emit('complete', parsed);
        } else {
          this.emit('error', `Process exited with code ${code}`);
        }
        this.emit('status', this.status);
      });

      // Handle process error
      this.process.on('error', (err) => {
        this.status = {
          generating: false,
          startedAt: null,
        };
        this.process = null;
        this.emit('error', err.message);
        this.emit('status', this.status);
      });

    } catch (err) {
      this.status = {
        generating: false,
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
          this.emit('output', text);
        }
      } else if (json.type === 'assistant') {
        // Assistant response - extract text content
        if (json.message?.content) {
          for (const block of json.message.content) {
            if (block.type === 'text') {
              this.accumulatedOutput += block.text;
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

  private parseDocuments(output: string): { prd: string; audience: string } {
    // Extract PRD content
    const prdMatch = output.match(/===PRD_START===\s*([\s\S]*?)\s*===PRD_END===/);
    const prd = prdMatch ? prdMatch[1].trim() : output;

    // Extract Audience content
    const audienceMatch = output.match(/===AUDIENCE_START===\s*([\s\S]*?)\s*===AUDIENCE_END===/);
    const audience = audienceMatch ? audienceMatch[1].trim() : '';

    return { prd, audience };
  }

  cancel(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.status = {
        generating: false,
        startedAt: null,
      };
      this.emit('cancelled');
      this.emit('status', this.status);
    }
  }

  private getDefaultPrompt(): string {
    return `You are a product requirements document generator for AI-agent-driven development projects.

## Product Information

- **Product Name**: \${PRODUCT_NAME}
- **Problem Statement**: \${PROBLEM_STATEMENT}
- **Target Audience**: \${TARGET_AUDIENCE}
- **Key Capabilities**:
\${KEY_CAPABILITIES}

---

Generate two complete markdown documents based on the inputs above.

NOTE: Do NOT include timeline, budget, or deadline constraints - not relevant for AI agent implementation.

## Output Format

===PRD_START===
[Full PRD.md content]
===PRD_END===

===AUDIENCE_START===
[Full AUDIENCE_JTBD.md content]
===AUDIENCE_END===`;
  }
}
