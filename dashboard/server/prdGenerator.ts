import { EventEmitter } from 'events';
import { spawn, ChildProcess, exec } from 'child_process';
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
  contextDocs?: string[];  // Array of relative paths to docs for context
  docsOnly?: boolean;      // If true, generate PRD from docs only
}

export class PRDGenerator extends EventEmitter {
  private projectPath: string;
  private ralphPath: string;
  private process: ChildProcess | null = null;
  private status: PRDGeneratorStatus = {
    generating: false,
    startedAt: null,
  };
  private accumulatedOutput: string = '';
  private stderrOutput: string = '';

  constructor(projectPath: string, ralphPath?: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
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
    this.stderrOutput = '';
    this.emit('status', this.status);

    try {
      // Read the prompt template
      let basePrompt: string;

      try {
        // Try ralphPath first (where prompt files are located)
        basePrompt = await fs.readFile(
          path.join(this.ralphPath, 'PROMPT_prd.md'),
          'utf-8'
        );
      } catch {
        try {
          // Fallback to projectPath
          basePrompt = await fs.readFile(
            path.join(this.projectPath, 'PROMPT_prd.md'),
            'utf-8'
          );
        } catch {
          // Use default prompt if file doesn't exist
          basePrompt = this.getDefaultPrompt();
        }
      }

      // Replace placeholders with form values
      const capabilitiesList = options.keyCapabilities
        .map((cap, i) => `${i + 1}. ${cap}`)
        .join('\n');

      // Build context section from selected docs
      let contextSection = '';
      if (options.contextDocs && options.contextDocs.length > 0) {
        contextSection = '\n\n## Existing Documentation Context\n\nThe following existing documentation provides context for this project:\n\n';
        for (const docPath of options.contextDocs) {
          try {
            const fullPath = path.join(this.projectPath, docPath);
            const content = await fs.readFile(fullPath, 'utf-8');
            // Truncate very large files to avoid prompt bloat
            const truncatedContent = content.length > 10000
              ? content.substring(0, 10000) + '\n\n[... truncated ...]'
              : content;
            contextSection += `### ${docPath}\n\`\`\`markdown\n${truncatedContent}\n\`\`\`\n\n`;
          } catch (err) {
            // Skip files that can't be read
            this.emit('log', `Warning: Could not read context doc: ${docPath}`);
          }
        }
      }

      let fullPrompt: string;

      // Use docs-only prompt if docsOnly mode is enabled
      if (options.docsOnly && options.contextDocs && options.contextDocs.length > 0) {
        fullPrompt = this.getDocsOnlyPrompt(contextSection);
      } else {
        fullPrompt = basePrompt
          .replace('${PRODUCT_NAME}', options.productName)
          .replace('${PROBLEM_STATEMENT}', options.problemStatement)
          .replace('${TARGET_AUDIENCE}', options.targetAudience)
          .replace('${KEY_CAPABILITIES}', capabilitiesList)
          .replace('${CONTEXT_DOCS}', contextSection);
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

      // Log command details for debugging
      this.emit('log', `Executing: claude ${claudeArgs.join(' ')}`);
      this.emit('log', `Working directory: ${this.projectPath}`);
      this.emit('log', `Prompt size: ${fullPrompt.length} characters`);
      if (options.docsOnly) {
        this.emit('log', `Mode: docs-only with ${options.contextDocs?.length || 0} context documents`);
      }

      // Spawn Claude CLI
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

      // Handle stderr - accumulate for final error message
      this.process.stderr?.on('data', (data) => {
        const text = data.toString();
        this.stderrOutput += text;
        this.emit('log', `[stderr] ${text}`);
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
          // Include stderr details in the error message for better debugging
          const errorDetails = this.stderrOutput.trim();
          let errorMessage: string;

          if (errorDetails) {
            errorMessage = `Process exited with code ${code}\n\nError details:\n${errorDetails}`;
          } else if (this.accumulatedOutput.trim()) {
            // Sometimes errors appear in stdout
            errorMessage = `Process exited with code ${code}\n\nOutput received:\n${this.accumulatedOutput.substring(0, 500)}${this.accumulatedOutput.length > 500 ? '...' : ''}`;
          } else {
            errorMessage = `Process exited with code ${code}\n\nNo error details available. Please check:\n• Claude CLI is installed and working (run: claude --version)\n• You are authenticated (run: claude)\n• The --dangerously-skip-permissions flag is supported`;
          }

          this.emit('error', errorMessage);
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
\${CONTEXT_DOCS}
---

Generate two complete markdown documents based on the inputs above. If existing documentation context is provided, use it to inform and enhance the PRD with relevant details, architecture decisions, and existing patterns.

NOTE: Do NOT include timeline, budget, or deadline constraints - not relevant for AI agent implementation.

## Output Format

===PRD_START===
[Full PRD.md content]
===PRD_END===

===AUDIENCE_START===
[Full AUDIENCE_JTBD.md content]
===AUDIENCE_END===`;
  }

  private getDocsOnlyPrompt(contextSection: string): string {
    return `You are a product requirements document generator for AI-agent-driven development projects.

## Task

Analyze the provided documentation and generate comprehensive PRD and Audience documents.

**IMPORTANT**: Extract and infer the following from the documentation:
- Product name (or suggest one based on the project's purpose)
- Problem statement (what problem the project solves)
- Target audience (who will use this)
- Key capabilities and features

${contextSection}

---

Based on your analysis of the documentation above, generate two complete markdown documents:

1. **PRD.md** - A comprehensive Product Requirements Document including:
   - Product overview and vision
   - Problem statement (inferred from docs)
   - Goals and objectives
   - Scope and capabilities
   - Technical requirements
   - Success criteria

2. **AUDIENCE_JTBD.md** - Target audience analysis with Jobs-to-be-Done framework:
   - Primary user personas
   - User needs and pain points
   - Jobs users are trying to accomplish
   - Expected outcomes

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
