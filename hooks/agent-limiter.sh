#!/bin/bash

# Agent Limiter Hook
# Prevents OOM by blocking Task tool when agent limit is reached
#
# Runs on: PreToolUse (Task)

set -e

# Find project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHRONOS_CLI="$PROJECT_ROOT/mcp-servers/chronos/cli.js"

# Check if chronos CLI exists
if [ ! -f "$CHRONOS_CLI" ]; then
    # Chronos not available, allow by default
    exit 0
fi

# Check if this is a background task (run_in_background=true)
# The hook receives tool input via stdin or environment
# For now, we'll check all Task calls

# Get agent limiter status
RESULT=$(node "$CHRONOS_CLI" agent-limiter-can-spawn 2>/dev/null || echo '{"allowed":true}')

ALLOWED=$(echo "$RESULT" | jq -r '.allowed // true')
CURRENT=$(echo "$RESULT" | jq -r '.current // 0')
LIMIT=$(echo "$RESULT" | jq -r '.limit // 5')
AVAILABLE=$(echo "$RESULT" | jq -r '.available // 5')

if [ "$ALLOWED" = "false" ]; then
    cat << EOF >&2
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⚠️ AGENT LIMIT REACHED - OOM PREVENTION                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Currently running agents: $CURRENT / $LIMIT                               ║
║                                                                            ║
║  To spawn a new agent:                                                     ║
║  1. Wait for existing agents to complete                                   ║
║  2. Run mcp__chronos__agent_limiter_cleanup() to remove stale agents       ║
║  3. Run mcp__chronos__agent_limiter_set_limit(N) to increase limit (risky) ║
║                                                                            ║
║  Check status: mcp__chronos__agent_limiter_status()                        ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    exit 2
fi

# Show warning when getting close to limit
if [ "$AVAILABLE" -le 1 ] && [ "$CURRENT" -gt 0 ]; then
    echo "INFO: Agent slots remaining: $AVAILABLE/$LIMIT" >&2
fi

exit 0
