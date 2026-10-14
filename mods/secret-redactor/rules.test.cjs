const fs = require('fs')
const assert = require('assert')
const rules = require('./rules.json')

const apply = input => {
  let total = 0
  const out = rules.reduce((s, { pattern, flags, replacement }) => {
    const re = new RegExp(pattern, flags)
    total += [...s.matchAll(re)].length
    return s.replace(re, replacement)
  }, input)
  return { out, total }
}

// fixtures live with the talk materials, not in the mod repo (they hold token-shaped fake secrets)
const read = f => fs.readFileSync(`${process.env.HOME}/will/claude-code-mods/demo/${f}`, 'utf8')
const { out, total } = apply(read('test.env'))
assert.strictEqual(out, read('expected.env'))
assert.strictEqual(total, 13)

const caught = [
  'MY_CREDENTIAL=abc123',
  'DB_CREDENTIALS: abc123',
  'GPG_PASSPHRASE=abc123',
  'JWT_SIGNING_KEY=abc123',
  'DATA_ENCRYPTION_KEY="abc123"',
]
for (const line of caught) {
  const r = apply(line)
  assert.strictEqual(r.total, 1, `should redact: ${line}`)
  assert.ok(!r.out.includes('abc123'), `value leaked: ${line}`)
  assert.ok(r.out.includes('[REDACTED:env-var]'), line)
}

const untouched = ['AUTHOR=will', 'SORT_KEY=name', 'MY_LOGIN_CODE=plain', 'APP_NAME=demo-service']
for (const line of untouched) {
  assert.deepStrictEqual(apply(line), { out: line, total: 0 }, `should not touch: ${line}`)
}

console.log(`ok: test.env identical (${total} redactions), ${caught.length} new keywords caught, ${untouched.length} lines untouched`)
