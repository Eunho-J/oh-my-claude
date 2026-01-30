#!/bin/bash
# Todo Enforcer - Stop Hook
# 미완료 todo가 있으면 계속 실행하도록 요청
#
# 사용법: Stop 이벤트에서 자동 실행

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

# .sisyphus/boulder.json에서 현재 작업 상태 확인
BOULDER_FILE=".sisyphus/boulder.json"
if [ -f "$BOULDER_FILE" ]; then
  BOULDER_STATUS=$(jq -r '.status // "idle"' "$BOULDER_FILE" 2>/dev/null || echo "idle")
  BOULDER_TASKS=$(jq -r '.pending_tasks // 0' "$BOULDER_FILE" 2>/dev/null || echo "0")

  if [ "$BOULDER_STATUS" = "active" ] && [ "$BOULDER_TASKS" -gt 0 ]; then
    INCOMPLETE=$((INCOMPLETE + BOULDER_TASKS))
  fi
fi

# 미완료 작업이 있으면 계속 실행 요청
if [ "$INCOMPLETE" -gt 0 ]; then
  cat << EOF
{"decision": "continue", "reason": "$INCOMPLETE task(s) remaining. Continue working on incomplete todos before stopping."}
EOF
  exit 0
fi

# 모든 작업 완료
exit 0
