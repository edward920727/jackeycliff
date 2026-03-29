import * as THREE from 'three'

/** 與 3D 棋子／四角頭像一致的玩家代表色 */
export const PLAYER_COLORS = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24'] as const

export function playerColor(playerId: number): string {
  return PLAYER_COLORS[playerId % PLAYER_COLORS.length]!
}

/**
 * 已購買標記用：與格線「組別色條」區隔——內圈為加深後的玩家色，外圈淺邊仿釉邊／框線。
 */
export function ownershipRingColors(playerId: number): { main: string; outline: string } {
  const base = new THREE.Color(playerColor(playerId))
  const main = base.clone().lerp(new THREE.Color(0x172554), 0.28)
  return {
    main: `#${main.getHexString()}`,
    outline: '#fffefb',
  }
}
