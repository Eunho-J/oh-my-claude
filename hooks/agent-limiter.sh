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
║  현재 실행 중인 에이전트: $CURRENT / $LIMIT                                   ║
║                                                                            ║
║  새 에이전트를 생성하려면:                                                   ║
║  1. 기존 에이전트가 완료될 때까지 대기                                        ║
║  2. mcp__chronos__agent_limiter_cleanup() 으로 stale 에이전트 정리          ║
║  3. mcp__chronos__agent_limiter_set_limit(N) 으로 제한 증가 (주의)          ║
║                                                                            ║
║  현재 에이전트 확인: mcp__chronos__agent_limiter_status()                   ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    exit 2
fi

# Show warning when getting close to limit
if [ "$AVAILABLE" -le 1 ] && [ "$CURRENT" -gt 0 ]; then
    echo "INFO: Agent slots remaining: $AVAILABLE/$LIMIT" >&2
fi

exit 0
