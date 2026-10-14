export type Mode = 'idle' | 'working' | 'happy' | 'sleepy'
export type Style = 'pixel' | 'ascii'

declare module 'claude-code' {
  interface PluginState {
    'terminal-cat': { mode: Mode; tick: number; fullness: number; style: Style }
  }
}
