import type { BoardCellDef } from '@/lib/monopoly/types'

/** 格頂「靠內一側」色條 — 經典大富翁：本體淺色，只一邊有顏色 */
export function cellStripColor(cell: BoardCellDef): string {
  if (cell.kind === 'property') {
    const g = cell.group
    const map: Record<string, string> = {
      brown: '#a67c52',
      light_blue: '#38bdf8',
      pink: '#ec4899',
      orange: '#fb923c',
      red: '#ef4444',
      yellow: '#eab308',
    }
    return map[g] ?? '#64748b'
  }
  if (cell.kind === 'railroad') return '#57534e'
  if (cell.kind === 'tax') return '#dc2626'
  if (cell.kind === 'chance') return '#9333ea'
  if (cell.kind === 'chest') return '#14b8a6'
  if (cell.kind === 'goto_jail') return '#1c1917'
  if (cell.kind === 'jail') return '#57534e'
  if (cell.kind === 'parking') return '#22c55e'
  if (cell.kind === 'go') return '#eab308'
  return '#94a3b8'
}

/** 棋盤格心 (world x,z) → 朝向棋盤中心的一邊（頂面色條貼在這一側） */
export type InwardEdge = 'posX' | 'negX' | 'posZ' | 'negZ'

export function inwardEdgeFromBoardPosition(wx: number, wz: number): InwardEdge {
  const vx = -wx
  const vz = -wz
  if (Math.abs(vx) >= Math.abs(vz)) {
    return vx > 0 ? 'posX' : 'negX'
  }
  return vz > 0 ? 'posZ' : 'negZ'
}

/** 舊版 API：僅保留淺色本體（色條請用 cellStripColor） */
export function cellTopSideColors(cell: BoardCellDef): { top: string; side: string } {
  return { top: '#fafafa', side: '#e4e4e7' }
}
