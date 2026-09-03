# Claude user-scope config

Personal Claude Code environment. Single source of truth = this repo.
Local `~/.claude/` symlinks to here.

## New machine restore

```bash
git clone git@github.com:chiangwill/claude_user_scope.git ~/dotclaude
bash ~/dotclaude/install/bootstrap.sh
```

`bootstrap.sh`:
1. Installs Homebrew + entries from `install/Brewfile` (formulae + casks + taps)
2. Installs nvm + Node LTS + npm globals
3. Clones gstack
4. Symlinks `~/.claude/*` → `~/dotclaude/*`
5. Patches `settings.json` with managed hooks + portable permissions (`install/install-hooks.sh`)
6. Registers marketplaces + installs plugins via `claude` CLI (`install/install-plugins.sh`)

No manual paste step. Re-running is safe — every installer is idempotent.

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
brew bundle dump --file=~/dotclaude/install/Brewfile --force --formula --cask --tap
npm ls -g --depth=0 --json | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(d.get('dependencies',{}).keys()))" > ~/dotclaude/install/npm-global.txt
cd ~/dotclaude && git add -A && git commit -m "snapshot env" && git push
```

Or ask Claude: **"用 env-sync snapshot"**.

## Subagents

- `cheap-lookup` — Haiku model, read-only repo lookups
- `env-sync` — snapshot / diff / restore env

Add new one: drop `agents/<name>.md`, commit, push. New machine picks it up via `git pull`.

## Hooks

- `pii-secret-guard.sh` — PreToolUse hook (`Bash|Write|Edit`). Blocks tool calls whose command/content matches a secret (via `gitleaks`) or PII (via a local Presidio Analyzer). Requires `gitleaks` installed, plus `colima start` + `docker compose up -d` in `~/will/presidio` (runs `presidio-analyzer` on `localhost:5001`).
  - **On/off switch**: `touch ~/.claude/pii-guard-enabled` to enable, `rm` it to disable. Takes effect on the next tool call, no restart needed. This file lives outside this repo on purpose — cloning dotclaude on another machine does NOT turn the guard on there; each machine starts disabled until you `touch` the file yourself.
  - **False-positive overrides** (only after confirming a hit is not real): add a regex to `pii-allowlist.txt` (one per line, matched against the flagged substring) or to `gitleaks-allowlist.toml`'s `[allowlist]` block (gitleaks' native mechanism — do not leave this block present-but-empty, gitleaks fails to load the config if it is).

Add new one: drop `hooks/<name>.sh`, wire it into `settings.json`'s `hooks` block, commit, push.

## Skills (your own)

Put each skill in `skills/<name>/SKILL.md`. `bootstrap.sh` symlinks each into `~/.claude/skills/<name>` (won't touch gstack or other third-party skills already installed).

Third-party skills:
- `gstack` — update via `/gstack-upgrade` or `cd ~/.claude/skills/gstack && git pull && ./setup`

  ⚠️ On 2026-09-02 the 35 unused gstack wrappers below were removed from
  `~/.claude/skills/` (bodies remain under `skills/gstack/`, so a wrapper is
  restored by re-symlinking it). **An upgrade reinstalls them — re-remove after
  running `/gstack-upgrade`:**

  ```
  ios-clean ios-design-review ios-fix ios-qa ios-sync
  setup-gbrain sync-gbrain
  canary land-and-deploy landing-report setup-deploy
  design-consultation design-html design-review design-shotgun
  plan-ceo-review plan-design-review plan-devex-review plan-eng-review plan-tune autoplan
  browse scrape skillify setup-browser-cookies pair-agent open-gstack-browser
  benchmark benchmark-models office-hours cso devex-review codex retro connect-chrome
  ```

  They were dropped because none had ever been invoked and each SKILL.md body is
  20–27k tokens if mis-triggered.

## Known limitations

### Platform
macOS only. `bootstrap.sh` assumes Homebrew, `pbcopy`, and BSD-flavored `stat`. Linux support is not wired (would need package-manager detection and a parallel install path). Adding it is straightforward but not done because there is no Linux machine in the current rotation.

### Supply chain
Two steps pull code over `curl | bash` without checksum pinning:
- Homebrew install (`raw.githubusercontent.com/Homebrew/install/HEAD/install.sh`)
- nvm install (pinned to tag `v0.40.1`, the only one of the two that is pinned)

If any of these upstream repos gets compromised, bootstrap on a new machine would execute attacker code. Mitigations available if it ever feels worth it:
- Mirror each install script into this repo and run the local copy
- Pin the Homebrew install URL to a specific commit hash
- Verify SHA-256 of the downloaded script before piping to `bash`

For a single-user personal config this is currently an accepted risk.

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
├── hooks/
│   ├── pii-secret-guard.sh
│   ├── pii-allowlist.txt
│   ├── gitleaks-allowlist.toml
│   └── ...
├── install/
│   ├── bootstrap.sh
│   ├── install-hooks.sh
│   ├── install-plugins.sh
│   ├── Brewfile
│   ├── permissions-allow.txt
│   ├── permissions-deny.txt
│   ├── npm-global.txt
│   ├── marketplaces.txt
│   └── plugins.txt
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
