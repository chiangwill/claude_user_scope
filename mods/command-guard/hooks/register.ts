import type { Register } from 'claude-code'

// rm -rf, git force push, git reset --hard are left to the blast-radius mod (preview + buttons).
const RULES: { reason: string; pattern: RegExp }[] = [
  { reason: 'destructive SQL (DROP / TRUNCATE)', pattern: /\b(drop\s+(table|database|schema)|truncate\s+table)\b/i },
  { reason: 'piping a download into a shell', pattern: /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/ },
  { reason: 'world-writable recursive chmod', pattern: /\bchmod\b[^|;&]*-R[^|;&]*\b777\b/ },
]

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    const hit = RULES.find(r => r.pattern.test(e.command))
    if (!hit) return next(e)

    $.ui.toast(`🛑 已攔截：${hit.reason}`)
    return { deny: `${$.plugin.name}: blocked — ${hit.reason}. Ask the user to run it themselves if intended.` }
  }).catch(($, e, next) =>
    next.called ? next(e) : { deny: `${$.plugin.name}: its guard failed.` },
  )
}
