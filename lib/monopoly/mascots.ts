/**
 * 棋子 glTF 與 UI 標示（順序須與 TokenPawn 的 playerId % 4 一致）
 */
export const PLAYER_MASCOT_ENTRIES = [
  { url: '/monopoly/models/duck.glb' as const, label: '鴨子' },
  { url: '/monopoly/models/rigged-figure.glb' as const, label: '人偶' },
  { url: '/monopoly/models/fish.glb' as const, label: '魚' },
  { url: '/monopoly/models/dragon.glb' as const, label: '龍' },
] as const

export const MODEL_URLS = PLAYER_MASCOT_ENTRIES.map((e) => e.url)

export function mascotLabelForPlayerId(playerId: number): string {
  return PLAYER_MASCOT_ENTRIES[playerId % PLAYER_MASCOT_ENTRIES.length]!.label
}

/** 開局設定等：前 n 位玩家的棋子說明一行 */
export function mascotLegendLine(playerCount: number): string {
  const parts = Array.from({ length: playerCount }, (_, i) => `P${i + 1} ${mascotLabelForPlayerId(i)}`)
  return parts.join(' · ')
}
