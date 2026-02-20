#!/bin/bash
# Comment Checker - PostToolUse Hook
# Detect unnecessary comments after Edit/Write
#
# Usage: Auto-executed on PostToolUse event (Edit|Write matcher)

set -e

INPUT=$(cat)

# Extract modified file path
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null)

# Exit if no file path
if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
  exit 0
fi

# Exit if file doesn't exist
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Check file extension (only check code files)
EXT="${FILE_PATH##*.}"
case "$EXT" in
  ts|tsx|js|jsx|py|go|rs|java|cpp|c|h|hpp)
    ;;
  *)
    # Exit if not a code file
    exit 0
    ;;
esac

# Define unnecessary comment patterns
# - Self-evident explanation comments
# - Removed code markers
# - Empty TODO/FIXME
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

# Convert patterns to grep regex
PATTERN=""
for p in "${SLOP_PATTERNS[@]}"; do
  if [ -z "$PATTERN" ]; then
    PATTERN="$p"
  else
    PATTERN="$PATTERN|$p"
  fi
done

# Search for unnecessary comments
MATCHES=$(grep -nE "$PATTERN" "$FILE_PATH" 2>/dev/null || true)

if [ -n "$MATCHES" ]; then
  # Output warning (to stderr)
  echo "⚠️  Potentially unnecessary comments detected in $FILE_PATH:" >&2
  echo "$MATCHES" | head -5 >&2
  if [ $(echo "$MATCHES" | wc -l) -gt 5 ]; then
    echo "... and more" >&2
  fi
  echo "" >&2
  echo "Consider removing self-evident comments. Good code is self-documenting." >&2

  # JSON response warning (non-blocking)
  cat << EOF
{"warning": "Potentially unnecessary comments detected. Review and justify or remove."}
EOF
fi

# Always exit success (warning only, non-blocking)
exit 0
