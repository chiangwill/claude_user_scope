# ~/.claude

Personal Claude Code environment — config, custom subagents, install manifest.

## What's tracked

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Global rules for Claude |
| `settings.json` | Claude Code settings |
| `MANIFEST.md` | Tool inventory (humanreadable) |
| `agents/` | Custom subagents |
| `install/` | Package lists + `bootstrap.sh` |

## What's NOT tracked (see `.gitignore`)

- Session history, todos, telemetry
- Plugin cache (re-downloads from marketplace)
- Skills installed by plugin (`skills/` is mostly symlinks to plugin sources)

## Restore on a new machine

```bash
git clone <this-repo> ~/.claude
bash ~/.claude/install/bootstrap.sh
```

Then inside Claude Code, re-add marketplaces (see `MANIFEST.md`).

## Subagents

- **`cheap-lookup`** — Haiku model, read-only. Use for "where is X defined", "grep Y", "list files matching Z".
  Trigger: "用 cheap-lookup 查 X".

- **`env-sync`** — Snapshot / diff / restore environment.
  Trigger: "用 env-sync snapshot" / "diff" / "restore".

## Add a new subagent

1. Create `agents/<name>.md` with frontmatter:
   ```yaml
   ---
   name: <name>
   description: When to use this agent.
   tools: Bash, Read, Glob, Grep
   model: haiku       # or sonnet / opus
   ---
   System prompt body...
   ```
2. Commit. Claude Code picks it up next session.
