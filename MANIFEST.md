# Claude Environment Manifest

Snapshot of installed tools. Used by `env-sync` agent to restore on new machines.

**Last updated:** 2026-09-03

---

## Install methods

| Tool | Install command |
|------|-----------------|
| Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| nvm | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh \| bash` |
| Claude Code | `npm install -g @anthropic-ai/claude-code` |
| gstack (skills) | `git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup` |

## Tracked package lists

- `install/Brewfile` — brew formulae + casks + taps (60 entries, `brew leaves` only)
- `install/npm-global.txt` — npm globals (8)
- `install/claude-skills.txt` — claude skills (29)
- `install/plugins.txt` — Claude Code plugins (1)
- `install/marketplaces.txt` — Claude Code marketplaces (2)
- `install/permissions-allow.txt` — portable `permissions.allow` patterns merged into `settings.local.json` (11)
- `install/permissions-deny.txt` — portable `permissions.deny` patterns merged into `settings.local.json` (1)

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

## Custom hooks

See `hooks/`:
- `agent-budget.js` — PreToolUse circuit breaker for Agent tool (default 10/session, override `CLAUDE_AGENT_BUDGET`)
- `evolve-reminder.sh` — SessionStart memory-promotion nudge
- `selfheal-hook-paths.sh` — SessionStart auto-patches stale node paths in `settings.json` after nvm upgrades or machine moves
- `dotclaude-nag.sh` — SessionStart reminder when `~/dotclaude` has uncommitted changes or unpushed commits (throttled to once per 24h, override `DOTCLAUDE_NAG_INTERVAL_HOURS`)

Wired into `~/.claude/settings.json` by `install/install-hooks.sh` (idempotent, called from `bootstrap.sh`). Re-run after adding a new hook entry:
```bash
bash ~/dotclaude/install/install-hooks.sh
```

## Custom skills (not from marketplace)

Tracked in this repo under `skills/`, symlinked into `~/.claude/skills/<name>`:

- `batch-grill-me`
- `claude-handoff`
- `dotclaude`
- `grill-me`
- `grill-with-docs`
- `grilling`
- `handoff`
- `research`

Add new ones with `bin/add-skill <name>` (creates the dir + symlink).

## Marketplaces & plugins (Claude Code plugin registry)

See `install/marketplaces.txt` and `install/plugins.txt`.

New machine: `bootstrap.sh` calls `install/install-plugins.sh`, which drives the `claude plugin` CLI to register marketplaces and install plugins. Re-run any time the lists drift:
```bash
bash ~/dotclaude/install/install-plugins.sh
```
