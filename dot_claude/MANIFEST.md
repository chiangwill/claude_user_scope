# Claude Environment Manifest

Snapshot of installed tools. Used by `env-sync` agent to restore on new machines.

**Last updated:** 2026-05-20

---

## Install methods

| Tool | Install command |
|------|-----------------|
| Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| nvm | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \| bash` |
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| gstack (skills) | `git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` |
| caveman (plugin) | `curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh \| bash` |

## Tracked package lists

- `install/brew-formula.txt` — brew formulae (159)
- `install/brew-cask.txt` — brew casks
- `install/npm-global.txt` — npm globals

## One-shot restore

```bash
bash ~/.claude/install/bootstrap.sh
```

## Update snapshot

Ask Claude: **"用 env-sync snapshot"** — agent rewrites the lists above.

## Diff (what's drifted)

Ask Claude: **"用 env-sync diff"** — compare current env vs manifest.

## Custom subagents

See `agents/`:
- `cheap-lookup` — Haiku, read-only repo lookups
- `env-sync` — snapshot / diff / restore env

## Custom skills (not from marketplace)

None yet. Drop new ones into `~/.claude/skills/<name>/SKILL.md`.

## Marketplaces (Claude Code plugin registry)

- `anthropics/claude-plugins-official`
- `affaan-m/everything-claude-code`
- `JuliusBrussee/caveman`

Re-add on new machine inside Claude Code:
```
/plugin marketplace add anthropics/claude-plugins-official
/plugin marketplace add affaan-m/everything-claude-code
/plugin marketplace add JuliusBrussee/caveman
/plugin install caveman@caveman
```
