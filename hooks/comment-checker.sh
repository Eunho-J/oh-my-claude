#!/bin/bash
# Comment Checker - PostToolUse Hook
# Edit/Write 후 불필요한 주석 감지
#
# 사용법: PostToolUse 이벤트 (Edit|Write 매처)에서 자동 실행

set -e

INPUT=$(cat)

# 수정된 파일 경로 추출
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null)

# 파일 경로가 없으면 종료
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  exit 0
fi

# 파일이 존재하지 않으면 종료
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# 파일 확장자 확인 (코드 파일만 검사)
EXT="${FILE_PATH##*.}"
case "$EXT" in
  ts|tsx|js|jsx|py|go|rs|java|cpp|c|h|hpp)
    ;;
  *)
    # 코드 파일이 아니면 종료
    exit 0
    ;;
esac

# 불필요한 주석 패턴 정의
# - 자명한 설명 주석
# - 제거된 코드 표시
# - 빈 TODO/FIXME
SLOP_PATTERNS=(
  "// This function"
  "// This method"
  "// This class"
  "// This variable"
  "// Initialize"
  "// Set the"
  "// Get the"
  "// Return"
  "// Loop through"
  "// Check if"
  "# This function"
  "# This method"
  "// removed"
  "// deleted"
  "// old code"
  "// TODO:$"
  "// FIXME:$"
  "// NOTE:$"
  "// HACK:$"
)

# 패턴을 grep 정규식으로 변환
PATTERN=""
for p in "${SLOP_PATTERNS[@]}"; do
  if [ -z "$PATTERN" ]; then
    PATTERN="$p"
  else
    PATTERN="$PATTERN|$p"
  fi
done

# 불필요한 주석 검색
MATCHES=$(grep -nE "$PATTERN" "$FILE_PATH" 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  # 경고 출력 (stderr로)
  echo "⚠️  Potentially unnecessary comments detected in $FILE_PATH:" >&2
  echo "$MATCHES" | head -5 >&2
  if [ $(echo "$MATCHES" | wc -l) -gt 5 ]; then
    echo "... and more" >&2
  fi
  echo "" >&2
  echo "Consider removing self-evident comments. Good code is self-documenting." >&2

  # JSON 응답으로 경고 (차단하지 않음)
  cat << EOF
{"warning": "Potentially unnecessary comments detected. Review and justify or remove."}
EOF
fi

# 항상 성공으로 종료 (경고만, 차단하지 않음)
exit 0
