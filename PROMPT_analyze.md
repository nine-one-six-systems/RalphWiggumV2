You are analyzing an existing codebase to understand its current state and identify next steps for development.

## Your Task

1. **Explore the codebase structure**
   - Study the directory layout
   - Identify the tech stack (framework, language, database, etc.)
   - Find configuration files (package.json, tsconfig.json, etc.)

2. **Understand what's implemented**
   - Review the main application entry points
   - Identify key features that are already built
   - Note any incomplete or placeholder implementations

3. **Review existing documentation**
   - Check README.md for project context
   - Look for any existing specs, PRDs, or design docs
   - Note any TODOs, FIXMEs, or known issues in comments

4. **Assess code quality**
   - Check for test coverage (presence of test files)
   - Note linting/formatting configuration
   - Identify any obvious technical debt

5. **Generate an Implementation Plan**

Based on your analysis, create or update IMPLEMENTATION_PLAN.md with prioritized tasks. Include:

- Bug fixes and critical issues (highest priority)
- Incomplete features that need finishing
- Missing tests or documentation
- Potential improvements or refactoring
- Nice-to-have enhancements

## Output Format

Create IMPLEMENTATION_PLAN.md with the following structure:

```markdown
# Implementation Plan

## Project Summary
[Brief description of what the project is and its current state]

## Tech Stack
- Framework: [detected framework]
- Language: [detected language]
- Database: [if any]
- Testing: [test framework if any]

## Current State
[What's implemented, what's working, what's not]

## Tasks

### Critical (P0)
- [ ] [Critical bugs or blockers]

### High Priority (P1)
- [ ] [Important features or fixes]

### Medium Priority (P2)
- [ ] [Nice-to-have improvements]

### Low Priority (P3)
- [ ] [Future enhancements]

## Notes
[Any important observations about the codebase]
```

## Guidelines

- Be thorough but concise
- Focus on actionable tasks
- Prioritize based on impact and urgency
- Don't include timeline estimates (AI agents don't need them)
- Flag any potential risks or concerns
- Note dependencies between tasks

Remember: Your goal is to provide a clear picture of where the project stands and what should be done next.
