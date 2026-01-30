#!/bin/bash
# Ralph Loop - Stop Hook
# 완료 프로미스 감지 또는 max iteration까지 계속 실행
#
# 사용법: Stop 이벤트에서 자동 실행
# 상태 파일: .sisyphus/ralph-state.json
#
# Uses Chronos MCP Server CLI for state management

set -e

# Consume stdin (hook protocol)
cat > /dev/null

# Find the chronos CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHRONOS_CLI="$SCRIPT_DIR/../mcp-servers/chronos/cli.js"

# Check if CLI exists
if [ ! -f "$CHRONOS_CLI" ]; then
  exit 0
fi

# Check if Ralph Loop is active
STATE_FILE=".sisyphus/ralph-state.json"
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Use Node.js CLI for state management
node "$CHRONOS_CLI" ralph-continue

exit 0
