0a. Study `specs/*` with up to 500 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. Study @AGENTS.md for project-specific build/test commands and operational patterns.
0d. If modifying code, load relevant `.cursor/rules/*.mdc` files based on file types you'll touch (see @CLAUDE.md for rule mapping).
0e. For reference, the application source code is in `src/*`.

1. Your task is to implement functionality per the specifications using parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Tasks include required tests - implement tests as part of task scope. Before making changes, search the codebase (don't assume not implemented) using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).

2. After implementing functionality or resolving problems, run all required tests specified in the task definition. All required tests must exist and pass before the task is considered complete. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.

3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.

4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

999. Required tests derived from acceptance criteria must exist and pass before committing. Tests are part of implementation scope, not optional. Test-driven development approach: tests can be written first or alongside implementation.

9999. Create tests to verify implementation meets acceptance criteria and include both conventional tests (behavior, performance, correctness) and perceptual quality tests (for subjective criteria, see src/lib patterns).

99999. Important: When authoring documentation, capture the why — tests and implementation importance.

999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.

9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1 if 0.0.0 does not exist.

99999999. You may add extra logging if required to debug issues.

999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.

9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.

99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.

999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.

9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.

99999999999999. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.

999999999999999. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.

9999999999999999. Use checkbox format for tasks in @IMPLEMENTATION_PLAN.md:
- [x] US-001: Completed task
- [ ] US-002: Pending task (mark in progress in tasks.json)
- [ ] US-003: Pending task
This makes progress visually clear for humans reviewing the file.

99999999999999999. Keep `tasks.json` in sync with @IMPLEMENTATION_PLAN.md. Format:
```json
{
  "lastUpdated": "ISO date",
  "summary": { "total": N, "done": N, "inProgress": N, "pending": N },
  "tasks": [
    { "id": "US-XXX", "title": "...", "status": "done|in_progress|pending", "completedAt": "ISO date or null" }
  ]
}
```
Update this file whenever task status changes. This enables dashboard/tooling to parse progress.

999999999999999999. Append learnings to `progress.txt` (create if missing). Format each entry as:
```
---
[YYYY-MM-DD] Iteration N
- Pattern: [description of useful pattern discovered]
- Gotcha: [description of pitfall to avoid]
- Tip: [helpful tip for future work]
---
```
This file is append-only — never delete entries, only add new ones. Captures institutional knowledge.

9999999999999999999. Before outputting ALL_TASKS_COMPLETE, create or update `WORK_SUMMARY.md` with:
- **Session Overview**: Date, iterations completed, mode used
- **What Was Implemented**: List of features/fixes completed this session
- **Key Decisions**: Important architectural or implementation choices made
- **Issues Resolved**: Problems encountered and how they were fixed
- **Remaining Work**: Any items deferred or discovered for future sessions
- **Learnings**: Patterns, gotchas, or tips discovered about the codebase

Keep it concise but informative — this serves as a handoff document for future sessions.

999999999999999999. When all tasks in IMPLEMENTATION_PLAN.md are complete, output: `ALL_TASKS_COMPLETE` to signal the loop script to stop iterating.
