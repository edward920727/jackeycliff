export type UndercoverStatus = 'lobby' | 'playing' | 'finished'

export type UndercoverRole = 'civilian' | 'undercover' | 'blank'

export interface UndercoverParticipant {
  /** 用來辨識連線玩家（存在 localStorage） */
  id: string
  name: string
  isHost: boolean
}

export interface UndercoverPlayer {
  /** 座位號（1 ~ player_count），用來在 UI 顯示「玩家1、玩家2…」 */
  seat: number
  /** 對應大廳中的參與者 ID（用來讓每個人只看到自己的身分） */
  participantId: string
  name: string
  role: UndercoverRole
  alive: boolean
}

export interface UndercoverEliminationVote {
  /** 投票者座位 */
  voterSeat: number
  /** 被投票淘汰的目標座位 */
  targetSeat: number
}

export interface UndercoverWords {
  civilian: string
  undercover: string
}

export interface UndercoverGameData {
  /** Firestore document ID，同時作為房間代碼使用 */
  room_id: string
  status: UndercoverStatus

  /** 大廳中的參與者列表（包含房主與一般玩家） */
  participants: UndercoverParticipant[]

  /** 開局後分配好身分與座位的玩家列表 */
  players: UndercoverPlayer[]

  /** 房主設定：臥底人數 */
  undercoverCount?: number

  /** 房主設定：白板平民人數 */
  blankCount?: number

  /** 本局使用的詞彙（平民詞 / 臥底詞） */
  words?: UndercoverWords

  /** 目前是第幾輪描述 / 投票（純顯示用，不強制規則） */
  currentRound?: number

  /** 被淘汰的座位號列表（方便顯示排序） */
  eliminatedSeats?: number[]

  /** 本輪投票淘汰的票（存活玩家每人一票；下一輪/淘汰後會清空） */
  votes?: UndercoverEliminationVote[]

  /** 若遊戲結束，記錄最後獲勝方（'civilian' | 'undercover'） */
  winnerRole?: Extract<UndercoverRole, 'civilian' | 'undercover'>

  created_at?: any
  updated_at?: any
}

