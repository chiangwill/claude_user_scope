import type { Register } from 'claude-code'

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

export const register: Register = on => {
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId || e.isAborted || e.reason !== 'answer') return result

    const secs = Math.round(e.durationMs / 1000)
    const parts = [`⏱ ${secs}s`]
    const u = e.usage
    if (u) {
      const total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      parts.push(`input ${k(total)}`, `output ${k(u.output_tokens)}`)
      if (total > 0) parts.push(`cache hit ${Math.round((u.cache_read_input_tokens / total) * 100)}%`)
    }

    return { ...result, text: parts.join(' · ') }
  })
}
