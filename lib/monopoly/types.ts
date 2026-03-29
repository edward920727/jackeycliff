export type CellKind =
  | 'go'
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'chest'
  | 'jail'
  | 'parking'
  | 'goto_jail'

export interface BaseCell {
  id: string
  name: string
  /**
   * UI 用的色條組別（不隨機，固定由格子定義）。
   * property 通常等於 group；其他格子可用 kind（railroad / utility / chance...）。
   */
  colorGroup: string
}

export interface PropertyCell {
  kind: 'property'
  id: BaseCell['id']
  name: BaseCell['name']
  colorGroup: BaseCell['colorGroup']
  /** 同色組；同一組全買滿時租金 × MONOPOLY_RENT_MULTIPLIER */
  group: string
  price: number
  baseRent: number
  /** 1～4 戶、旅館 共五段租金（有建物時使用，不再套用壟斷倍率） */
  houseRents: [number, number, number, number, number]
}

export interface RailroadCell {
  kind: 'railroad'
  id: BaseCell['id']
  name: BaseCell['name']
  colorGroup: BaseCell['colorGroup']
  price: number
  /** 擁有 1～4 條鐵路時的租金 */
  rents: [number, number, number, number]
}

export interface UtilityCell {
  kind: 'utility'
  id: BaseCell['id']
  name: BaseCell['name']
  colorGroup: BaseCell['colorGroup']
  price: number
}

export interface TaxCell {
  kind: 'tax'
  id: BaseCell['id']
  name: BaseCell['name']
  colorGroup: BaseCell['colorGroup']
  amount: number
}

export interface SimpleCell {
  kind: Exclude<CellKind, 'property' | 'railroad' | 'utility' | 'tax'>
  id: BaseCell['id']
  name: BaseCell['name']
  colorGroup: BaseCell['colorGroup']
}

export type BoardCellDef = PropertyCell | RailroadCell | UtilityCell | TaxCell | SimpleCell

export interface PlayerState {
  id: number
  name: string
  money: number
  position: number
  /** 是否在監獄內（非探視） */
  inJail: boolean
  jailTurns: number
  /** 出獄卡張數（機會/命運） */
  getOutOfJailCards: number
  /** 破產則出局 */
  bankrupt: boolean
}

export interface GameState {
  players: PlayerState[]
  /** 每格地主玩家 id，null 為無人擁有 */
  owners: (number | null)[]
  /** 每格建物：0 無、1～4 戶、5 旅館 */
  buildings: number[]
  /**
   * 已湊齊同色組（property group）的壟斷狀態。
   * key = PropertyCell.group；value = 該組被哪位玩家湊齊（null = 尚未湊齊）
   */
  fullSetOwners: Record<string, number | null>
  /** 剛湊齊同色組時顯示一次 toast（UI 讀取後可 CLEAR） */
  fullSetToast:
    | null
    | {
        id: number
        groupKey: string
        playerId: number
      }
  fullSetToastSeq: number
  /** 付租金跳字特效（一次只顯示一組） */
  moneyFx: null | {
    id: number
    entries: { playerId: number; amount: number }[]
  }
  moneyFxSeq: number
  /** 抽到的機會/命運卡片（UI 彈出顯示）；不阻擋操作，但建議先關掉再繼續 */
  drawnCard:
    | null
    | {
        id: number
        kind: 'chance' | 'chest'
        title: string
        text: string
      }
  drawnCardSeq: number
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
export const MONOPOLY_RENT_MULTIPLIER = 2
/** 監獄／探視（與經典大富翁一樣為第 11 格，0 為起點） */
export const JAIL_POSITION = 10
export const BOARD_LEN = 40
