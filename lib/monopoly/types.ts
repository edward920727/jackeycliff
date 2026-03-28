export type CellKind =
  | 'go'
  | 'property'
  | 'railroad'
  | 'tax'
  | 'chance'
  | 'chest'
  | 'jail'
  | 'parking'
  | 'goto_jail'

export interface PropertyCell {
  kind: 'property'
  id: string
  name: string
  /** 同色組；同一組全買滿時租金 × MONOPOLY_RENT_MULTIPLIER */
  group: string
  price: number
  baseRent: number
}

export interface RailroadCell {
  kind: 'railroad'
  id: string
  name: string
  price: number
  /** 擁有 1 條 / 2 條鐵路時的租金 */
  rents: [number, number]
}

export interface TaxCell {
  kind: 'tax'
  id: string
  name: string
  amount: number
}

export interface SimpleCell {
  kind: Exclude<CellKind, 'property' | 'railroad' | 'tax'>
  id: string
  name: string
}

export type BoardCellDef = PropertyCell | RailroadCell | TaxCell | SimpleCell

export interface PlayerState {
  id: number
  name: string
  money: number
  position: number
  /** 是否在監獄內（非探視） */
  inJail: boolean
  jailTurns: number
  /** 破產則出局 */
  bankrupt: boolean
}

export interface GameState {
  players: PlayerState[]
  /** 每格地主玩家 id，null 為無人擁有 */
  owners: (number | null)[]
  currentPlayer: number
  /** 等待擲骰 / 移動後結算 / 可購地 / 抽卡顯示 */
  phase: 'roll' | 'buy_prompt' | 'gameover'
  dice: [number, number] | null
  lastMessage: string
  /** 本回合是否雙骰（可再骰一次，簡化為僅記錄） */
  doublesCount: number
  winnerId: number | null
}

export const GO_BONUS = 200
/** 持有該色全部地產時，租金 = baseRent × 此倍率 */
export const MONOPOLY_RENT_MULTIPLIER = 2.5
export const JAIL_POSITION = 9
export const BOARD_LEN = 24
