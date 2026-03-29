import { BOARD } from './board'

export type PropertyGroupKey =
  | 'brown'
  | 'light_blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark_blue'

export const PROPERTY_GROUPS: Record<
  PropertyGroupKey,
  {
    label: string
    color: string
    /** 該色組在 BOARD 內的格子 index（僅 property） */
    indices: number[]
  }
> = {
  brown: { label: '咖啡色組', color: '#a67c52', indices: [] },
  light_blue: { label: '淺藍色組', color: '#38bdf8', indices: [] },
  pink: { label: '粉紅色組', color: '#ec4899', indices: [] },
  orange: { label: '橘色組', color: '#fb923c', indices: [] },
  red: { label: '紅色組', color: '#ef4444', indices: [] },
  yellow: { label: '黃色組', color: '#eab308', indices: [] },
  green: { label: '綠色組', color: '#16a34a', indices: [] },
  dark_blue: { label: '深藍色組', color: '#1d4ed8', indices: [] },
}

// 初始化 indices（不隨機，直接由 board 定義）
for (let i = 0; i < BOARD.length; i++) {
  const c = BOARD[i]!
  if (c.kind !== 'property') continue
  const key = c.group as PropertyGroupKey
  if (PROPERTY_GROUPS[key]) {
    PROPERTY_GROUPS[key].indices.push(i)
  }
}

export function propertyGroupKeys(): PropertyGroupKey[] {
  return Object.keys(PROPERTY_GROUPS) as PropertyGroupKey[]
}

