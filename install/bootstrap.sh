#!/usr/bin/env bash
# Bootstrap script: restore Claude Code environment on a new machine.
#
# Flow:
#   1. Install Homebrew + brew packages
#   2. Install nvm + Node LTS + npm globals
#   3. Install gstack + caveman
#   4. Symlink ~/.claude/{agents,install,CLAUDE.md,RTK.md,MANIFEST.md,README.md,.gitignore}
#      to this repo (so all machines share the same source via git)
#
# Run AFTER cloning this repo:
#   git clone git@github.com:chiangwill/claude_user_scope.git ~/dotclaude
#   bash ~/dotclaude/install/bootstrap.sh

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/dotclaude}"
CLAUDE_DIR="$HOME/.claude"

log()  { printf '\033[1;34m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }

# ---------- 1. Homebrew ----------
if ! command -v brew >/dev/null 2>&1; then
  log "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

if [[ -f "$REPO_DIR/install/Brewfile" ]]; then
  log "Installing from Brewfile (formulae + casks + taps)..."
  brew bundle install --file="$REPO_DIR/install/Brewfile" || warn "Some Brewfile entries failed"
fi

# ---------- 2. Node + nvm ----------
if [[ ! -d "$HOME/.nvm" ]]; then
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
if [[ -f "$REPO_DIR/install/npm-global.txt" ]]; then
  log "Installing npm global packages..."
  while IFS= read -r pkg; do
    [[ -z "$pkg" || "$pkg" == "npm" || "$pkg" == "corepack" ]] && continue
    npm install -g "$pkg" || warn "Failed: $pkg"
  done < "$REPO_DIR/install/npm-global.txt"
fi

# ---------- 4. gstack (skill source) ----------
if [[ ! -d "$CLAUDE_DIR/skills/gstack" ]]; then
  log "Installing gstack..."
  mkdir -p "$CLAUDE_DIR/skills"
  git clone https://github.com/garrytan/gstack.git "$CLAUDE_DIR/skills/gstack"
  (cd "$CLAUDE_DIR/skills/gstack" && ./setup)
fi

# ---------- 5. caveman (plugin) ----------
if [[ ! -d "$HOME/.agents/skills/caveman" ]]; then
  log "Installing caveman..."
  curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
fi

# ---------- 6. Symlink repo into ~/.claude ----------
log "Linking ~/.claude to $REPO_DIR ..."
mkdir -p "$CLAUDE_DIR"

link() {
  local src="$1" dst="$2"
  if [[ -L "$dst" ]]; then
    rm "$dst"
  elif [[ -e "$dst" ]]; then
    mv "$dst" "$dst.bak.$(date +%s)"
    warn "Backed up existing $dst → $dst.bak.*"
  fi
  ln -s "$src" "$dst"
}

link "$REPO_DIR/agents"      "$CLAUDE_DIR/agents"
link "$REPO_DIR/install"     "$CLAUDE_DIR/install"
link "$REPO_DIR/CLAUDE.md"   "$CLAUDE_DIR/CLAUDE.md"
link "$REPO_DIR/RTK.md"      "$CLAUDE_DIR/RTK.md"
link "$REPO_DIR/MANIFEST.md" "$CLAUDE_DIR/MANIFEST.md"
link "$REPO_DIR/README.md"   "$CLAUDE_DIR/README.md"
link "$REPO_DIR/.gitignore"  "$CLAUDE_DIR/.gitignore"

# Per-skill symlinks (don't touch third-party skills like gstack/caveman)
mkdir -p "$CLAUDE_DIR/skills"
if [[ -d "$REPO_DIR/skills" ]]; then
  for skill_dir in "$REPO_DIR/skills"/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name="$(basename "$skill_dir")"
    link "$skill_dir" "$CLAUDE_DIR/skills/$skill_name"
  done
fi

# ---------- 7. Wire up hooks into settings.json ----------
if [[ -x "$REPO_DIR/install/install-hooks.sh" ]]; then
  log "Installing hooks into settings.json..."
  "$REPO_DIR/install/install-hooks.sh" || warn "install-hooks.sh failed (non-fatal)"
fi

# ---------- 8. Register marketplaces + install plugins via claude CLI ----------
if [[ -x "$REPO_DIR/install/install-plugins.sh" ]]; then
  log "Registering marketplaces and installing plugins..."
  "$REPO_DIR/install/install-plugins.sh" || warn "install-plugins.sh failed (non-fatal)"
fi

log "Done."
