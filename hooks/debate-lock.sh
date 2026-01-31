#!/bin/bash
# Debate Lock - PreToolUse Hook
# Block code modification while debate is in progress
#
# Usage: Auto-executed on PreToolUse event (Edit|Write matcher)
# Exit codes:
#   0 = allow
#   2 = block

set -e

DEBATE_FILE=".sisyphus/debates/active-debate.json"

# Allow if no debate file exists
if [ ! -f "$DEBATE_FILE" ]; then
  exit 0
fi

# Check debate status
PHASE=$(jq -r '.phase // ""' "$DEBATE_FILE" 2>/dev/null || echo "")

# Allow if debate is concluded or doesn't exist
if [ -z "$PHASE" ] || [ "$PHASE" = "concluded" ]; then
  exit 0
fi

# Extract file path
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || echo "")

# Allow .sisyphus/ folder (state file updates)
if [[ "$FILE_PATH" == .sisyphus/* ]] || [[ "$FILE_PATH" == */.sisyphus/* ]]; then
  exit 0
fi

# Block code modification during debate
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

# JSON response
cat << EOF
{"blocked": true, "reason": "Debate in progress (phase: $PHASE). Wait for debate to conclude before modifying."}
EOF

exit 2
