import type { Register } from 'claude-code'

const DEFAULT_BUDGET = 10

// Counts live in the module, so they reset with the session (and on a mod reload).
let total = 0
const byType: Record<string, number> = {}

export const register: Register = on => {
  on('agent.spawn', async ($, e, next) => {
    const budget = Math.max(1, parseInt((await $.env.get('CLAUDE_AGENT_BUDGET')) ?? '', 10) || DEFAULT_BUDGET)

    if (total >= budget) {
      const types = Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', ')
      $.ui.toast(`🛑 子代理預算用完：${total}/${budget}`)
      return {
        deny:
          `agent-budget: ${total}/${budget} subagents used this session (${types}). ` +
          `Do the work inline, or ask the user to raise CLAUDE_AGENT_BUDGET and restart.`,
      }
    }

    total += 1
    byType[e.subagentType] = (byType[e.subagentType] ?? 0) + 1
    return next(e)
  })
}
