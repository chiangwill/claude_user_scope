#!/usr/bin/env bash
# Idempotent installer for Claude Code marketplaces + plugins.
# Reads install/marketplaces.txt and install/plugins.txt, drives the `claude`
# CLI to register marketplaces and install plugins. Skips entries already present.
#
# Replaces the old "paste these commands into Claude Code" clipboard step.
# Run after bootstrap.sh (which has installed @anthropic-ai/claude-code).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(dirname "$SCRIPT_DIR")}"
MARKET_LIST="$REPO_DIR/install/marketplaces.txt"
PLUGIN_LIST="$REPO_DIR/install/plugins.txt"

log()  { printf '\033[1;34m[install-plugins]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

# Source nvm so `claude` is on PATH when invoked from a non-interactive shell
# (e.g. bootstrap.sh calling this script). Harmless if nvm not installed.
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi
command -v claude >/dev/null 2>&1 || die "claude CLI not in PATH"

# ---------- Marketplaces ----------
if [[ -f "$MARKET_LIST" ]]; then
  current_markets="$(claude plugin marketplace list 2>/dev/null || true)"
  if [[ -z "$current_markets" ]]; then
    sleep 1
    current_markets="$(claude plugin marketplace list 2>/dev/null || true)"
  fi
  if [[ -z "$current_markets" ]]; then
    warn "claude plugin marketplace list returned empty — skipping add loop"
  else
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
fi

# ---------- Plugins ----------
if [[ -f "$PLUGIN_LIST" ]]; then
  # `claude plugin list` occasionally returns empty under race conditions
  # (e.g. right after marketplace add). Retry once before treating absence
  # as authoritative — otherwise we'd reinstall already-present plugins.
  current_plugins="$(claude plugin list 2>/dev/null || true)"
  if [[ -z "$current_plugins" ]]; then
    sleep 1
    current_plugins="$(claude plugin list 2>/dev/null || true)"
  fi
  if [[ -z "$current_plugins" ]]; then
    warn "claude plugin list returned empty — skipping install loop to avoid reinstall"
  else
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

  # ---------- Version drift check ----------
  # plugins.txt acts as a lockfile: "<pkg> <version>". CLI has no --version
  # flag, so we install latest and warn if it differs from the locked version.
  installed_versions="$(claude plugin list 2>/dev/null \
    | awk '/^  *❯ / {gsub(/^ *❯ */,"",$0); pkg=$0} /Version:/ {print pkg, $2}')"
  drift=0
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    pkg="$(awk '{print $1}' <<<"$line")"
    want="$(awk '{print $2}' <<<"$line")"
    [[ -z "$pkg" || -z "$want" ]] && continue
    have="$(awk -v p="$pkg" '$1==p {print $2}' <<<"$installed_versions")"
    if [[ -n "$have" && "$have" != "$want" ]]; then
      warn "version drift: $pkg locked=$want installed=$have"
      drift=$((drift + 1))
    fi
  done < "$PLUGIN_LIST"
  if [[ $drift -gt 0 ]]; then
    warn "$drift plugin(s) drifted from $PLUGIN_LIST. Re-snapshot with env-sync if intentional."
  fi
fi

log "Done."
