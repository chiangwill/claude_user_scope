#!/usr/bin/env bash
# Bootstrap script: restore Claude Code environment on a new machine.
# Usage: bash ~/.claude/install/bootstrap.sh
#
# Idempotent — skips anything already installed.

set -euo pipefail

CLAUDE_DIR="$HOME/.claude"
INSTALL_DIR="$CLAUDE_DIR/install"

log()  { printf '\033[1;34m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

# ---------- 1. Homebrew ----------
if ! command -v brew >/dev/null 2>&1; then
  log "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if [[ -f "$INSTALL_DIR/brew-formula.txt" ]]; then
  log "Installing brew formulae..."
  xargs brew install < "$INSTALL_DIR/brew-formula.txt" || warn "Some formulae failed"
fi

if [[ -f "$INSTALL_DIR/brew-cask.txt" ]]; then
  log "Installing brew casks..."
  xargs brew install --cask < "$INSTALL_DIR/brew-cask.txt" || warn "Some casks failed"
fi

# ---------- 2. Node + nvm ----------
if ! command -v nvm >/dev/null 2>&1 && [[ ! -d "$HOME/.nvm" ]]; then
  log "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node LTS..."
  nvm install --lts
  nvm use --lts
fi

# ---------- 3. npm globals ----------
if [[ -f "$INSTALL_DIR/npm-global.txt" ]]; then
  log "Installing npm global packages..."
  while IFS= read -r pkg; do
    [[ -z "$pkg" || "$pkg" == "npm" || "$pkg" == "corepack" ]] && continue
    npm install -g "$pkg" || warn "Failed: $pkg"
  done < "$INSTALL_DIR/npm-global.txt"
fi

# ---------- 4. gstack (skill marketplace) ----------
if [[ ! -d "$CLAUDE_DIR/skills/gstack" ]]; then
  log "Installing gstack..."
  git clone https://github.com/garrytan/gstack.git "$CLAUDE_DIR/skills/gstack"
  (cd "$CLAUDE_DIR/skills/gstack" && ./setup)
fi

# ---------- 5. caveman (plugin) ----------
if [[ ! -d "$HOME/.agents/skills/caveman" ]]; then
  log "Installing caveman..."
  curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
fi

log "Done. Restart Claude Code to pick up skills/agents."
