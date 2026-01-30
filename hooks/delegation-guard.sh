#!/bin/bash
# Delegation Guard - PreToolUse Hook
# Atlas 에이전트가 직접 코드 수정 시도 시 차단
#
# 사용법: PreToolUse 이벤트 (Edit|Write 매처)에서 자동 실행
# Exit codes:
#   0 = 허용
#   2 = 차단

set -e

INPUT=$(cat)

# 에이전트 이름 추출 (없으면 "main")
AGENT=$(echo "$INPUT" | jq -r '.agent // .agent_name // "main"' 2>/dev/null || echo "main")

# 파일 경로 추출
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || echo "")

# Atlas가 아니면 허용
if [ "$AGENT" != "atlas" ]; then
  exit 0
fi

# Atlas인 경우: .sisyphus/ 폴더는 허용
if [[ "$FILE_PATH" == .sisyphus/* ]] || [[ "$FILE_PATH" == */.sisyphus/* ]]; then
  exit 0
fi

# Atlas가 코드 수정 시도 - 차단
cat << EOF >&2
╔═══════════════════════════════════════════════════════════════════════════╗
║  🚫 ORCHESTRATOR DELEGATION REQUIRED                                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Atlas is an orchestrator and should not directly modify code.             ║
║                                                                            ║
║  Instead, use the Task tool to delegate to appropriate agents:             ║
║  - junior: General code implementation                                     ║
║  - oracle: Architecture decisions (advisory only)                          ║
║  - multimodal-looker: Media analysis                                       ║
║                                                                            ║
║  Example:                                                                  ║
║  Task(subagent_type="junior", prompt="Implement feature X in file Y...")   ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF

# JSON 응답
cat << EOF
{"blocked": true, "reason": "Atlas는 오케스트레이터입니다. Task tool로 junior 에이전트에 위임하세요."}
EOF

# Exit 2 = 차단
exit 2
