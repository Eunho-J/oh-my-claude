#!/bin/bash
# Delegation Guard - PreToolUse Hook
# Block Atlas agent from direct code modification
#
# Usage: Auto-executed on PreToolUse event (Edit|Write matcher)
# Exit codes:
#   0 = allow
#   2 = block

set -e

INPUT=$(cat)

# Extract agent name (default "main")
AGENT=$(echo "$INPUT" | jq -r '.agent // .agent_name // "main"' 2>/dev/null || echo "main")

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null || echo "")

# Allow if not Atlas
if [ "$AGENT" != "atlas" ]; then
  exit 0
fi

# Allow .sisyphus/ folder for Atlas
if [[ "$FILE_PATH" == .sisyphus/* ]] || [[ "$FILE_PATH" == */.sisyphus/* ]]; then
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
