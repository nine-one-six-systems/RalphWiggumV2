import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import simpleGit from 'simple-git';
import type { Task, TasksState, GitStatus, GitCommit, LogEntry } from '../src/types';

export class FileWatcher extends EventEmitter {
  private projectPath: string;
  private watcher: chokidar.FSWatcher | null = null;
  private logWatcher: chokidar.FSWatcher | null = null;
  private tasks: TasksState = { tasks: [], completed: 0, total: 0 };
  private gitStatus: GitStatus = { branch: 'main', uncommittedCount: 0, commits: [] };
  private lastLogPosition = 0;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  start() {
    // Watch IMPLEMENTATION_PLAN.md
    const planPath = path.join(this.projectPath, 'IMPLEMENTATION_PLAN.md');
    this.watcher = chokidar.watch(planPath, {
      persistent: true,
      ignoreInitial: false,
    });

    this.watcher.on('add', () => this.parseTasks());
    this.watcher.on('change', () => this.parseTasks());

    // Watch ralph.log
    const logPath = path.join(this.projectPath, 'ralph.log');
    this.logWatcher = chokidar.watch(logPath, {
      persistent: true,
      ignoreInitial: false,
    });

    this.logWatcher.on('add', () => this.tailLog());
    this.logWatcher.on('change', () => this.tailLog());

    // Initial git status and periodic refresh
    this.updateGitStatus();
    setInterval(() => this.updateGitStatus(), 10000);
  }

  stop() {
    this.watcher?.close();
    this.logWatcher?.close();
  }

  getTasks(): TasksState {
    return this.tasks;
  }

  getGitStatus(): GitStatus {
    return this.gitStatus;
  }

  private async parseTasks() {
    try {
      const planPath = path.join(this.projectPath, 'IMPLEMENTATION_PLAN.md');
      const content = await fs.readFile(planPath, 'utf-8');

      const tasks: Task[] = [];
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Match checkbox patterns: - [ ] or - [x]
        const match = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
        if (match) {
          tasks.push({
            id: `task-${index}`,
            content: match[2].trim(),
            completed: match[1].toLowerCase() === 'x',
          });
        }
      });

      const completed = tasks.filter((t) => t.completed).length;

      this.tasks = {
        tasks,
        completed,
        total: tasks.length,
        lastUpdated: new Date(),
      };

      this.emit('tasks', this.tasks);
    } catch {
      // File doesn't exist yet, that's OK
    }
  }

  private async tailLog() {
    try {
      const logPath = path.join(this.projectPath, 'ralph.log');
      const stat = await fs.stat(logPath);

      if (stat.size > this.lastLogPosition) {
        const handle = await fs.open(logPath, 'r');
        const buffer = Buffer.alloc(stat.size - this.lastLogPosition);
        await handle.read(buffer, 0, buffer.length, this.lastLogPosition);
        await handle.close();

        const newContent = buffer.toString('utf-8');
        const lines = newContent.split('\n').filter((line) => line.trim());

        lines.forEach((line) => {
          const entry: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            content: line,
            type: this.classifyLogLine(line),
          };
          this.emit('log', entry);
        });

        this.lastLogPosition = stat.size;
      }
    } catch {
      // Log file doesn't exist yet
      this.lastLogPosition = 0;
    }
  }

  private classifyLogLine(line: string): LogEntry['type'] {
    const lower = line.toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('exception')) {
      return 'error';
    }
    if (lower.includes('warning') || lower.includes('warn')) {
      return 'warning';
    }
    if (lower.includes('success') || lower.includes('complete') || lower.includes('pass')) {
      return 'success';
    }
    return 'info';
  }

  private async updateGitStatus() {
    try {
      const git = simpleGit(this.projectPath);

      // Get current branch
      const branchSummary = await git.branch();
      const branch = branchSummary.current;

      // Get status
      const status = await git.status();
      const uncommittedCount = status.files.length;

      // Get recent commits
      const log = await git.log({ maxCount: 10 });
      const commits: GitCommit[] = log.all.map((commit) => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date),
      }));

      // Get remote URL
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin');
      const remoteUrl = origin?.refs?.fetch || origin?.refs?.push;

      // Parse GitHub URL to get repo name
      let repoName: string | undefined;
      if (remoteUrl) {
        // Handle SSH (git@github.com:user/repo.git) and HTTPS (https://github.com/user/repo.git)
        const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
        repoName = match?.[1];
      }

      this.gitStatus = {
        branch,
        uncommittedCount,
        commits,
        lastUpdated: new Date(),
        remoteUrl,
        repoName,
      };

      this.emit('git', this.gitStatus);
    } catch {
      // Git not initialized or error, keep default status
    }
  }
}
