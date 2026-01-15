#!/bin/bash
# Auto-refresh Ralph monitoring script
# Usage: ./tools/watch-ralph.sh [refresh-interval-seconds]

INTERVAL=${1:-5}  # Default 5 seconds

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Trap Ctrl+C
trap 'echo ""; echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; echo "Monitoring stopped"; exit 0' INT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👀 Watching Ralph Progress"
echo "Refresh interval: ${INTERVAL} seconds"
echo "Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

while true; do
    clear
    
    # Header with timestamp
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 Ralph Progress Monitor${NC} - $(date '+%H:%M:%S')"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Tasks summary
    if [ -f "IMPLEMENTATION_PLAN.md" ]; then
        TASKS=$(grep -E "^- \[[ x]\]" IMPLEMENTATION_PLAN.md 2>/dev/null)
        if [ -n "$TASKS" ]; then
            COMPLETED=$(echo "$TASKS" | grep -c "\[x\]" || echo "0")
            TOTAL=$(echo "$TASKS" | wc -l | xargs)
            PENDING=$((TOTAL - COMPLETED))
            PERCENT=$((COMPLETED * 100 / TOTAL))
            
            echo -e "📋 Progress: ${GREEN}${COMPLETED}${NC}/${TOTAL} tasks (${PERCENT}%)"
            echo -e "   Pending: ${YELLOW}${PENDING}${NC}"
            echo ""
        fi
    fi
    
    # Git status
    echo "📝 Git Status:"
    GIT_STATUS=$(git status --short 2>/dev/null)
    if [ -z "$GIT_STATUS" ]; then
        echo -e "   ${GREEN}✓${NC} Working directory clean"
    else
        UNCOMMITTED=$(echo "$GIT_STATUS" | wc -l | xargs)
        echo -e "   ${YELLOW}⚠${NC}  ${UNCOMMITTED} uncommitted change(s)"
    fi
    
    # Recent commits
    LAST_COMMIT=$(git log -1 --format="%h - %s (%ar)" 2>/dev/null)
    if [ -n "$LAST_COMMIT" ]; then
        echo "   Last: ${LAST_COMMIT}"
    fi
    echo ""
    
    # Recent commits list
    echo "📜 Recent Commits:"
    COMMITS=$(git log --oneline -5 2>/dev/null)
    if [ -z "$COMMITS" ]; then
        echo "   No commits yet"
    else
        echo "$COMMITS" | head -5 | sed 's/^/   /'
    fi
    echo ""
    
    # Ralph process
    echo "🔄 Ralph Status:"
    RALPH_PID=$(ps aux | grep "loop.sh" | grep -v grep | awk '{print $2}' | head -1)
    if [ -n "$RALPH_PID" ]; then
        RALPH_CMD=$(ps aux | grep "loop.sh" | grep -v grep | head -1 | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        echo -e "   ${GREEN}✓${NC} Running (PID: ${RALPH_PID})"
        # Try to extract iteration number from command
        if echo "$RALPH_CMD" | grep -q "loop.sh"; then
            ITER=$(echo "$RALPH_CMD" | grep -oE '[0-9]+' | head -1)
            if [ -n "$ITER" ]; then
                echo "   Iteration: ${ITER}"
            fi
        fi
    else
        echo -e "   ${RED}✗${NC} Not running"
    fi
    echo ""
    
    # Recent log entries
    if [ -f "ralph.log" ]; then
        LOG_LINES=$(wc -l < ralph.log | xargs)
        echo "📄 Log: ${LOG_LINES} lines"
        echo "   Last 5 lines:"
        tail -5 ralph.log 2>/dev/null | sed 's/^/   /' | tail -5
    else
        echo "📄 Log: No log file yet"
    fi
    echo ""
    
    # Footer
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Refreshing in ${INTERVAL} seconds... (Ctrl+C to stop)"
    
    sleep "$INTERVAL"
done
