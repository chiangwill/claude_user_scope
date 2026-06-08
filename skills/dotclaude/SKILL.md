---
name: dotclaude
description: Manage the user's dotclaude repo (~/dotclaude). Add new subagents or skills with templates and symlinks, commit and push changes, or pull updates from remote. Use when the user types /dotclaude or asks to add/sync/pull custom agent/skill files.
allowed-tools:
  - Bash
---

# dotclaude skill

Wraps shell scripts in `~/dotclaude/bin/` so the user can manage their dotclaude repo with one command.

## Subcommands

Parse `ARGUMENTS` (the text after `/dotclaude`). First token = action:

| Command | Runs | Effect |
|---------|------|--------|
| `/dotclaude add agent <name>` | `~/dotclaude/bin/add-agent <name>` | Creates `~/dotclaude/agents/<name>.md` with frontmatter template. Agent visible immediately (agents/ is a dir symlink). |
| `/dotclaude add skill <name>` | `~/dotclaude/bin/add-skill <name>` | Creates `~/dotclaude/skills/<name>/SKILL.md` + symlinks `~/.claude/skills/<name>`. |
| `/dotclaude sync [msg]` | `~/dotclaude/bin/sync [msg]` | `git add -A && git commit -m "$msg" && git push`. Default msg: `update`. |
| `/dotclaude pull` | `~/dotclaude/bin/pull` | `git pull` in the repo. |
| `/dotclaude status` | `cd ~/dotclaude && git status` | Show what's modified. |
| `/dotclaude evolve` | `~/dotclaude/bin/evolve` | List feedback memories not yet promoted into `~/.claude/CLAUDE.md`, then walk the user through promotion. |

## Examples

```
/dotclaude add agent log-reader
/dotclaude add skill commit-helper
/dotclaude sync "feat: add log-reader agent"
/dotclaude pull
/dotclaude status
```

## After creating an agent/skill

Tell the user:
1. Edit the new file (give the full path the script printed).
2. When done, run `/dotclaude sync "feat: ..."` to push.

## Evolve flow (CLAUDE.md curation)

When the user runs `/dotclaude evolve`:

1. Run `~/dotclaude/bin/evolve` — outputs all feedback-type memory files (across ALL projects) not referenced in `~/.claude/CLAUDE.md`. Each entry's path shows which project it came from; project-specific feedback should usually be skipped, only cross-project rules promoted.
2. For each memory listed, ask the user: **"Promote this to CLAUDE.md? (yes / no / edit)"**
   - **yes** → propose a concise rule to add to CLAUDE.md (in the appropriate section), edit the file, and reference the memory name in a comment so future evolve runs skip it (e.g. `<!-- from memory: prefer-simple-dotfile-sync -->`).
   - **no** → skip; leave the memory as-is.
   - **edit** → ask the user how they want the rule worded, then apply.
3. After walking through all entries, summarise what was promoted and what was skipped.
4. Run `/dotclaude sync "docs: promote N feedback rules to CLAUDE.md"` to push.

Rules for the evolve flow:
- Never edit CLAUDE.md without user approval per-entry.
- Keep promoted rules short. CLAUDE.md is loaded every session — bloat = cost.
- If user says "all yes" or "skip all", batch through.

## On unknown subcommand or missing args

Print the table above and exit.

## Rules

- Never modify files outside `~/dotclaude/`.
- Never force-push or rewrite history.
- If `git push` fails (rejected, no remote), report the exact error — don't try `--force`.
- Caveman caller? Mirror the style in your replies.
