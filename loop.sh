#!/bin/bash
set -euo pipefail

# Usage:
#   ./loop.sh [build] [max_iterations]       # Build mode on current branch
#   ./loop.sh plan [max_iterations]          # Standard planning mode
#   ./loop.sh plan-slc [max_iterations]      # SLC-oriented planning mode
#   ./loop.sh plan-work "work description"   # Work-scoped planning on current branch
# Examples:
#   ./loop.sh                               # Build mode, unlimited
#   ./loop.sh 20                            # Build mode, max 20 iterations
#   ./loop.sh plan 5                        # Standard planning, max 5 iterations
#   ./loop.sh plan-slc                      # SLC planning, unlimited
#   ./loop.sh plan-work "user auth"         # Scoped planning for work branch

# Support running from a different directory (embedded mode)
# RALPH_DIR points to RalphWiggumV2's directory for prompt files
# When not set, defaults to the script's own directory
RALPH_DIR="${RALPH_DIR:-$(dirname "$0")}"

# Parse arguments
MODE="build"
PROMPT_FILE="PROMPT_build.md"
MAX_ITERATIONS=0
WORK_SCOPE=""

if [ "$1" = "plan" ]; then
    # Standard planning mode
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "plan-slc" ]; then
    # SLC-oriented planning mode
    MODE="plan-slc"
    PROMPT_FILE="PROMPT_plan_slc.md"
    MAX_ITERATIONS=${2:-0}
elif [ "$1" = "plan-work" ]; then
    # Work-scoped planning mode
    if [ -z "${2:-}" ]; then
        echo "Error: plan-work requires a work description"
        echo "Usage: ./loop.sh plan-work \"description of the work\""
        exit 1
    fi
    MODE="plan-work"
    WORK_SCOPE="$2"
    PROMPT_FILE="PROMPT_plan_work.md"
    MAX_ITERATIONS=${3:-5}  # Default 5 for work planning
elif [[ "${1:-}" =~ ^[0-9]+$ ]]; then
    # Build mode with max iterations
    MAX_ITERATIONS=$1
elif [ "${1:-}" = "build" ]; then
    # Explicit build mode
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=${2:-0}
else
    # Build mode, unlimited (no arguments or invalid input)
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

# Validate branch for plan-work mode
if [ "$MODE" = "plan-work" ]; then
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
        echo "Error: plan-work should be run on a work branch, not main/master"
        echo "Create a work branch first: git checkout -b ralph/your-work"
        exit 1
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Mode:    plan-work"
    echo "Branch:  $CURRENT_BRANCH"
    echo "Work:    $WORK_SCOPE"
    echo "Prompt:  $PROMPT_FILE"
    echo "Plan:    Will create scoped IMPLEMENTATION_PLAN.md"
    [ "$MAX_ITERATIONS" -gt 0 ] && echo "Max:     $MAX_ITERATIONS iterations"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Warn about uncommitted changes to IMPLEMENTATION_PLAN.md
    if [ -f "IMPLEMENTATION_PLAN.md" ] && ! git diff --quiet IMPLEMENTATION_PLAN.md 2>/dev/null; then
        echo "Warning: IMPLEMENTATION_PLAN.md has uncommitted changes that will be overwritten"
        read -p "Continue? [y/N] " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi

    # Export work description for PROMPT_plan_work.md
    export WORK_SCOPE="$WORK_SCOPE"
else
    # Normal plan/build mode
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Mode:   $MODE"
    echo "Branch: $CURRENT_BRANCH"
    echo "Prompt: $PROMPT_FILE"
    echo "Plan:   IMPLEMENTATION_PLAN.md"
    [ $MAX_ITERATIONS -gt 0 ] && echo "Max:    $MAX_ITERATIONS iterations"
    # Show embedded mode info if running from different directory
    if [ "$RALPH_DIR" != "$(pwd)" ] && [ "$RALPH_DIR" != "." ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Embedded mode:"
        echo "  Target: $(pwd)"
        echo "  Ralph:  $RALPH_DIR"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# Build full path to prompt file using RALPH_DIR
PROMPT_FILE_PATH="$RALPH_DIR/$PROMPT_FILE"

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE_PATH" ]; then
    echo "Error: $PROMPT_FILE_PATH not found"
    exit 1
fi

# Verify claude CLI is available
if ! command -v claude &> /dev/null; then
    echo "Error: claude CLI not found. Install Claude Code first."
    exit 1
fi

# Detect if --model flag is supported (Windows/MSYS or explicitly enabled)
# macOS may have older CLI versions that don't support this flag
MODEL_FLAG=""
if [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]] || [[ "$OSTYPE" == "mingw"* ]] || [[ "${CLAUDE_MODEL_FLAG:-}" == "true" ]]; then
    MODEL_FLAG="--model opus"
fi

# Main loop
while true; do
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        echo "Reached max iterations: $MAX_ITERATIONS"

        if [ "$MODE" = "plan-work" ]; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Scoped plan created: $WORK_SCOPE"
            echo "To build, run:"
            echo "  ./loop.sh 20"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        fi
        break
    fi

    # Run Ralph iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Structured output for logging/monitoring
    # --model opus: Primary agent uses Opus for complex reasoning (task selection, prioritization)
    #               Can use 'sonnet' in build mode for speed if plan is clear and tasks well-defined
    # --verbose: Detailed execution logging
    OUTPUT_LOG="ralph.log"

    # For plan-work mode, substitute ${WORK_SCOPE} in prompt before piping
    if [ "$MODE" = "plan-work" ]; then
        if command -v envsubst &> /dev/null; then
            envsubst < "$PROMPT_FILE_PATH" | claude -p \
                --dangerously-skip-permissions \
                --output-format=stream-json \
                $MODEL_FLAG \
                --verbose \
                2>&1 | tee -a "$OUTPUT_LOG"
        else
            # Fallback: use sed if envsubst not available
            sed "s|\${WORK_SCOPE}|$WORK_SCOPE|g" "$PROMPT_FILE_PATH" | claude -p \
                --dangerously-skip-permissions \
                --output-format=stream-json \
                $MODEL_FLAG \
                --verbose \
                2>&1 | tee -a "$OUTPUT_LOG"
        fi
    else
        cat "$PROMPT_FILE_PATH" | claude -p \
            --dangerously-skip-permissions \
            --output-format=stream-json \
            $MODEL_FLAG \
            --verbose \
            2>&1 | tee -a "$OUTPUT_LOG"
    fi

    # Check for completion signal
    if grep -q "ALL_TASKS_COMPLETE" "$OUTPUT_LOG" 2>/dev/null; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Implementation complete!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        break
    fi

    # Push to current branch
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        git push origin "$CURRENT_BRANCH" 2>/dev/null || {
            echo "Failed to push. Creating remote branch..."
            git push -u origin "$CURRENT_BRANCH" 2>/dev/null || true
        }
    fi

    ITERATION=$((ITERATION + 1))
    echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done

if [ $ITERATION -eq $MAX_ITERATIONS ] && [ $MAX_ITERATIONS -gt 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  Reached max iterations: $MAX_ITERATIONS"
    echo "Check IMPLEMENTATION_PLAN.md for status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
elif [ $ITERATION -gt 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Completed after $ITERATION iterations"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
