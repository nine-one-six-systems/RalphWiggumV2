import { EventEmitter } from 'events';
import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { LoopStatus, LoopMode, LogEntry } from '../src/types';

// Find bash executable on Windows
function findBashOnWindows(): string | null {
  const possiblePaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Git\\bin\\bash.exe',
    process.env.PROGRAMFILES + '\\Git\\bin\\bash.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Git\\bin\\bash.exe',
  ];
  
  for (const bashPath of possiblePaths) {
    if (bashPath && fs.existsSync(bashPath)) {
      return bashPath;
    }
  }
  return null;
}

export class LoopController extends EventEmitter {
  private projectPath: string;  // Target project to run in
  private ralphPath: string;    // RalphWiggumV2 directory (for loop.sh)
  private process: ChildProcess | null = null;
  private status: LoopStatus = {
    running: false,
    mode: null,
    iteration: 0,
    maxIterations: 0,
  };

  constructor(projectPath: string, ralphPath?: string) {
    super();
    this.projectPath = projectPath;
    this.ralphPath = ralphPath || projectPath;
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
    // Use loop.sh from Ralph's directory, not the target project
    const loopScript = path.join(this.ralphPath, 'loop.sh');

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
    if (this.ralphPath !== this.projectPath) {
      this.emitLog(`Target project: ${this.projectPath}`, 'info');
      this.emitLog(`Ralph directory: ${this.ralphPath}`, 'info');
    }

    // Determine how to run bash on this platform
    const isWindows = process.platform === 'win32';
    let bashCmd = 'bash';
    
    if (isWindows) {
      const gitBash = findBashOnWindows();
      if (gitBash) {
        bashCmd = gitBash;
        this.emitLog(`Using Git Bash: ${gitBash}`, 'info');
      } else {
        this.emitLog('Error: Git Bash not found. Please install Git for Windows to run the loop.', 'error');
        this.emitLog('Download from: https://git-scm.com/download/win', 'error');
        return;
      }
    }

    // Run in target project directory, but set RALPH_DIR so loop.sh can find its files
    this.process = spawn(bashCmd, [loopScript, ...args], {
      cwd: this.projectPath,
      env: {
        ...process.env,
        WORK_SCOPE: workScope || '',
        RALPH_DIR: this.ralphPath,  // Tell loop.sh where to find prompt files
      },
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

    const pid = this.process.pid;
    this.emitLog('Stopping loop...', 'info');

    const isWindows = process.platform === 'win32';

    if (isWindows && pid) {
      // On Windows, use taskkill to kill the process tree (includes child processes)
      // This is more reliable than signals for Git Bash processes
      exec(`taskkill /pid ${pid} /T /F`, (err: Error | null) => {
        if (err) {
          this.emitLog(`Failed to kill process tree: ${err.message}`, 'warning');
          // Fallback to regular kill
          if (this.process) {
            this.process.kill();
          }
        } else {
          this.emitLog('Process tree terminated', 'info');
        }
      });
    } else {
      // On Unix, send SIGINT for graceful shutdown
      this.process.kill('SIGINT');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process) {
          this.emitLog('Force killing loop...', 'warning');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
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
