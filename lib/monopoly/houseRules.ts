import { BOARD } from './board'
import type { GameState } from './types'
import { PROPERTY_GROUPS, type PropertyGroupKey } from './propertyGroups'

/** 經典大富翁風格：每組蓋房單價 */
export const HOUSE_COST: Record<PropertyGroupKey, number> = {
  brown: 50,
  light_blue: 50,
  pink: 100,
  orange: 100,
  red: 150,
  yellow: 150,
  green: 200,
  dark_blue: 200,
}

function groupIndices(group: string): number[] {
  return PROPERTY_GROUPS[group as PropertyGroupKey]?.indices ?? []
}

export function houseCostForGroup(group: string): number {
  return HOUSE_COST[group as PropertyGroupKey] ?? 50
}

function buildingAt(state: GameState, idx: number): number {
  return state.buildings[idx] ?? 0
}

/** 同色組內所有地產的建物數（0～5，5=旅館） */
export function groupBuildingLevels(state: GameState, group: string): number[] {
  return groupIndices(group).map((i) => buildingAt(state, i))
}

/** 是否已湊齊同色組且皆為本人持有 */
export function playerOwnsMonopoly(state: GameState, playerId: number, group: string): boolean {
  return state.fullSetOwners[group] === playerId
}

/** 可蓋房：須壟斷、資金足、遵守平均與旅館規則 */
export function canBuildHouse(state: GameState, cellIndex: number, playerId: number): boolean {
  const cell = BOARD[cellIndex]
  if (cell.kind !== 'property') return false
  if (state.owners[cellIndex] !== playerId) return false
  if (!playerOwnsMonopoly(state, playerId, cell.group)) return false

  const idxs = groupIndices(cell.group)
  const levels = idxs.map((i) => buildingAt(state, i))
  const h = levels[idxs.indexOf(cellIndex)]!

  if (h >= 5) return false

  const cost = houseCostForGroup(cell.group)
  const p = state.players.find((x) => x.id === playerId)
  if (!p || p.money < cost) return false

  const minH = Math.min(...levels)
  const maxH = Math.max(...levels)

  // 蓋旅館：該格須已有 4 戶，且組內沒有其他格仍低於 4（經典：先蓋滿四戶再升旅館；簡化為「全組皆 4 才可任一格升 5」）
  if (h === 4) {
    const allFour = levels.every((x) => x >= 4)
    return allFour
  }

  // 一般蓋房：只能蓋在「目前戶數最少」的格子上（維持平均）
  return h === minH && maxH - minH <= 1
}

/** 可賣房：從戶數最多者開始退 */
export function canSellHouse(state: GameState, cellIndex: number, playerId: number): boolean {
  const cell = BOARD[cellIndex]
  if (cell.kind !== 'property') return false
  if (state.owners[cellIndex] !== playerId) return false
  if (!playerOwnsMonopoly(state, playerId, cell.group)) return false

  const idxs = groupIndices(cell.group)
  const levels = idxs.map((i) => buildingAt(state, i))
  const h = levels[idxs.indexOf(cellIndex)]!
  if (h === 0) return false

  const maxH = Math.max(...levels)
  const minH = Math.min(...levels)

  // 旅館先退成四戶
  if (h === 5) return h === maxH

  // 一般：只能從戶數最多的格子賣（與蓋房對稱）
  return h === maxH && maxH - minH <= 1
}

export function sellHouseRefund(group: string): number {
  return Math.floor(houseCostForGroup(group) / 2)
}
