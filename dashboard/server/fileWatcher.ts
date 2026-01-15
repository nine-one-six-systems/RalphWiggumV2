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
  private prdWatcher: chokidar.FSWatcher | null = null;
  private audienceWatcher: chokidar.FSWatcher | null = null;
  private progressWatcher: chokidar.FSWatcher | null = null;
  private tasksJsonWatcher: chokidar.FSWatcher | null = null;
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

    // Watch PRD.md
    const prdPath = path.join(this.projectPath, 'PRD.md');
    this.prdWatcher = chokidar.watch(prdPath, {
      persistent: true,
      ignoreInitial: false,
    });

    this.prdWatcher.on('add', () => this.emit('config:refresh'));
    this.prdWatcher.on('change', () => this.emit('config:refresh'));

    // Watch AUDIENCE_JTBD.md
    const audiencePath = path.join(this.projectPath, 'AUDIENCE_JTBD.md');
    this.audienceWatcher = chokidar.watch(audiencePath, {
      persistent: true,
      ignoreInitial: false,
    });

    this.audienceWatcher.on('add', () => this.emit('config:refresh'));
    this.audienceWatcher.on('change', () => this.emit('config:refresh'));

    // Watch progress.txt for learnings
    const progressPath = path.join(this.projectPath, 'progress.txt');
    this.progressWatcher = chokidar.watch(progressPath, {
      persistent: true,
      ignoreInitial: false,
    });

    this.progressWatcher.on('add', () => this.emitProgress());
    this.progressWatcher.on('change', () => this.emitProgress());

    // Watch tasks.json for structured task status
    const tasksJsonPath = path.join(this.projectPath, 'tasks.json');
    this.tasksJsonWatcher = chokidar.watch(tasksJsonPath, {
      persistent: true,
      ignoreInitial: false,
    });

    this.tasksJsonWatcher.on('add', () => this.emitTasksJson());
    this.tasksJsonWatcher.on('change', () => this.emitTasksJson());

    // Initial git status and periodic refresh
    this.updateGitStatus();
    setInterval(() => this.updateGitStatus(), 10000);
  }

  stop() {
    this.watcher?.close();
    this.logWatcher?.close();
    this.prdWatcher?.close();
    this.audienceWatcher?.close();
    this.progressWatcher?.close();
    this.tasksJsonWatcher?.close();
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
      const seenUserStories = new Set<string>();

      lines.forEach((line, index) => {
        // Pattern 1: Markdown checkboxes - [ ] or - [x]
        const checkboxMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
        if (checkboxMatch) {
          tasks.push({
            id: `task-${index}`,
            content: checkboxMatch[2].trim(),
            completed: checkboxMatch[1].toLowerCase() === 'x',
          });
          return;
        }

        // Pattern 2: User Stories (US-XXX format)
        // Matches: "US-035", "| US-035 |", "- US-035:", etc.
        const usMatch = line.match(/US-(\d+)/);
        if (usMatch) {
          const usId = usMatch[1];
          // Avoid duplicates (same US mentioned multiple times)
          if (seenUserStories.has(usId)) return;
          seenUserStories.add(usId);

          // Check for completion markers
          const isComplete = /✅|DONE|COMPLETE|completed/i.test(line);

          // Extract description: everything after "US-XXX" up to status marker or end
          let description = line
            .replace(/^[|\s-]*/, '') // Remove leading pipes, spaces, dashes
            .replace(/US-\d+[:\s|]*/i, '') // Remove the US-XXX part
            .replace(/[|].*$/, '') // Remove everything after pipe (table cell)
            .replace(/✅|⬜|🔲|DONE|TODO|COMPLETE|PENDING/gi, '') // Remove status markers
            .trim();

          // If description is too short, use a generic one
          if (description.length < 3) {
            description = `User Story ${usId}`;
          }

          tasks.push({
            id: `us-${usId}`,
            content: `US-${usId}: ${description}`,
            completed: isComplete,
          });
          return;
        }

        // Pattern 3: Numbered checkboxes - 1. [ ] or 1. [x]
        const numberedMatch = line.match(/^\d+\.\s*\[([ xX])\]\s*(.+)$/);
        if (numberedMatch) {
          tasks.push({
            id: `task-${index}`,
            content: numberedMatch[2].trim(),
            completed: numberedMatch[1].toLowerCase() === 'x',
          });
          return;
        }

        // Pattern 4: Emoji status markers at start of line
        const emojiMatch = line.match(/^[-*]\s*(✅|⬜|🔲)\s*(.+)$/);
        if (emojiMatch) {
          tasks.push({
            id: `task-${index}`,
            content: emojiMatch[2].trim(),
            completed: emojiMatch[1] === '✅',
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

  private async emitProgress() {
    try {
      const progressPath = path.join(this.projectPath, 'progress.txt');
      const content = await fs.readFile(progressPath, 'utf-8');
      this.emit('progress', { content, lastUpdated: new Date() });
    } catch {
      // File doesn't exist yet, that's OK
    }
  }

  private async emitTasksJson() {
    try {
      const tasksJsonPath = path.join(this.projectPath, 'tasks.json');
      const content = await fs.readFile(tasksJsonPath, 'utf-8');
      const tasksData = JSON.parse(content);
      this.emit('tasks:json', tasksData);
    } catch {
      // File doesn't exist or invalid JSON, that's OK
    }
  }
}
