import { test, expect } from 'claude-code/testing'

const usage = { model: 'm', input_tokens: 1000, output_tokens: 800, cache_read_input_tokens: 9000, cache_creation_input_tokens: 0 }
const turn = (over: object) => ({ turnId: 't', answer: 'ok', durationMs: 5000, isAborted: false, reason: 'answer', usage, ...over }) as any

const setup = (on: any) => on('turn.complete', (_$: any, e: any) => ({ text: e.answer }))

test('adds a summary line with time, tokens and cache hit', async ($, on) => {
  setup(on)
  const r = await $.turn.complete(turn({}))
  expect(r.text).toBe('⏱ 5 秒 · 輸入 10.0k · 輸出 800 · cache hit 90%')
})

test('omits token figures when the turn has no usage', async ($, on) => {
  setup(on)
  const r = await $.turn.complete(turn({ usage: undefined }))
  expect(r.text).toBe('⏱ 5 秒')
})

test('interrupted turn: no extra line', async ($, on) => {
  setup(on)
  const r = await $.turn.complete(turn({ isAborted: true, reason: 'aborted' }))
  expect(r.text).toBe('ok')
})

test('subagent turn is ignored', async ($, on) => {
  setup(on)
  const r = await $.turn.complete(turn({ agentId: 'a1' }))
  expect(r.text).toBe('ok')
})
