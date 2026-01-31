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

# Check workmode status (block main agent when workmode is active)
if [ "$AGENT" = "main" ] || [ "$AGENT" = "sisyphus" ]; then
  # Check workmode via chronos CLI
  WORKMODE_STATUS=$(node "$CHRONOS_CLI" workmode-check "$AGENT" "$FILE_PATH" 2>/dev/null || echo '{"blocked":false}')
  WORKMODE_BLOCKED=$(echo "$WORKMODE_STATUS" | jq -r '.blocked // false' 2>/dev/null || echo "false")
  WORKMODE_MODE=$(echo "$WORKMODE_STATUS" | jq -r '.mode // ""' 2>/dev/null || echo "")

  if [ "$WORKMODE_BLOCKED" = "true" ]; then
    cat << EOF >&2
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⚠️ WORKMODE ACTIVE - DELEGATION REQUIRED                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Workmode ($WORKMODE_MODE) is currently active.                            ║
║  Direct code modification by Sisyphus is blocked.                          ║
║                                                                            ║
║  Instead, delegate to Atlas for orchestrated execution:                    ║
║  Task(subagent_type="atlas", prompt="Execute task...")                     ║
║                                                                            ║
║  To stop workmode: /autopilot off or mcp__chronos__workmode_disable()      ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF

    # JSON response
    cat << EOF
{"blocked": true, "reason": "Workmode ($WORKMODE_MODE) active. Delegate to Atlas instead of direct modification."}
EOF

    exit 2
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
