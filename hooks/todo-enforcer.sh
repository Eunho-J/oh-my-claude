#!/bin/bash
# Todo Enforcer - Stop Hook
# 미완료 todo가 있으면 계속 실행하도록 요청
#
# 사용법: Stop 이벤트에서 자동 실행
#
# Uses Chronos MCP Server CLI for state management

set -e

INPUT=$(cat)

# TaskList에서 미완료 작업 확인
# stdin의 JSON에서 tasks 배열 파싱
INCOMPLETE=$(echo "$INPUT" | jq -r '
  if .tasks then
    [.tasks[] | select(.status != "completed" and .status != "deleted")] | length
  else
    0
  end
' 2>/dev/null || echo "0")

# 미완료 작업이 있으면 계속 실행 요청
if [ "$INCOMPLETE" -gt 0 ]; then
  cat << EOF
{"continue": true, "reason": "$INCOMPLETE task(s) remaining. Continue working on incomplete todos before stopping."}
EOF
  exit 0
fi

# Find the chronos CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHRONOS_CLI="$SCRIPT_DIR/../mcp-servers/chronos/cli.js"

# Check if CLI exists and boulder has incomplete tasks
if [ -f "$CHRONOS_CLI" ] && [ -f ".sisyphus/boulder.json" ]; then
  # Use Chronos CLI for plan progress check
  RESULT=$(node "$CHRONOS_CLI" boulder-status 2>/dev/null || echo "{}")

  IS_COMPLETE=$(echo "$RESULT" | jq -r '.progress.isComplete // true' 2>/dev/null || echo "true")
  REMAINING=$(echo "$RESULT" | jq -r '(.progress.total // 0) - (.progress.completed // 0)' 2>/dev/null || echo "0")
  PLAN_NAME=$(echo "$RESULT" | jq -r '.progress.plan_name // "plan"' 2>/dev/null || echo "plan")

  if [ "$IS_COMPLETE" != "true" ] && [ "$REMAINING" -gt 0 ]; then
    cat << EOF
{"continue": true, "reason": "Plan \"$PLAN_NAME\" has $REMAINING task(s) remaining. Continue working on incomplete todos."}
EOF
    exit 0
  fi
fi

# 모든 작업 완료
exit 0
