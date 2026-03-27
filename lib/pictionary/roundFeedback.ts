/** 回合換題／結束：音效與偏好（localStorage） */

const STORAGE_KEY = 'pictionary_sound_enabled'

export function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== '0'
}

export function setSoundEnabledStorage(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
}

function resumeIfNeeded(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') return ctx.resume().then(() => undefined)
  return Promise.resolve()
}

/** 短促提示音（換題） */
export function playRoundChangeChime(): void {
  if (typeof window === 'undefined') return
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    const ctx = new Ctor()
    void resumeIfNeeded(ctx).then(() => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.07, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.11)
    })
  } catch {
    // 部分環境不支援或尚未有使用者互動
  }
}

/** 較低音（遊戲結束） */
export function playGameFinishedChime(): void {
  if (typeof window === 'undefined') return
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  try {
    const ctx = new Ctor()
    void resumeIfNeeded(ctx).then(() => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(392, ctx.currentTime)
      gain.gain.setValueAtTime(0.06, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.18)
    })
  } catch {
    // ignore
  }
}
