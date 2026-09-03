#!/usr/bin/env bash
# SessionStart hook: nag when the dotclaude repo has uncommitted changes or
# unpushed commits — the most common reason machines drift out of sync.
#
# Repo location self-locates from this script, so any clone path/depth works.
#
# Triggers when:
#   - the repo's .git exists
#   - working tree dirty OR local main is ahead of origin/main
#   - last nag was >24h ago

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${DOTCLAUDE_REPO:-$(dirname "$SCRIPT_DIR")}"
NAG_FILE="$HOME/.claude/.last-dotclaude-nag"
NAG_INTERVAL_HOURS="${DOTCLAUDE_NAG_INTERVAL_HOURS:-24}"

[[ -d "$REPO/.git" ]] || exit 0

# Throttle
if [[ -f "$NAG_FILE" ]]; then
  now=$(date +%s)
  last=$(stat -f %m "$NAG_FILE" 2>/dev/null || stat -c %Y "$NAG_FILE" 2>/dev/null || echo 0)
  if (( now - last < NAG_INTERVAL_HOURS * 3600 )); then
    exit 0
  fi
fi

cd "$REPO"

dirty_count=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
ahead_count=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)

if [[ "$dirty_count" -eq 0 && "$ahead_count" -eq 0 ]]; then
  exit 0
fi

{
  echo "📦 $REPO out of sync:"
  [[ "$dirty_count" -gt 0 ]] && echo "   - $dirty_count uncommitted file(s)"
  [[ "$ahead_count" -gt 0 ]] && echo "   - $ahead_count unpushed commit(s)"
  echo "   Other machines won't see local changes until you commit + push."
}

touch "$NAG_FILE"
