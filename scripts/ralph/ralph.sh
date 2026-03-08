#!/bin/bash
# Ralph - Autonomous AI agent loop for Claude Code
# Usage: ./ralph.sh [--tool amp|claude] [max_iterations]

set -e

TOOL="claude"
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool) TOOL="$2"; shift 2 ;;
    --tool=*) TOOL="${1#*=}"; shift ;;
    *) if [[ "$1" =~ ^[0-9]+$ ]]; then MAX_ITERATIONS="$1"; fi; shift ;;
  esac
done

if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

if [[ "$TOOL" == "claude" ]]; then
  if ! command -v claude &> /dev/null; then
    echo "Error: Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq not found."
  exit 1
fi

if [[ ! -f "$PRD_FILE" ]]; then
  echo "Error: prd.json not found at $PRD_FILE"
  exit 1
fi

CURRENT_BRANCH=$(jq -r '.branchName' "$PRD_FILE")
if [[ -f "$LAST_BRANCH_FILE" ]]; then
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE")
  if [[ "$LAST_BRANCH" != "$CURRENT_BRANCH" ]]; then
    echo "New feature detected. Archiving previous run..."
    ARCHIVE_NAME="$(date +%Y-%m-%d)-$LAST_BRANCH"
    mkdir -p "$ARCHIVE_DIR/$ARCHIVE_NAME"
    [[ -f "$PRD_FILE" ]] && cp "$PRD_FILE" "$ARCHIVE_DIR/$ARCHIVE_NAME/"
    [[ -f "$PROGRESS_FILE" ]] && cp "$PROGRESS_FILE" "$ARCHIVE_DIR/$ARCHIVE_NAME/"
    > "$PROGRESS_FILE"
  fi
fi

echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"

if [[ ! -f "$PROGRESS_FILE" ]]; then
  cat > "$PROGRESS_FILE" << 'EOF'
# Progress Log
## Codebase Patterns
## Completed Stories
## Learnings
EOF
fi

echo "=========================================="
echo "  Ralph - Autonomous AI Agent Loop"
echo "  Tool: $TOOL"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Branch: $CURRENT_BRANCH"
echo "=========================================="

check_complete() {
  local remaining=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
  [[ "$remaining" -eq 0 ]]
}

for ((i=1; i<=MAX_ITERATIONS; i++)); do
  echo ""
  echo "--- Iteration $i of $MAX_ITERATIONS ---"

  if check_complete; then
    echo "All stories complete!"
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
  echo "Remaining stories: $REMAINING"

  if [[ "$TOOL" == "claude" ]]; then
    PROMPT_FILE="$SCRIPT_DIR/CLAUDE.md"
    echo "Running Claude Code..."
    claude --dangerously-skip-permissions -p "$(cat "$PROMPT_FILE")"
  fi

  echo "Iteration $i complete."
done

echo ""
echo "Max iterations ($MAX_ITERATIONS) reached."
if ! check_complete; then
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
  echo "$REMAINING stories still remaining."
fi
