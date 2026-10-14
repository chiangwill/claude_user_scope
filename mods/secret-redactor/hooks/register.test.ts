import type { On } from 'claude-code'
import { test, expect } from 'claude-code/testing'

const rules = JSON.stringify([
  { name: 'jwt', pattern: '\\beyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+', flags: 'g', replacement: '[REDACTED:jwt]' },
  { name: 'env-var', pattern: '(\\b[A-Z0-9_]*PASSWORD[A-Z0-9_]*\\s*=\\s*)(?!\\[REDACTED)([^\\s]+)', flags: 'gi', replacement: '$1[REDACTED:env-var]' },
])
const text = (o: unknown) => JSON.stringify(o)

const stubEngine = (on: On, toasts: string[] = []) => {
  on('fs.read', () => ({ value: rules }))
  on('ui.toast', (_$, e) => { toasts.push(e.text); return { value: undefined } })
}

test('redacts Bash stdout and Read file content, then toasts the count', async ($, on) => {
  const toasts: string[] = []
  stubEngine(on, toasts)
  const secret = 'DB_PASSWORD=hunter2\nAPP_NAME=demo\n'
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: secret, stderr: '', interrupted: false } }))
  on('tool.call', { tool: 'Read' }, () => ({
    result: { type: 'text', file: { filePath: 'x', content: secret, numLines: 2, startLine: 1, totalLines: 2 } },
  }))

  const bash = await $.tool.call({ tool: 'Bash', command: 'cat x' })
  expect(text(bash.result)).toContain('DB_PASSWORD=[REDACTED:env-var]')
  expect(text(bash.result)).not.toContain('hunter2')
  expect(text(bash.result)).toContain('APP_NAME=demo')
  expect(toasts[0]).toContain('已遮蔽 1 筆')

  const read = await $.tool.call({ tool: 'Read', file_path: 'x' })
  expect(text(read.result)).not.toContain('hunter2')
})

test('passes clean output through untouched', async ($, on) => {
  stubEngine(on)
  const result = { stdout: 'On branch main\n', stderr: '', interrupted: false }
  on('tool.call', { tool: 'Bash' }, () => ({ result }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'git status' })
  expect(ran.result).toEqual(result)
})

test('passes through unexpected result shapes', async ($, on) => {
  stubEngine(on)
  on('tool.call', { tool: 'Bash' }, () => ({ result: null }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'true' })
  expect(ran.deny).toBeUndefined()
})

test('passes output through when rules cannot be read', async ($, on) => {
  on('fs.read', () => { throw new Error('missing') })
  on('ui.toast', () => ({ value: undefined }))
  const result = { stdout: 'DB_PASSWORD=hunter2\n', stderr: '', interrupted: false }
  on('tool.call', { tool: 'Bash' }, () => ({ result }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'cat x' })
  expect(ran.result).toEqual(result)
})

const attach = { type: 'file', origin: { kind: 'engine' } } as const

test('redacts an @-mentioned file attachment, then toasts the count', async ($, on) => {
  const toasts: string[] = []
  stubEngine(on, toasts)
  on('prompt.attachment', () => ({ text: 'DB_PASSWORD=hunter2\nAPP_NAME=demo\n' }))

  const ran = await $.prompt.attachment({ ...attach, text: 'raw' })
  expect(ran.text).toContain('DB_PASSWORD=[REDACTED:env-var]')
  expect(ran.text).not.toContain('hunter2')
  expect(ran.text).toContain('APP_NAME=demo')
  expect(toasts[0]).toContain('已遮蔽 1 筆')
})

test('passes a clean attachment through untouched', async ($, on) => {
  stubEngine(on)
  on('prompt.attachment', () => ({ text: 'APP_NAME=demo\n' }))
  expect((await $.prompt.attachment({ ...attach, text: 'raw' })).text).toBe('APP_NAME=demo\n')
})

test('leaves a null attachment text null', async ($, on) => {
  stubEngine(on)
  on('prompt.attachment', () => ({ text: null }))
  expect((await $.prompt.attachment({ ...attach, text: 'raw' })).text).toBeNull()
})

test('passes attachment through when rules cannot be read', async ($, on) => {
  on('fs.read', () => { throw new Error('missing') })
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.attachment', () => ({ text: 'DB_PASSWORD=hunter2\n' }))

  expect((await $.prompt.attachment({ ...attach, text: 'raw' })).text).toBe('DB_PASSWORD=hunter2\n')
})

test('accumulates the redacted count in a per-session file for the statusline', async ($, on) => {
  const files: Record<string, string> = {}
  stubEngine(on)
  on('session.id', () => ({ value: 'sess-1' }))
  on('fs.exists', (_$, e) => ({ value: e.path in files }))
  on('fs.write', (_$, e) => { files[e.path] = e.text; return { value: undefined } })
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'DB_PASSWORD=hunter2', stderr: '', interrupted: false } }))

  await $.tool.call({ tool: 'Bash', command: 'cat x' })
  expect(files['/tmp/claude-redactor-sess-1']).toBe('1')
})
