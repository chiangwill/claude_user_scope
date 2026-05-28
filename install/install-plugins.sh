#!/usr/bin/env bash
# Idempotent installer for Claude Code marketplaces + plugins.
# Reads install/marketplaces.txt and install/plugins.txt, drives the `claude`
# CLI to register marketplaces and install plugins. Skips entries already present.
#
# Replaces the old "paste these commands into Claude Code" clipboard step.
# Run after bootstrap.sh (which has installed @anthropic-ai/claude-code).

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/dotclaude}"
MARKET_LIST="$REPO_DIR/install/marketplaces.txt"
PLUGIN_LIST="$REPO_DIR/install/plugins.txt"

log()  { printf '\033[1;34m[install-plugins]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v claude >/dev/null 2>&1 || die "claude CLI not in PATH"

# ---------- Marketplaces ----------
if [[ -f "$MARKET_LIST" ]]; then
  current_markets="$(claude plugin marketplace list 2>/dev/null || true)"
  while IFS= read -r repo; do
    [[ -z "$repo" || "$repo" =~ ^[[:space:]]*# ]] && continue
    if grep -qF "$repo" <<<"$current_markets"; then
      log "marketplace already added: $repo"
    else
      log "adding marketplace: $repo"
      claude plugin marketplace add "$repo" || warn "failed: $repo"
    fi
  done < "$MARKET_LIST"
fi

# ---------- Plugins ----------
if [[ -f "$PLUGIN_LIST" ]]; then
  current_plugins="$(claude plugin list 2>/dev/null || true)"
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    pkg="$(printf '%s' "$line" | awk '{print $1}')"
    [[ -z "$pkg" ]] && continue
    if grep -qF "$pkg" <<<"$current_plugins"; then
      log "plugin already installed: $pkg"
    else
      log "installing plugin: $pkg"
      claude plugin install "$pkg" || warn "failed: $pkg"
    fi
  done < "$PLUGIN_LIST"
fi

log "Done."
