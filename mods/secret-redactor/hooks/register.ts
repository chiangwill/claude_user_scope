import type { Engine, Register } from 'claude-code'

type Rule = { name: string; pattern: string; flags: string; replacement: string }

const load = async ($: Engine) => {
  const rules: Rule[] = JSON.parse(await $.fs.read(`${$.plugin.root}/rules.json`))
  const hits: Record<string, number> = {}

  const redact = (text: string) =>
    rules.reduce((s, { name, pattern, flags, replacement }) => {
      const re = new RegExp(pattern, flags)
      const n = [...s.matchAll(re)].length
      if (n) hits[name] = (hits[name] ?? 0) + n
      return n ? s.replace(re, replacement) : s
    }, text)

  const walk = (v: unknown, key?: string): unknown =>
    typeof v === 'string' ? (key === 'base64' ? v : redact(v))
    : Array.isArray(v) ? v.map(x => walk(x))
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]))
    : v

  // Cumulative per-session count, read by ~/.claude/statusline.sh.
  const bump = async (n: number) => {
    try {
      const file = `/tmp/claude-redactor-${await $.session.id()}`
      const prev = (await $.fs.exists(file)) ? Number(await $.fs.read(file)) || 0 : 0
      await $.fs.write(file, String(prev + n))
    } catch {}
  }

  const report = async () => {
    const total = Object.values(hits).reduce((a, b) => a + b, 0)
    if (!total) return 0
    const detail = Object.entries(hits).map(([k, n]) => `${k} ×${n}`).join(', ')
    $.ui.toast(`🔒 已遮蔽 ${total} 筆 secrets（${detail}）`)
    await bump(total)
    return total
  }

  return { redact, walk, report }
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.deny !== undefined || ran.isError) return ran

      const { redact, walk, report } = await load($)
      const result = walk(ran.result)
      const context = ran.context?.map(redact)
      if (!(await report())) return ran

      // Drop ref/text so core re-maps the rewritten result instead of reusing its own messages.
      return context ? { result, context } : { result }
    } catch (err) {
      $.ui.toast(`secret-redactor failed, output passed through: ${err}`)
      return ran
    }
  })

  // `@file` mentions raise no tool.call; the file's text reaches the model as an attachment.
  on('prompt.attachment', async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.text == null) return ran

      const { redact, report } = await load($)
      const text = redact(ran.text)
      return (await report()) ? { text } : ran
    } catch (err) {
      $.ui.toast(`secret-redactor failed, attachment passed through: ${err}`)
      return ran
    }
  })
}
