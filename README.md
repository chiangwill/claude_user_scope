# Claude user-scope config

Personal Claude Code environment. Single source of truth = this repo.
Local `~/.claude/` symlinks to here.

## New machine restore

```bash
git clone git@github.com:chiangwill/claude_user_scope.git ~/dotclaude
bash ~/dotclaude/install/bootstrap.sh
```

`bootstrap.sh`:
1. Installs Homebrew + 159 formulae + casks
2. Installs nvm + Node LTS + npm globals
3. Clones gstack + installs caveman
4. Symlinks `~/.claude/*` → `~/dotclaude/*`

Then inside Claude Code:
```
/plugin marketplace add JuliusBrussee/caveman
/plugin install caveman@caveman
```

## Daily flow

Local edit in `~/.claude/agents/foo.md` updates the repo directly (it's a symlink). Then:

```bash
cd ~/dotclaude
git add -A && git commit -m "tweak foo agent" && git push
```

Other machine:
```bash
cd ~/dotclaude && git pull
```

That's it — symlinks pick up changes instantly.

## Snapshot env

When you install new brew / npm packages on one machine and want to sync the lists:

```bash
brew list --formula > ~/dotclaude/install/brew-formula.txt
brew list --cask    > ~/dotclaude/install/brew-cask.txt
npm ls -g --depth=0 --json | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(d.get('dependencies',{}).keys()))" > ~/dotclaude/install/npm-global.txt
cd ~/dotclaude && git add -A && git commit -m "snapshot env" && git push
```

Or ask Claude: **"用 env-sync snapshot"**.

## Subagents

- `cheap-lookup` — Haiku model, read-only repo lookups
- `env-sync` — snapshot / diff / restore env

Add new one: drop `agents/<name>.md`, commit, push. New machine picks it up via `git pull`.

## Skills (your own)

Put each skill in `skills/<name>/SKILL.md`. `bootstrap.sh` symlinks each into `~/.claude/skills/<name>` (won't touch gstack/caveman or other third-party skills already installed).

Third-party skills:
- `gstack` — update via `/gstack-upgrade` or `cd ~/.claude/skills/gstack && git pull && ./setup`
- `caveman` — update via `/plugin update caveman@caveman`

## Layout

```
~/dotclaude/                   ← git repo (source of truth)
├── CLAUDE.md
├── MANIFEST.md
├── README.md (this)
├── .gitignore
├── agents/
│   ├── cheap-lookup.md
│   └── env-sync.md
├── install/
│   ├── bootstrap.sh
│   ├── brew-formula.txt
│   ├── brew-cask.txt
│   └── npm-global.txt
└── skills/
    └── <your-skill>/SKILL.md

~/.claude/                     ← Claude Code reads here
├── agents      → ~/dotclaude/agents
├── install     → ~/dotclaude/install
├── CLAUDE.md   → ~/dotclaude/CLAUDE.md
├── MANIFEST.md → ~/dotclaude/MANIFEST.md
├── README.md   → ~/dotclaude/README.md
├── .gitignore  → ~/dotclaude/.gitignore
├── settings.json   (machine-local)
├── sessions/       (machine-local)
└── plugins/        (machine-local)
```
