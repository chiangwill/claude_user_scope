import { atom, read, update } from 'claude-code'
import type { Engine, Register } from 'claude-code'

import type { Mode, Style } from '../types'

const mode = atom({ plugin: 'terminal-cat', key: 'mode' } as const, 'idle')
const tick = atom({ plugin: 'terminal-cat', key: 'tick' } as const, 0)
const fullness = atom({ plugin: 'terminal-cat', key: 'fullness' } as const, 80)
const style = atom({ plugin: 'terminal-cat', key: 'style' } as const, 'pixel')

const FRAME_MS = 700
const HAPPY_MS = 4000
const SLEEP_AFTER_MS = 90_000
const HUNGRY_BELOW = 30
const TICKS_PER_FULLNESS = 9

type Face = Mode | 'hungry'

const r = String.raw

// ---------- ascii style ----------

const ART: Record<Face, string[][]> = {
  idle: [
    [r`  /\_/\   `, r` ( o.o )  `, r`  > ^ <   `, r` (_/ \_)~ `],
    [r`  /\_/\   `, r` ( o.o )  `, r`  > ^ <   `, r` (_/ \_)_ `],
    [r`  /\_/\   `, r` ( -.- )  `, r`  > ^ <   `, r` (_/ \_)~ `],
  ],
  working: [
    [r`  /\_/\   `, r` ( o_o )  `, r`  > ^ <   `, r` /|[::  ]|\ `],
    [r`  /\_/\   `, r` ( o_o )  `, r`  > ^ <   `, r` /|[  ::]|\ `],
    [r`  /\_/\   `, r` ( o_o )  `, r`  > ^ <   `, r` /|[ :: ]|\ `],
  ],
  happy: [
    [r`\  /\_/\ /`, r` \( ^w^ )/ `, r`   > ^ <   `, r`  (_/ \_)~ `],
    [r` / /\_/\ \ `, r`  ( ^w^ )  `, r`  \> ^ </  `, r`  (_/ \_)_ `],
  ],
  sleepy: [
    [r`        z  `, r`  /\_/\    `, r` ( -.- )   `, r` (_____)~   `],
    [r`       zZ  `, r`  /\_/\    `, r` ( -.- )   `, r` (_____)_   `],
  ],
  hungry: [
    [r`  /\_/\   `, r` ( ;_; )  `, r`  > ^ <   `, r` (_/ \_)~ `],
    [r`  /\_/\   `, r` ( ;_; )  `, r`  > ^ <   `, r` (_/ \_)_ `],
  ],
}

// ---------- pixel style: ragdoll, 16x14 sprite + 4 columns of tail, two pixel rows per terminal row ----------

const PALETTE: Record<string, string> = {
  K: '#9a8f86', // outline
  B: '#f3e6d3', // cream-point tint: ears, mask, tail
  W: '#fffdf8', // white coat
  S: '#e6dfd3', // coat shading
  L: '#6fa6cc', // blue eye
  l: '#eef6fb', // eye highlight
  P: '#f2a3b3', // nose / tongue
  I: '#f0a8a8', // inner ear
  T: '#bfe0f5', // tear
}

const HEAD = ['..KK........KK..', '.KBBK......KBBK.', '.KBIBKKKKKKBIBK.', '.KBBBBBBBBBBBBK.']
const EYES = {
  open: ['.KBBLLBBBBLLBBK.', '.KWBLlBBBBlLBWK.'],
  closed: ['.KBBBBBBBBBBBBK.', '.KWBKKBBBBKKBWK.'],
  happy: ['.KBBKBBBBBBKBBK.', '.KWKBKBBBBKBKWK.'],
}
const EYE_KIND: Record<Face, keyof typeof EYES> = {
  idle: 'open',
  working: 'open',
  happy: 'happy',
  sleepy: 'closed',
  hungry: 'open',
}
const NOSE = '.KWWBBBPPBBBWWK.'
const NOSE_TEARS = '.KWWTBBPPBBTWWK.'
const MOUTH = '.KWWWWWKKWWWWWK.'
const CHIN = '..KWWWWWWWWWWK..'
const CHIN_TONGUE = '..KWWWWPPWWWWK..'
const BODY = ['..KWWWWWWWWWWK..', '.KWWWSWWWWSWWWK.', '.KWWWWWWWWWWWWK.']
const PAWS = '.KWBBWK..KWBBWK.'
const LIFTED_PAWS = '.KWWWWK..KWWWWK.'
const FEET = '.KKKKKK..KKKKKK.'

// tail rows cover sprite rows 6..13
const TAIL_UP = ['..KK.', '.KBBK', '.KBBK', '.KBBK', 'KBBK.', 'KBK..', 'KBBK.', 'KKK..']
const TAIL_DOWN = ['.....', '.....', '.....', '.....', '.....', '..KK.', '.KBBK', 'KBBK.']

function spriteRows(face: Face, t: number): string[] {
  const blink = face === 'idle' && Math.floor(t / 2) % 7 === 6
  const [eyes1, eyes2] = EYES[blink ? 'closed' : EYE_KIND[face]]
  const typing = face === 'working' && t % 2 === 0
  const fast = face === 'working' || face === 'happy'
  const up = face === 'idle' ? Math.floor(t / 2) % 2 === 0 : fast ? t % 2 === 0 : false
  const tail = up ? TAIL_UP : TAIL_DOWN

  const rows = [
    ...HEAD,
    eyes1,
    eyes2,
    face === 'hungry' ? NOSE_TEARS : NOSE,
    MOUTH,
    face === 'happy' ? CHIN_TONGUE : CHIN,
    ...BODY,
    typing ? LIFTED_PAWS : PAWS,
    FEET,
  ]
  return rows.map((row, y) => row.slice(0, 15) + (tail[y - 6] ?? '.....'))
}

type Cell = { ch: string; fg?: string; bg?: string }

function cellsOf(rows: string[]): Cell[][] {
  const out: Cell[][] = []
  for (let y = 0; y < rows.length; y += 2) {
    const top = rows[y]
    const bottom = rows[y + 1] ?? ''.padEnd(top.length, '.')
    const line: Cell[] = []
    for (let x = 0; x < top.length; x++) {
      const t = PALETTE[top[x]]
      const b = PALETTE[bottom[x]]
      if (t && b) line.push({ ch: '▀', fg: t, bg: b })
      else if (t) line.push({ ch: '▀', fg: t })
      else if (b) line.push({ ch: '▄', fg: b })
      else line.push({ ch: ' ' })
    }
    out.push(line)
  }
  return out
}

// merge neighbouring cells that share a style, so a row is a handful of Text nodes
function runsOf(line: Cell[]): Cell[] {
  const runs: Cell[] = []
  for (const c of line) {
    const last = runs[runs.length - 1]
    if (last && last.fg === c.fg && last.bg === c.bg) last.ch += c.ch
    else runs.push({ ...c })
  }
  return runs
}

const LABEL: Record<Face, string> = {
  idle: 'Mochi · 待機中',
  working: 'Mochi · 陪你寫程式…',
  happy: 'Mochi · 完成啦！♪',
  sleepy: 'Mochi · zZz…',
  hungry: 'Mochi · 肚子餓… /feed',
}

// ---------- state ----------

let lastActive = 0
let happyUntil = 0
let ticks = 0

const setMode = (m: Mode) => (_: Mode) => m

async function wake($: Engine) {
  lastActive = await $.clock.now()
  await update($, mode, setMode('working'))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'feed', description: 'Feed the cat above the prompt' })
    await $.command.register({ name: 'cat', description: 'Switch the cat between pixel and ascii style' })
    lastActive = await $.clock.now()

    $.clock.every(FRAME_MS, async () => {
      const now = await $.clock.now()
      ticks += 1
      await update($, tick, () => ticks)

      const m = await read($, mode)
      if (m === 'happy' && now > happyUntil) await update($, mode, setMode('idle'))
      else if (m === 'idle' && now - lastActive > SLEEP_AFTER_MS) await update($, mode, setMode('sleepy'))

      if (ticks % TICKS_PER_FULLNESS === 0) await update($, fullness, n => Math.max(0, n - 1))
    })

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await wake($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    await wake($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    lastActive = now
    happyUntil = now + HAPPY_MS
    await update($, mode, setMode('happy'))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'feed' }, async $ => {
    const now = await $.clock.now()
    lastActive = now
    happyUntil = now + HAPPY_MS
    await update($, fullness, () => 100)
    await update($, mode, setMode('happy'))
    return { text: 'Nyaa~ 🐟' }
  })

  on('command.run', { command: 'cat' }, async $ => {
    const next: Style = (await read($, style)) === 'pixel' ? 'ascii' : 'pixel'
    await update($, style, () => next)
    return { text: `Cat style: ${next}` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const [m, t, full, st] = await Promise.all([read($, mode), read($, tick), read($, fullness), read($, style)])
    const face: Face = full < HUNGRY_BELOW && (m === 'idle' || m === 'sleepy') ? 'hungry' : m
    const { Box, Text } = $.ui.resolve(e)

    const filled = Math.round(full / 10)
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
    const info = [LABEL[face], `fed ${bar} ${full}%`, '/feed  /cat']

    if (st === 'ascii') {
      const frames = ART[face]
      const rows = frames[Math.floor(t / 2) % frames.length]
      return (
        <Box flexDirection="column">
          {rows.map((row, i) => (
            <Text>
              {row}
              {i < info.length && <Text dimColor>  {info[i]}</Text>}
            </Text>
          ))}
        </Box>
      )
    }

    const lines = cellsOf(spriteRows(face, t))
    return (
      <Box flexDirection="column">
        {lines.map((line, i) => (
          <Text>
            {runsOf(line).map(run => (
              <Text color={run.fg} backgroundColor={run.bg}>{run.ch}</Text>
            ))}
            {i >= 2 && i - 2 < info.length && <Text dimColor>  {info[i - 2]}</Text>}
          </Text>
        ))}
      </Box>
    )
  })
}
