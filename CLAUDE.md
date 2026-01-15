# Ralph Wiggum Instructions

## Quick Reference

```bash
# Planning modes
./loop.sh plan              # Standard planning
./loop.sh plan-slc          # SLC-oriented planning
./loop.sh plan-work "desc"  # Work-scoped planning

# Building mode
./loop.sh                  # Build mode, unlimited
./loop.sh 20               # Build mode, max 20 iterations
```

---

## Phase 0: Orient

Before starting any task:

1. Study `AGENTS.md` for project-specific build/test commands
2. Study `IMPLEMENTATION_PLAN.md` for current tasks and priorities
3. Study `specs/` directory for detailed feature requirements (if present)
4. Study `AUDIENCE_JTBD.md` if using SLC workflow (if present)

---

## Phase 1: Load Relevant Rules

Before implementing, load the appropriate rules based on what you'll modify:

| If touching... | Study this rule file |
|----------------|---------------------|
| Any `backend/**/*.go` | `.cursor/rules/2000-golang-backend.mdc` |
| Any `frontend/src/**/*.{ts,tsx}` | `.cursor/rules/1000-react-general.mdc` |
| Any `src/**/*.{ts,tsx}` | `.cursor/rules/1000-react-general.mdc` |
| `frontend/src/components/**/*.tsx` or `src/components/**/*.tsx` | `.cursor/rules/1001-react-components.mdc` |
| `frontend/src/hooks/**/*.ts` or `src/hooks/**/*.ts` | `.cursor/rules/1002-react-hooks.mdc` |
| `*Form*.tsx` or `src/components/forms/*` | `.cursor/rules/1003-react-forms.mdc` |
| Any UI code (`*.tsx`) | `.cursor/rules/1004-accessibility-wcag.mdc` |
| Any UI code (`*.tsx`) | `.cursor/rules/1005-qol-ux.mdc` |
| `*.test.{ts,tsx}` | `.cursor/rules/1006-testing.mdc` |
| `*.tsx` or `*.css` | `.cursor/rules/1007-tailwindcss.mdc` |
| Any `*.ts` or `*.tsx` | `.cursor/rules/1008-typescript.mdc` |
| `frontend/src/services/**/*.ts` or `src/services/**/*.ts` | `.cursor/rules/1009-services.mdc` |
| `frontend/src/store/**/*.ts` or `src/store/**/*.ts` | `.cursor/rules/1010-state-management.mdc` |
| Any `**/*.go`, `go.mod`, `go.sum` | `.cursor/rules/2000-golang-backend.mdc` |

**Load multiple rules when applicable.** For example, creating a form component requires: 1001 (components) + 1003 (forms) + 1004 (accessibility) + 1007 (tailwind).

---

## Phase 1.5: Delegate to Specialist Agents

For complex React/TypeScript work, delegate to specialist agents for deeper review:

| Task Type | Delegate To |
|-----------|-------------|
| React architecture, hooks, state, TypeScript types | `react-typescript-expert` |
| WCAG compliance, ARIA, screen readers, keyboard nav | `accessibility-expert` |
| Loading states, toasts, forms UX, dark mode, animations | `qol-ux-expert` |

### When to Use Agents

**Delegate to `react-typescript-expert` when:**
- Writing new React components, hooks, or TypeScript modules
- Refactoring frontend code or optimizing performance
- Debugging React state or TypeScript errors
- Reviewing component architecture

**Delegate to `accessibility-expert` when:**
- Auditing for WCAG 2.2 compliance
- Implementing ARIA patterns (modals, tabs, menus)
- Adding keyboard navigation or focus management
- Reviewing color contrast or screen reader support

**Delegate to `qol-ux-expert` when:**
- Implementing loading/empty/error states
- Adding toast notifications or confirmation dialogs
- Building form validation UX
- Implementing dark mode or animations
- Improving responsive/mobile patterns

### Agent Invocation

```
Use the react-typescript-expert agent to review this component
Use the accessibility-expert agent to audit this for WCAG AA compliance
Use the qol-ux-expert agent to add proper loading states
```

### Full Review (All Three)

For comprehensive frontend work:
```
Review this component with react-typescript-expert for code quality, 
accessibility-expert for WCAG compliance, and qol-ux-expert for UX polish
```

---

## Phase 2: Execute

1. Pick the highest-priority incomplete task from `IMPLEMENTATION_PLAN.md`
2. Search the codebase first—**do not assume functionality is missing**
3. Implement that ONE task completely following the loaded rules
4. No placeholders, no stubs, no "TODO" comments—implement fully
5. Run validation (see `AGENTS.md` for commands):
   - Tests: `[your test command]`
   - Typecheck: `[your typecheck command]`
   - Lint: `[your lint command]`
6. If tests pass: `git add -A && git commit -m "feat: [task summary]"`
7. Update `IMPLEMENTATION_PLAN.md`: mark complete, note discoveries
8. If you learned operational patterns or codebase patterns:
   - Add to `AGENTS.md` under "Codebase Patterns" or "Operational Learnings"
   - Keep it brief—AGENTS.md should stay under 60 lines

---

## Critical Rules

- **One task per iteration, then exit**
- **Tests must pass before committing**
- **Follow the loaded rule files exactly**—they define project standards
- **Follow the spec files**—they define feature requirements
- If you find bugs unrelated to your task, document in `IMPLEMENTATION_PLAN.md`
- Keep `IMPLEMENTATION_PLAN.md` current—future iterations depend on it
- Keep `AGENTS.md` operational only—no progress notes, no changelogs

---

## Completion Signal

**When all tasks in IMPLEMENTATION_PLAN.md are complete, output: `ALL_TASKS_COMPLETE`**

This signals the loop script to stop iterating.

---

## Workflow Summary

1. Load relevant `.cursor/rules/*.mdc` rules
2. Delegate to specialist agents for complex frontend work (optional but recommended)
3. Search codebase first—don't assume functionality is missing
4. Implement fully—no placeholders, no TODOs
5. Run validation commands before committing
6. Commit with descriptive message: `feat:`, `fix:`, `refactor:`
7. Update `IMPLEMENTATION_PLAN.md` and `AGENTS.md` as needed
