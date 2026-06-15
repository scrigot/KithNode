#!/usr/bin/env bash
# ============================================================
# session-log.sh — KithNode ops spine auto-capture (Stop hook)
# Appends a build-log entry from the agent's OPS_LOG marker
# (reuses the IMESSAGE_DIGEST marker pattern) + git commits
# since the last logged hash. Best-effort, never blocks, no-ops
# silently when there is nothing to log.
#
# Wire as a project Stop hook in .claude/settings.json.
# ============================================================
set -uo pipefail

REPO="${CLAUDE_PROJECT_DIR:-$HOME/projects/apps/kithnode}"
LOG="$REPO/ops/build-log.md"
[ -f "$LOG" ] || exit 0

# Stop hook passes JSON on stdin (includes transcript_path)
INPUT="$(cat 2>/dev/null || true)"
TRANSCRIPT="$(printf '%s' "$INPUT" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("transcript_path",""))' 2>/dev/null || true)"

# Agent-written marker, if any: "OPS_LOG: built ... | learned ... | decided ..."
MARKER=""
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  MARKER="$(grep -hoE 'OPS_LOG:[^"\\]*' "$TRANSCRIPT" 2>/dev/null | tail -1 | sed -E 's/^OPS_LOG:[[:space:]]*//')"
fi

cd "$REPO" 2>/dev/null || exit 0

# Commits since the last hash recorded in the log (fallback: last 12h)
LAST="$(grep -oE '\b[0-9a-f]{7,40}\b' "$LOG" 2>/dev/null | tail -1)"
if [ -n "$LAST" ] && git rev-parse --quiet --verify "$LAST" >/dev/null 2>&1; then
  COMMITS="$(git log --oneline "$LAST"..HEAD 2>/dev/null)"
else
  COMMITS="$(git log --oneline --since='12 hours ago' 2>/dev/null)"
fi

# Nothing to record -> no-op (keeps the log clean)
[ -z "$MARKER" ] && [ -z "$COMMITS" ] && exit 0

TS="$(date '+%Y-%m-%d %H:%M')"
BRANCH="$(git branch --show-current 2>/dev/null)"
{
  echo
  echo "### $TS  (branch: ${BRANCH:-?})"
  [ -n "$MARKER" ] && echo "- $MARKER"
  if [ -n "$COMMITS" ]; then
    echo "- commits:"
    echo "$COMMITS" | sed 's/^/    - /'
  fi
} >> "$LOG"

exit 0
