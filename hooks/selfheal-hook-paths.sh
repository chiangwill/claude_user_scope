#!/usr/bin/env bash
# SessionStart hook: re-resolve node binary path in settings.json hook commands.
# Heals "stale node path after nvm upgrade / new machine" silently.
#
# Scope: only patches commands whose first quoted token ends in "/node".
# Effect lands on the NEXT session start (hook list for current session is
# already queued from the on-disk settings.json before any hook runs).

set -euo pipefail

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_DIR/settings.json"

[[ -f "$SETTINGS" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

# Resolve current node binary (nvm-aware)
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi
NODE_BIN="$(command -v node || true)"
[[ -n "$NODE_BIN" ]] || exit 0

# Count hook commands whose embedded node path differs from current
STALE=$(jq -r --arg n "$NODE_BIN" '
  [.. | objects | (.command? // "") | select(. != "")]
  | map(select(test("^\"[^\"]+/node\"")))
  | map(capture("^\"(?<old>[^\"]+/node)\"") | .old)
  | map(select(. != $n))
  | length
' "$SETTINGS")

if [[ "$STALE" -eq 0 ]]; then
  exit 0
fi

# Patch atomically: backup → rewrite to tmp → mv
cp "$SETTINGS" "$SETTINGS.bak.selfheal.$(date +%s)"
TMP="$(mktemp)"
jq --arg n "$NODE_BIN" '
  walk(
    if type == "object" and ((.command? // "") | test("^\"[^\"]+/node\""))
    then .command |= sub("^\"[^\"]+/node\""; "\"" + $n + "\"")
    else .
    end
  )
' "$SETTINGS" > "$TMP"

# Validate result is non-empty JSON before clobbering
if [[ -s "$TMP" ]] && jq -e . "$TMP" >/dev/null 2>&1; then
  mv "$TMP" "$SETTINGS"
  echo "🔧 selfheal: patched $STALE hook command(s) → $NODE_BIN (effective next session)"
else
  rm -f "$TMP"
  echo "⚠️  selfheal: jq output invalid, settings.json untouched" >&2
fi
