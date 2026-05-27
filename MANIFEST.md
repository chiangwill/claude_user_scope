# Claude Environment Manifest

Snapshot of installed tools. Used by `env-sync` agent to restore on new machines.

**Last updated:** 2026-05-27

---

## Install methods

| Tool | Install command |
|------|-----------------|
| Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| nvm | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \| bash` |
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| gstack (skills) | `git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` |
| caveman (plugin) | `curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh \| bash` |
| understand-anything (plugin) | Installed via marketplace Lum1104/Understand-Anything |

## Tracked package lists

- `install/brew-formula.txt` — brew formulae (159)
- `install/brew-cask.txt` — brew casks (2)
- `install/npm-global.txt` — npm globals (8)
- `install/claude-skills.txt` — claude skills (54)
- `install/plugins.txt` — Claude Code plugins (3)
- `install/marketplaces.txt` — Claude Code marketplaces (5)

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

## Marketplaces & plugins (Claude Code plugin registry)

See `install/marketplaces.txt` and `install/plugins.txt`.

Re-add on new machine inside Claude Code:
```
/plugin marketplace add anthropics/claude-plugins-official
/plugin marketplace add affaan-m/everything-claude-code
/plugin marketplace add JuliusBrussee/caveman
/plugin marketplace add Lum1104/Understand-Anything
/plugin marketplace add thedotmack/claude-mem
/plugin install caveman@caveman
/plugin install understand-anything@understand-anything
/plugin install claude-mem@thedotmack
```
