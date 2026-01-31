#!/bin/bash
# Ralph Loop - Stop Hook
# Continue execution until completion promise detected or max iterations reached
#
# Usage: Auto-executed on Stop event
# State file: .sisyphus/ralph-state.json
#
# Uses Chronos MCP Server CLI for state management

set -e

# Consume stdin (hook protocol)
cat > /dev/null

# Find the chronos CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHRONOS_CLI="$SCRIPT_DIR/../mcp-servers/chronos/cli.js"

# Check if CLI exists
if [ ! -f "$CHRONOS_CLI" ]; then
  exit 0
fi

# Check if Ralph Loop is active
STATE_FILE=".sisyphus/ralph-state.json"
if [ ! -f "$STATE_FILE" ]; then
  exit 0
fi

# Use Node.js CLI for state management
node "$CHRONOS_CLI" ralph-continue

exit 0
