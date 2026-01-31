#!/bin/bash
# Post-Compact Hook (SessionStart)
# Restore context after compact by outputting active workflow state
#
# Usage: Auto-executed on SessionStart event with "compact" matcher
# Uses Chronos CLI context-reminder command

set -e

# Find the chronos CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHRONOS_CLI="$SCRIPT_DIR/../mcp-servers/chronos/cli.js"

# Check if CLI exists
if [ ! -f "$CHRONOS_CLI" ]; then
  exit 0
fi

# Output context reminder (will be silent if no active work)
node "$CHRONOS_CLI" context-reminder 2>/dev/null || exit 0

exit 0
