import { test, expect } from 'claude-code/testing'

test('/feed answers with text', async ($, on) => {
  on('command.register', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1000 }))
  const ran = await $.command.run({ command: 'feed' })
  expect(JSON.stringify(ran)).toContain('Nyaa')
})

test('prompt.submit passes the prompt through unchanged', async ($, on) => {
  on('clock.now', () => ({ value: 1000 }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  const out = await $.prompt.submit({ text: 'hello' })
  expect(out.text).toBe('hello')
})

test('tool.call passes the result through unchanged', async ($, on) => {
  on('clock.now', () => ({ value: 1000 }))
  const result = { stdout: 'ok', stderr: '', interrupted: false }
  on('tool.call', { tool: 'Bash' }, () => ({ result }))
  const ran = await $.tool.call({ tool: 'Bash', command: 'true' })
  expect(ran.result).toEqual(result)
})
