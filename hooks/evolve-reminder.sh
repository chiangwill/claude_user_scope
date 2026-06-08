#!/usr/bin/env bash
# SessionStart hook: nag about unpromoted feedback memories (across ALL projects).
# Prints a short reminder to stdout (or nothing if quiet).
#
# Triggers when:
#   - >=3 feedback-type memories aren't referenced in CLAUDE.md
#   - Last nag was >7 days ago

set -euo pipefail

PROJECTS_DIR="$HOME/.claude/projects"
NAG_FILE="$HOME/.claude/.last-evolve-nag"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
NAG_INTERVAL_DAYS="${EVOLVE_NAG_INTERVAL_DAYS:-7}"
THRESHOLD="${EVOLVE_NAG_THRESHOLD:-3}"

[[ -d "$PROJECTS_DIR" ]] || exit 0

# Throttle: skip if recently nagged
if [[ -f "$NAG_FILE" ]]; then
  now=$(date +%s)
  last=$(stat -f %m "$NAG_FILE" 2>/dev/null || stat -c %Y "$NAG_FILE" 2>/dev/null || echo 0)
  if (( now - last < NAG_INTERVAL_DAYS * 86400 )); then
    exit 0
  fi
fi

# Collect feedback memories not referenced in CLAUDE.md
unpromoted=()
shopt -s nullglob
for f in "$PROJECTS_DIR"/*/memory/*.md; do
  [[ "$(basename "$f")" == "MEMORY.md" ]] && continue
  grep -q "type: feedback" "$f" 2>/dev/null || continue
  name=$(basename "$f" .md)
  if [[ -f "$CLAUDE_MD" ]] && grep -qF "$name" "$CLAUDE_MD" 2>/dev/null; then
    continue
  fi
  unpromoted+=("$name")
done

(( ${#unpromoted[@]} >= THRESHOLD )) || exit 0

# Emit reminder
{
  echo "📝 ${#unpromoted[@]} feedback memories not yet in CLAUDE.md:"
  for name in "${unpromoted[@]}"; do
    echo "   - $name"
  done
  echo "   Run /dotclaude evolve to review and promote."
}

touch "$NAG_FILE"
