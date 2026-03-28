/** 與 3D 棋子／四角頭像一致的玩家代表色 */
export const PLAYER_COLORS = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24'] as const

export function playerColor(playerId: number): string {
  return PLAYER_COLORS[playerId % PLAYER_COLORS.length]!
}
