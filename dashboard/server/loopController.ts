import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import type { LoopStatus, LoopMode, LogEntry } from '../src/types';

export class LoopController extends EventEmitter {
  private projectPath: string;
  private process: ChildProcess | null = null;
  private status: LoopStatus = {
    running: false,
    mode: null,
    iteration: 0,
    maxIterations: 0,
  };

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  getStatus(): LoopStatus {
    return { ...this.status };
  }

  start(options: { mode: LoopMode; maxIterations?: number; workScope?: string }) {
    if (this.process) {
      this.emitLog('Loop already running', 'warning');
      return;
    }

    const { mode, maxIterations, workScope } = options;
    const loopScript = path.join(this.projectPath, 'loop.sh');

    // Build command arguments
    const args: string[] = [];

    switch (mode) {
      case 'plan':
        args.push('plan');
        if (maxIterations) args.push(maxIterations.toString());
        break;
      case 'plan-slc':
        args.push('plan-slc');
        if (maxIterations) args.push(maxIterations.toString());
        break;
      case 'plan-work':
        args.push('plan-work');
        if (workScope) args.push(workScope);
        break;
      case 'build':
        if (maxIterations) {
          args.push(maxIterations.toString());
        }
        break;
    }

    this.emitLog(`Starting loop: ${mode}${maxIterations ? ` (max ${maxIterations} iterations)` : ''}`, 'info');

    this.process = spawn('bash', [loopScript, ...args], {
      cwd: this.projectPath,
      env: { ...process.env, WORK_SCOPE: workScope || '' },
    });

    this.status = {
      running: true,
      mode,
      iteration: 0,
      maxIterations: maxIterations || 0,
      workScope,
      startedAt: new Date(),
      pid: this.process.pid,
    };

    this.emit('status', this.status);

    // Handle stdout
    this.process.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim());
      lines.forEach((line: string) => {
        // Detect iteration markers
        const iterMatch = line.match(/LOOP\s+(\d+)/i);
        if (iterMatch) {
          this.status.iteration = parseInt(iterMatch[1], 10);
          this.emit('status', this.status);
        }

        this.emitLog(line, 'info');
      });
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim());
      lines.forEach((line: string) => {
        this.emitLog(line, 'error');
      });
    });

    // Handle process exit
    this.process.on('close', (code) => {
      this.emitLog(`Loop exited with code ${code}`, code === 0 ? 'success' : 'error');
      this.process = null;
      this.status = {
        ...this.status,
        running: false,
        pid: undefined,
      };
      this.emit('status', this.status);
    });

    this.process.on('error', (err) => {
      this.emitLog(`Loop error: ${err.message}`, 'error');
      this.process = null;
      this.status = {
        ...this.status,
        running: false,
        pid: undefined,
      };
      this.emit('status', this.status);
    });
  }

  stop() {
    if (!this.process) {
      this.emitLog('No loop running', 'warning');
      return;
    }

    this.emitLog('Stopping loop...', 'info');

    // Send SIGINT for graceful shutdown
    this.process.kill('SIGINT');

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (this.process) {
        this.emitLog('Force killing loop...', 'warning');
        this.process.kill('SIGKILL');
      }
    }, 5000);
  }

  private emitLog(content: string, type: LogEntry['type']) {
    const entry: LogEntry = {
      id: `loop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      content,
      type,
    };
    this.emit('log', entry);
  }
}
