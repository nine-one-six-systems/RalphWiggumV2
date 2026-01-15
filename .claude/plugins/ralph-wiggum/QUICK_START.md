# Ralph Wiggum Plugin - Quick Start

## Installation

The plugin is already installed at `.claude/plugins/ralph-wiggum/`. Claude Code will automatically detect and load it.

## Basic Usage

### Start a Loop

```bash
/ralph-loop "Your task description" --completion-promise "DONE" --max-iterations 20
```

**Example:**
```bash
/ralph-loop "Fix the authentication bug. All tests must pass." --completion-promise "FIXED" --max-iterations 10
```

### Cancel a Loop

```bash
/cancel-ralph
```

### Get Help

```bash
/help
```

## How It Works

1. **You run `/ralph-loop`** → Creates `.claude/ralph-loop.local.md` state file
2. **You work on the task** → Make changes, run tests, fix bugs
3. **You try to exit** → Stop hook intercepts the exit
4. **Same prompt fed back** → Loop continues automatically
5. **You see previous work** → Files and git history show your progress
6. **Loop continues** → Until completion promise or max iterations

## Completion Promise

To signal completion, output this exact format:

```
<promise>YOUR_PHRASE</promise>
```

**Important:**
- Only output when the statement is **completely true**
- Do NOT lie to exit the loop
- The promise must match exactly what you set with `--completion-promise`

## Best Practices

### 1. Always Set Max Iterations

```bash
# ✅ Good
/ralph-loop "Task" --max-iterations 20

# ❌ Bad (runs forever!)
/ralph-loop "Task"
```

### 2. Clear Completion Criteria

```bash
/ralph-loop "Build REST API. When complete: all endpoints working, tests passing, README updated. Output <promise>DONE</promise> when finished." --completion-promise "DONE" --max-iterations 30
```

### 3. Use for Iterative Tasks

**Good for:**
- Fixing bugs (run tests, see failures, iterate)
- Refactoring (make changes, verify, improve)
- Building features (implement, test, refine)

**Not good for:**
- One-shot operations
- Tasks requiring human judgment
- Unclear success criteria

## Monitoring

Check current iteration:
```bash
grep '^iteration:' .claude/ralph-loop.local.md
```

View full state:
```bash
cat .claude/ralph-loop.local.md
```

## Integration with Bash Loop

This plugin works alongside the bash-based `loop.sh`:

- **Plugin** (`/ralph-loop`) - Interactive, in-session development
- **Bash Loop** (`./loop.sh`) - Autonomous, external execution

Use whichever fits your workflow!

## Learn More

- Full documentation: [README.md](README.md)
- Original technique: https://ghuntley.com/ralph/
- Bash loop setup: See project root `README.md`
