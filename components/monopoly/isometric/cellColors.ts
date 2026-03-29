import type { BoardCellDef } from '@/lib/monopoly/types'
import { PROPERTY_GROUPS, type PropertyGroupKey } from '@/lib/monopoly/propertyGroups'

/** 格頂「靠內一側」色條 — 經典大富翁：本體淺色，只一邊有顏色 */
export function cellStripColor(cell: BoardCellDef): string {
  // 一律使用 cell.colorGroup（由 board 固定定義，不隨機）
  const cg = cell.colorGroup
  if ((PROPERTY_GROUPS as Record<string, unknown>)[cg]) {
    return PROPERTY_GROUPS[cg as PropertyGroupKey].color
  }
  const map: Record<string, string> = {
    railroad: '#57534e',
    utility: '#0ea5e9',
    tax: '#dc2626',
    chance: '#9333ea',
    chest: '#14b8a6',
    goto_jail: '#1c1917',
    jail: '#57534e',
    parking: '#22c55e',
    go: '#eab308',
  }
  return map[cg] ?? '#94a3b8'
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
