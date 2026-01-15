# Ralph Wiggum Integration Guide

An autonomous AI-powered development loop system that uses Claude CLI to iteratively plan and execute software development tasks.

## What is Ralph Wiggum?

Ralph Wiggum is an autonomous development assistant that:

- **Plans intelligently**: Analyzes your codebase and generates detailed implementation plans
- **Executes iteratively**: Works through tasks one at a time, committing as it goes
- **Monitors in real-time**: Provides a dashboard for watching progress, logs, and git history
- **Follows your rules**: Uses project-specific coding standards and conventions

### Key Features

- Multiple planning modes (standard, SLC, work-scoped)
- Real-time monitoring dashboard with WebSocket updates
- Task tracking and git history visualization
- PRD and implementation plan generators
- Customizable coding rules and specialist agents

---

## Prerequisites

Before integrating Ralph Wiggum, ensure you have:

1. **Claude CLI** - Installed and authenticated
   ```bash
   # Verify installation
   claude --version

   # If not installed, see: https://docs.anthropic.com/claude-code/
   ```

2. **Node.js 18+** (for dashboard only)
   ```bash
   node --version  # Should be 18.x or higher
   ```

3. **Git** (recommended)
   ```bash
   git --version
   ```

---

## Quick Start

### Option A: Use the Dashboard Onboarding Wizard (Recommended)

The dashboard includes an onboarding wizard that automatically scans your project and configures Ralph:

1. **Copy Ralph Wiggum files to your project**
   ```bash
   cp -r /path/to/ralph-wiggum/{loop.sh,CLAUDE.md,AGENTS.md,PROMPT_*.md,dashboard} .
   chmod +x loop.sh
   ```

2. **Start the dashboard**
   ```bash
   cd dashboard && npm install && npm run dev
   ```

3. **Open http://localhost:5173**
   - The onboarding wizard will appear automatically
   - Click "Scan My Project" to detect your tech stack
   - Review and adjust the detected commands
   - Save the configuration

4. **Run your first loop**
   ```bash
   ./loop.sh plan  # Generate implementation plan
   ```

### Option B: Manual Setup

#### 1. Copy Core Files

Copy these files/directories to your project root:

```bash
# Required files
loop.sh
CLAUDE.md
AGENTS.md
PROMPT_plan.md
PROMPT_plan_slc.md
PROMPT_plan_work.md
PROMPT_prd.md
PROMPT_analyze.md

# Optional (for dashboard)
dashboard/

# Optional (for coding rules)
.cursor/rules/
```

#### 2. Configure AGENTS.md

Edit `AGENTS.md` with your project's build, test, and lint commands:

```markdown
## Build & Run

- Build: `npm run build`
- Run: `npm start`
- Dev server: `npm run dev`

## Validation

- Tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
```

#### 3. Make loop.sh Executable

```bash
chmod +x loop.sh
```

#### 4. Run Your First Loop

```bash
# Generate an implementation plan
./loop.sh plan

# Or start building immediately (if IMPLEMENTATION_PLAN.md exists)
./loop.sh
```

---

## Project Structure

### Core Files (Required)

| File | Purpose |
|------|---------|
| `loop.sh` | Main entry point - orchestrates Claude CLI execution |
| `CLAUDE.md` | Instructions that Claude follows during execution |
| `AGENTS.md` | Project-specific configuration (commands, tech stack) |

### Prompt Templates

| File | Purpose |
|------|---------|
| `PROMPT_plan.md` | Standard planning prompt |
| `PROMPT_plan_slc.md` | Simple, Lovable, Complete (SLC) planning |
| `PROMPT_plan_work.md` | Work-scoped planning for specific features |
| `PROMPT_prd.md` | Product Requirements Document generation |
| `PROMPT_analyze.md` | Analyze existing codebase and generate tasks |

### Optional Files

| File/Directory | Purpose |
|----------------|---------|
| `IMPLEMENTATION_PLAN.md` | Task list that Ralph executes |
| `PRD.md` | Product requirements document |
| `AUDIENCE_JTBD.md` | Target audience and jobs-to-be-done |
| `specs/` | Detailed feature specifications |
| `.cursor/rules/` | Coding standards and style guides |
| `dashboard/` | Real-time monitoring interface |

---

## Configuration Guide

### AGENTS.md

This file tells Ralph how to build, test, and lint your project. Keep it concise but complete.

```markdown
## Build & Run

- Build: `npm run build`
- Run: `npm start`
- Dev server: `npm run dev`

## Validation

Run these after implementing to get immediate feedback:

- Tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

## Operational Notes

Project-specific notes (Ralph will add learnings here):

### Codebase Patterns

- Components use functional style with hooks
- API calls go through src/services/

## Operational Learnings

- Dev server runs on port 3000
- Tests require TEST_DB_URL environment variable
```

### CLAUDE.md

This file contains instructions that Claude follows. The default version includes:

- Phase-based workflow (Orient, Load Rules, Execute)
- Rule file loading based on file types
- Commit message conventions
- Specialist agent delegation

**Customizing**: Add project-specific instructions at the top of the file:

```markdown
# Project-Specific Instructions

- Always use `pnpm` instead of `npm`
- All new components go in `src/components/ui/`
- Run `pnpm format` before committing

---

# Ralph Wiggum Instructions
[... rest of default content ...]
```

### Coding Rules (.cursor/rules/)

Place `.mdc` files in `.cursor/rules/` to define coding standards:

| Rule File | When Loaded |
|-----------|-------------|
| `1000-react-general.mdc` | Any `.tsx` file |
| `1001-react-components.mdc` | Component files |
| `1003-react-forms.mdc` | Form components |
| `1004-accessibility-wcag.mdc` | UI code |
| `1008-typescript.mdc` | Any `.ts`/`.tsx` |
| `2000-golang-backend.mdc` | Any `.go` file |

---

## Loop Modes

### Build Mode (Default)

Executes tasks from `IMPLEMENTATION_PLAN.md`:

```bash
./loop.sh           # Unlimited iterations
./loop.sh 20        # Max 20 iterations
./loop.sh build 10  # Explicit build mode, max 10 iterations
```

### Plan Mode

Generates a standard implementation plan:

```bash
./loop.sh plan      # Unlimited iterations
./loop.sh plan 5    # Max 5 iterations
```

### Plan-SLC Mode

Generates a plan using Simple, Lovable, Complete principles:

```bash
./loop.sh plan-slc
```

Reads from `AUDIENCE_JTBD.md` and `PRD.md` to understand the product vision.

### Plan-Work Mode

Scoped planning for a specific feature on a work branch:

```bash
# First, create a work branch
git checkout -b ralph/user-auth

# Then run scoped planning
./loop.sh plan-work "implement user authentication"
```

---

## Dashboard Setup

The dashboard provides real-time monitoring of Ralph's execution.

### Installation

```bash
cd dashboard
npm install
```

### Running

```bash
npm run dev
```

Opens at: http://localhost:5173

### Features

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Loop status, task progress, recent logs |
| **Generate** | Plan and PRD generators with live preview |
| **Logs** | Full log history with filtering |
| **Setup** | Project configuration and agent toggles |

### Dashboard Components

- **Loop Controls**: Start/stop the loop, select mode
- **Task List**: View current tasks and completion status
- **Context Meter**: Track iteration count
- **Git History**: Recent commits made by Ralph
- **Log Viewer**: Real-time streaming logs

### Onboarding Wizard

When you first open the dashboard on a project without a configured AGENTS.md, the onboarding wizard appears:

1. **Project Scan**: Automatically detects:
   - Package manager (npm, yarn, pnpm, bun)
   - Framework (React, Next.js, Vue, etc.)
   - Language (TypeScript, JavaScript, Python, Go)
   - Build/test/lint commands from package.json
   - Existing documentation files

2. **Configuration**: Pre-fills AGENTS.md with detected commands, which you can adjust

3. **Documentation Setup**: Shows existing docs and offers to generate PRD/Audience docs

---

## Workflow Examples

### New Project Workflow

1. **Initialize project**
   ```bash
   mkdir my-project && cd my-project
   git init
   ```

2. **Copy Ralph Wiggum files**
   ```bash
   cp -r /path/to/ralph-wiggum/{loop.sh,CLAUDE.md,AGENTS.md,PROMPT_*.md,dashboard} .
   chmod +x loop.sh
   ```

3. **Create PRD and Audience docs** (use dashboard or manually)
   - Write `PRD.md` with product vision
   - Write `AUDIENCE_JTBD.md` with target users

4. **Generate implementation plan**
   ```bash
   ./loop.sh plan-slc
   ```

5. **Review and adjust** `IMPLEMENTATION_PLAN.md`

6. **Execute the plan**
   ```bash
   ./loop.sh 50  # Run up to 50 iterations
   ```

### Existing Project Workflow

1. **Copy Ralph Wiggum files** (don't overwrite existing files)
   ```bash
   cp /path/to/ralph-wiggum/loop.sh .
   cp /path/to/ralph-wiggum/CLAUDE.md .
   cp /path/to/ralph-wiggum/PROMPT_*.md .
   cp /path/to/ralph-wiggum/AGENTS.md .  # Edit this!
   chmod +x loop.sh
   ```

2. **Configure AGENTS.md** with your existing commands
   ```bash
   # Edit AGENTS.md with your build/test/lint commands
   ```

3. **Create IMPLEMENTATION_PLAN.md** with tasks
   ```markdown
   # Implementation Plan

   ## Tasks

   - [ ] Add user authentication
   - [ ] Create dashboard page
   - [ ] Write API documentation
   ```

4. **Run Ralph**
   ```bash
   ./loop.sh
   ```

### Feature Branch Workflow

1. **Create work branch**
   ```bash
   git checkout -b ralph/feature-name
   ```

2. **Run scoped planning**
   ```bash
   ./loop.sh plan-work "description of feature"
   ```

3. **Execute the plan**
   ```bash
   ./loop.sh 20
   ```

4. **Create PR when complete**
   ```bash
   gh pr create
   ```

---

## Troubleshooting

### Claude CLI not found

```bash
# Error: claude CLI not found
# Solution: Install Claude Code CLI
# See: https://docs.anthropic.com/claude-code/
```

### Permission denied on loop.sh

```bash
# Error: permission denied: ./loop.sh
# Solution:
chmod +x loop.sh
```

### Dashboard won't connect

```bash
# If dashboard shows "Disconnected":
# 1. Ensure server is running
cd dashboard && npm run dev

# 2. Check if port 3001 is in use
lsof -i :3001

# 3. Kill any zombie processes
pkill -f "tsx watch server"
```

### Context window limits

The loop automatically handles context limits by running fresh Claude sessions each iteration. If you're hitting limits:

1. Break tasks into smaller pieces in `IMPLEMENTATION_PLAN.md`
2. Use `./loop.sh 10` to limit iterations
3. Check that `AGENTS.md` isn't too verbose

### Loop gets stuck

If Ralph seems stuck on a task:

1. Check `ralph.log` for errors
2. Review the task in `IMPLEMENTATION_PLAN.md` - is it too vague?
3. Run with fresh context: `./loop.sh 1` (single iteration)
4. Manually complete the blocking task and mark it done

---

## Advanced Features

### Specialist Agents

Ralph can delegate to specialist agents for complex work:

| Agent | Use Case |
|-------|----------|
| `react-typescript-expert` | React components, hooks, TypeScript |
| `accessibility-expert` | WCAG compliance, ARIA, keyboard nav |
| `qol-ux-expert` | Loading states, toasts, forms UX |

Configure in `.cursor/rules/` or reference in `CLAUDE.md`.

### Custom Rule Files

Create `.mdc` files in `.cursor/rules/` with the naming convention:
- `1xxx-*.mdc` - Frontend rules
- `2xxx-*.mdc` - Backend rules

Example rule file structure:
```markdown
# Rule Name

## When to Apply
Apply when editing files matching: `src/components/**/*.tsx`

## Standards
- Use functional components
- Always include PropTypes or TypeScript interfaces
...
```

### Iteration Limits

Control iteration count to manage costs and execution time:

```bash
./loop.sh 5       # Quick task, max 5 iterations
./loop.sh 50      # Larger feature, more headroom
./loop.sh 0       # Unlimited (default, runs until ALL_TASKS_COMPLETE)
```

### Completion Signal

Ralph signals completion by outputting `ALL_TASKS_COMPLETE` when all tasks in `IMPLEMENTATION_PLAN.md` are done. The loop script detects this and stops.

---

## Files Reference

```
your-project/
├── loop.sh                    # Main loop script (required)
├── CLAUDE.md                  # Claude instructions (required)
├── AGENTS.md                  # Project config (required)
├── PROMPT_plan.md             # Standard planning prompt
├── PROMPT_plan_slc.md         # SLC planning prompt
├── PROMPT_plan_work.md        # Work-scoped planning prompt
├── PROMPT_prd.md              # PRD generation prompt
├── IMPLEMENTATION_PLAN.md     # Task list (generated/manual)
├── PRD.md                     # Product requirements (optional)
├── AUDIENCE_JTBD.md           # Target audience (optional)
├── ralph.log                  # Execution log (generated)
├── specs/                     # Feature specifications
│   └── feature-name.md
├── .cursor/rules/             # Coding standards
│   ├── 1000-react-general.mdc
│   └── 1008-typescript.mdc
└── dashboard/                 # Monitoring interface
    ├── package.json
    ├── src/
    └── server/
```

---

## Getting Help

- Review `ralph.log` for execution details
- Check `IMPLEMENTATION_PLAN.md` for task status
- Use the dashboard's Logs tab for real-time monitoring
- Adjust task granularity if Ralph gets stuck on large tasks
