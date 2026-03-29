import { BOARD_LEN } from './types'
import { boardGrid } from './layout'

/** 單格在世界座標上的間距（與 R3F 場景一致） */
export const TILE_SPACING = 2.35
const COLS = 11
const ROWS = 11

/** 棋盤索引 -> 格心 (x, z)，y 由地形高度決定 */
export function cellIndexToXZ(cellIndex: number): [number, number] | null {
  const grid = boardGrid()
  for (let ri = 0; ri < grid.length; ri++) {
    for (let ci = 0; ci < grid[ri].length; ci++) {
      if (grid[ri][ci] === cellIndex) {
        const x = (ci - (COLS - 1) / 2) * TILE_SPACING
        const z = (ri - (ROWS - 1) / 2) * TILE_SPACING
        return [x, z]
      }
    }
  }
  return null
}

/** 從起點順時針前進到終點所經過的格子索引（含終點） */
export function pathCellIndices(from: number, to: number): number[] {
  if (from === to) return [to]
  const out: number[] = []
  let i = from
  while (i !== to) {
    i = (i + 1) % BOARD_LEN
    out.push(i)
  }
  return out
}

/** 順時針沿路經過的格子序列：含起點、終點（相鄰不重複） */
export function cellsAlongPath(from: number, to: number): number[] {
  if (from === to) return [from]
  return [from, ...pathCellIndices(from, to)]
}

/** 同一格多名玩家時的微小偏移，避免重疊 */
export function tokenSlotOffset(slotIndex: number, total: number): [number, number] {
  if (total <= 1) return [0, 0]
  const angle = (slotIndex / total) * Math.PI * 2
  const r = 0.35
  return [Math.cos(angle) * r, Math.sin(angle) * r]
}
