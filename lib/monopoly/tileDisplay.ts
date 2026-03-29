import type { BoardCellDef } from './types'

/** 棋盤格 UI：emoji、主標、副標（價格／規則提示） */
export function getTileDisplayInfo(cell: BoardCellDef): {
  emoji: string
  primary: string
  secondary: string
} {
  switch (cell.kind) {
    case 'go':
      return { emoji: '🏁', primary: '起點', secondary: '經過領 $200' }
    case 'property':
      return {
        emoji: '🏠',
        primary: cell.name,
        secondary: `$${cell.price}　租 ${cell.baseRent} 起`,
      }
    case 'railroad':
      return {
        emoji: '🚂',
        primary: cell.name,
        secondary: `$${cell.price}　1～4 條遞增`,
      }
    case 'utility':
      return {
        emoji: '⚡',
        primary: cell.name,
        secondary: `$${cell.price}　骰點 ×4／×10`,
      }
    case 'tax':
      return {
        emoji: '🧾',
        primary: cell.name,
        secondary: `繳 $${cell.amount}`,
      }
    case 'chance':
      return { emoji: '❓', primary: '機會', secondary: '隨機事件' }
    case 'chest':
      return { emoji: '📦', primary: '命運', secondary: '社群基金' }
    case 'jail':
      return { emoji: '🔒', primary: '監獄', secondary: '探視／服刑' }
    case 'parking':
      return { emoji: '🅿️', primary: '免費停車', secondary: '路過休息' }
    case 'goto_jail':
      return { emoji: '👮', primary: '進監獄', secondary: '移送服刑' }
  }
}
