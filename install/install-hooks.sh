#!/usr/bin/env bash
# Idempotent installer for hooks managed by this repo.
# Patches ~/.claude/settings.json to wire up hooks whose absolute paths
# depend on the local machine (node binary, user $HOME).
#
# Run after bootstrap.sh, or any time after adding a new hook entry below.

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/dotclaude}"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS="$CLAUDE_DIR/settings.json"

log()  { printf '\033[1;34m[install-hooks]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v jq >/dev/null 2>&1 || die "jq not installed (brew install jq)"
[[ -f "$SETTINGS" ]] || die "missing $SETTINGS — run Claude Code at least once first"

# Resolve node binary. Prefer nvm's current, fall back to PATH.
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi
NODE_BIN="$(command -v node || true)"
[[ -n "$NODE_BIN" ]] || die "node not found in PATH"

backup() {
  cp "$SETTINGS" "$SETTINGS.bak.$(date +%s)"
}

# Add a PreToolUse hook entry for a given matcher and script.
# Idempotent: skips if any existing entry for matcher already references the script.
add_pretooluse_hook() {
  local matcher="$1" script="$2" timeout="${3:-5}"
  local cmd="\"$NODE_BIN\" \"$script\""

  if jq -e --arg m "$matcher" --arg s "$script" '
    (.hooks.PreToolUse // [])
    | map(select(.matcher == $m))
    | map(.hooks[]?.command // "")
    | flatten
    | any(. | contains($s))
  ' "$SETTINGS" >/dev/null; then
    log "PreToolUse[$matcher] already wired to $(basename "$script") — skip"
    return 0
  fi

  backup
  local tmp
  tmp="$(mktemp)"
  jq --arg m "$matcher" --arg cmd "$cmd" --argjson timeout "$timeout" '
    .hooks = (.hooks // {})
    | .hooks.PreToolUse = (.hooks.PreToolUse // [])
    | .hooks.PreToolUse += [{
        matcher: $m,
        hooks: [{ type: "command", command: $cmd, timeout: $timeout }]
      }]
  ' "$SETTINGS" > "$tmp"
  mv "$tmp" "$SETTINGS"
  log "Added PreToolUse[$matcher] → $(basename "$script")"
}

# ---------- Hooks managed by this repo ----------

add_pretooluse_hook "Agent" "$REPO_DIR/hooks/agent-budget.js" 5

log "Done. Restart Claude Code session for changes to take effect."
