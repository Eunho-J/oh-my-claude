#!/bin/bash
# Delegation Guard - PreToolUse Hook
# Block Atlas agent and main agent (in workmode) from direct code modification
#
# Usage: Auto-executed on PreToolUse event (Edit|Write matcher)
# Exit codes:
#   0 = allow
#   2 = block

set -e

INPUT=$(cat)

# Get script directory for chronos CLI path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHRONOS_CLI="$SCRIPT_DIR/../mcp-servers/chronos/cli.js"

# Extract agent name (default "main")
AGENT=$(echo "$INPUT" | jq -r '.agent // .agent_name // "main"' 2>/dev/null || echo "main")

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || echo "")

# Allow .sisyphus/ folder modifications for all agents
if [[ "$FILE_PATH" == .sisyphus/* ]] || [[ "$FILE_PATH" == */.sisyphus/* ]]; then
  exit 0
fi

# Check workmode status (advisory mode for main agent)
if [ "$AGENT" = "main" ] || [ "$AGENT" = "sisyphus" ]; then
  # Check workmode via chronos CLI
  WORKMODE_STATUS=$(node "$CHRONOS_CLI" workmode-check "$AGENT" "$FILE_PATH" 2>/dev/null || echo '{"blocked":false}')
  ADVISORY=$(echo "$WORKMODE_STATUS" | jq -r '.advisory // false' 2>/dev/null || echo "false")
  WORKMODE_MODE=$(echo "$WORKMODE_STATUS" | jq -r '.mode // ""' 2>/dev/null || echo "")

  # Advisory mode - remind but don't block, let Sisyphus decide
  if [ "$ADVISORY" = "true" ]; then
    echo "INFO: Workmode ($WORKMODE_MODE) active. Simple → direct, Complex → Atlas." >&2
    exit 0
  fi
fi

# Allow if not Atlas (and workmode didn't block)
if [ "$AGENT" != "atlas" ]; then
  exit 0
fi

# Block Atlas code modification attempt
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

# JSON response
cat << EOF
{"blocked": true, "reason": "Atlas is an orchestrator. Delegate to junior agent via Task tool."}
EOF

# Exit 2 = block
exit 2
