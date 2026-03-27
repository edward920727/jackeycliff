/**
 * 輕量「落牌」音效（Web Audio，不需額外音檔）。
 */
export function playCardLandSound(): void {
  if (typeof window === 'undefined') return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    const t0 = ctx.currentTime
    osc.frequency.setValueAtTime(220, t0)
    osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.1)
    gain.gain.setValueAtTime(0.12, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.15)
    osc.onended = () => ctx.close().catch(() => {})
  } catch {
    /* 靜音失敗 */
  }
}
