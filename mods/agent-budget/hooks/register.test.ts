import { test, expect } from 'claude-code/testing'

const spawn = ($: any, subagentType = 'general-purpose') => $.agent.spawn({ prompt: 'x', description: 'x', subagentType })

const setup = (on: any, budget?: string) => {
  on('env.get', () => ({ value: budget }))
  on('ui.toast', () => ({ value: undefined }))
  on('agent.spawn', () => ({ model: 'm', agentId: 'a' }))
}

test('allows up to the default budget of 10, then denies', async ($, on) => {
  setup(on)
  for (let i = 0; i < 10; i++) expect((await spawn($)).deny).toBeUndefined()
  const r = await spawn($)
  expect(r.deny).toContain('10/10')
})

test('CLAUDE_AGENT_BUDGET overrides the default', async ($, on) => {
  setup(on, '2')
  await spawn($)
  await spawn($)
  expect((await spawn($)).deny).toContain('2/2')
})

test('denial lists the count per subagent type', async ($, on) => {
  setup(on, '3')
  await spawn($, 'Explore')
  await spawn($, 'Explore')
  await spawn($, 'Plan')
  expect((await spawn($)).deny).toContain('Explore=2, Plan=1')
})

test('an invalid CLAUDE_AGENT_BUDGET falls back to the default', async ($, on) => {
  setup(on, 'abc')
  for (let i = 0; i < 10; i++) expect((await spawn($)).deny).toBeUndefined()
  expect((await spawn($)).deny).toContain('10/10')
})
