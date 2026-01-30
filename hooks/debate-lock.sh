#!/bin/bash
# Debate Lock - PreToolUse Hook
# Debate가 진행 중일 때 코드 수정을 차단
#
# 사용법: PreToolUse 이벤트 (Edit|Write 매처)에서 자동 실행
# Exit codes:
#   0 = 허용
#   2 = 차단

set -e

DEBATE_FILE=".sisyphus/debates/active-debate.json"

# Debate 파일이 없으면 허용
if [ ! -f "$DEBATE_FILE" ]; then
  exit 0
fi

# Debate 상태 확인
PHASE=$(jq -r '.phase // ""' "$DEBATE_FILE" 2>/dev/null || echo "")

# Debate가 완료되었거나 없으면 허용
if [ -z "$PHASE" ] || [ "$PHASE" = "concluded" ]; then
  exit 0
fi

# 파일 경로 추출
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || echo "")

# .sisyphus/ 폴더는 허용 (상태 파일 업데이트)
if [[ "$FILE_PATH" == .sisyphus/* ]] || [[ "$FILE_PATH" == */.sisyphus/* ]]; then
  exit 0
fi

# Debate 진행 중 - 코드 수정 차단
cat << EOF >&2
╔═══════════════════════════════════════════════════════════════════════════╗
║  🔒 DEBATE IN PROGRESS - CODE MODIFICATION BLOCKED                        ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  A debate is currently active (phase: $PHASE)
║                                                                            ║
║  Please wait for the debate to conclude before modifying code.             ║
║  This ensures decisions are made before implementation begins.             ║
║                                                                            ║
║  Options:                                                                  ║
║  1. Wait for debate completion                                             ║
║  2. Check debate status: mcp__chronos__debate_get_state                    ║
║  3. Force conclude: mcp__chronos__debate_conclude (if stuck)               ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF

# JSON 응답
cat << EOF
{"blocked": true, "reason": "Debate 진행 중입니다 (phase: $PHASE). Debate 완료 후 수정하세요."}
EOF

exit 2
