#!/bin/bash
# Enhanced Ralph progress checker

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Ralph Progress Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Git status
echo "📝 Git Status:"
GIT_STATUS=$(git status --short 2>/dev/null)
if [ -z "$GIT_STATUS" ]; then
    echo -e "  ${GREEN}✓${NC} Working directory clean"
else
    UNCOMMITTED=$(echo "$GIT_STATUS" | wc -l | xargs)
    echo -e "  ${YELLOW}⚠${NC}  ${UNCOMMITTED} uncommitted change(s)"
    echo "$GIT_STATUS" | head -5 | sed 's/^/    /'
    if [ "$UNCOMMITTED" -gt 5 ]; then
        echo "    ... ($((UNCOMMITTED - 5)) more)"
    fi
fi
echo ""

# Recent commits
echo "📜 Recent Commits:"
COMMITS=$(git log --oneline -5 2>/dev/null)
if [ -z "$COMMITS" ]; then
    echo "  No commits yet"
else
    echo "$COMMITS" | sed 's/^/  /'
fi
echo ""

# Last commit time
LAST_COMMIT=$(git log -1 --format="%ar" 2>/dev/null)
if [ -n "$LAST_COMMIT" ]; then
    echo "⏰ Last commit: ${LAST_COMMIT}"
    echo ""
fi

# Tasks status
echo "📋 Tasks Status:"
if [ -f "IMPLEMENTATION_PLAN.md" ]; then
    TASKS=$(grep -E "^- \[[ x]\]" IMPLEMENTATION_PLAN.md 2>/dev/null)
    if [ -z "$TASKS" ]; then
        echo "  No tasks found in IMPLEMENTATION_PLAN.md"
    else
        COMPLETED=$(echo "$TASKS" | grep -c "\[x\]" || echo "0")
        TOTAL=$(echo "$TASKS" | wc -l | xargs)
        PENDING=$((TOTAL - COMPLETED))
        
        echo "  Completed: ${GREEN}${COMPLETED}${NC} / ${TOTAL}"
        echo "  Pending: ${YELLOW}${PENDING}${NC}"
        echo ""
        echo "  Recent tasks:"
        echo "$TASKS" | head -10 | sed 's/^- \[ \]/    [ ]/' | sed 's/^- \[x\]/    [x]/' | sed "s/\[x\]/${GREEN}[x]${NC}/g"
    fi
else
    echo "  IMPLEMENTATION_PLAN.md not found"
fi
echo ""

# Ralph process status
echo "🔄 Ralph Process:"
RALPH_PID=$(ps aux | grep "loop.sh" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$RALPH_PID" ]; then
    ITERATION=$(ps aux | grep "loop.sh" | grep -v grep | head -1)
    echo -e "  ${GREEN}✓${NC} Running (PID: ${RALPH_PID})"
    echo "    Command: $(echo "$ITERATION" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')"
else
    echo -e "  ${RED}✗${NC} Not running"
fi
echo ""

# Log file
echo "📄 Ralph Log:"
if [ -f "ralph.log" ]; then
    LOG_LINES=$(wc -l < ralph.log | xargs)
    echo "  ${LOG_LINES} lines in log"
    echo ""
    echo "  Last 10 lines:"
    tail -10 ralph.log | sed 's/^/    /'
else
    echo "  No log file yet"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
