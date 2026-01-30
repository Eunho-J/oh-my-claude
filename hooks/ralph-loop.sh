#!/bin/bash
# Ralph Loop - Stop Hook
# 완료 프로미스 감지 또는 max iteration까지 계속 실행
#
# 사용법: Stop 이벤트에서 자동 실행
# 상태 파일: .sisyphus/ralph-state.json

set -e

INPUT=$(cat)

# .sisyphus 디렉토리 확인 및 생성
SISYPHUS_DIR=".sisyphus"
STATE_FILE="$SISYPHUS_DIR/ralph-state.json"

if [ ! -d "$SISYPHUS_DIR" ]; then
  mkdir -p "$SISYPHUS_DIR"
fi

# 상태 파일이 없으면 종료
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# 상태 읽기
ACTIVE=$(jq -r '.active // false' "$STATE_FILE" 2>/dev/null || echo "false")
ITERATION=$(jq -r '.iteration // 0' "$STATE_FILE" 2>/dev/null || echo "0")
MAX_ITER=$(jq -r '.max_iterations // 50' "$STATE_FILE" 2>/dev/null || echo "50")
PROMISE=$(jq -r '.completion_promise // ""' "$STATE_FILE" 2>/dev/null || echo "")

# 비활성 상태면 종료
if [ "$ACTIVE" != "true" ]; then
  exit 0
fi

# 트랜스크립트에서 완료 프로미스 검색
# Claude 프로젝트 디렉토리에서 최근 세션 확인
CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"
if [ -n "$PROMISE" ] && [ -d "$CLAUDE_PROJECTS_DIR" ]; then
  # 최근 세션 파일에서 프로미스 검색
  PROMISE_FOUND=$(find "$CLAUDE_PROJECTS_DIR" -name "*.jsonl" -mmin -5 -exec grep -l "<promise>$PROMISE</promise>" {} \; 2>/dev/null | head -1 || true)

  if [ -n "$PROMISE_FOUND" ]; then
    # 완료: 상태 클리어
    echo '{"active": false, "completed_at": "'$(date -Iseconds)'"}' > "$STATE_FILE"
    exit 0
  fi
fi

# iteration 체크
if [ "$ITERATION" -ge "$MAX_ITER" ]; then
  # 최대 iteration 도달: 상태 클리어 및 경고
  echo '{"active": false, "reason": "max_iterations_reached"}' > "$STATE_FILE"
  echo '{"decision": "stop", "reason": "Maximum iterations ('$MAX_ITER') reached. Manual intervention required."}' >&2
  exit 0
fi

# 계속 실행 필요
NEW_ITER=$((ITERATION + 1))

# 상태 업데이트
jq ".iteration = $NEW_ITER | .last_continue = \"$(date -Iseconds)\"" "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

# 계속 실행 메시지 출력
cat << EOF
{"decision": "continue", "reason": "Continuing iteration $NEW_ITER/$MAX_ITER. Resume work on incomplete tasks."}
EOF

exit 0
