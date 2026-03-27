export type MuffinTimeStatus = 'lobby' | 'playing' | 'finished'

export interface MuffinParticipant {
  id: string
  name: string
  isHost: boolean
}

export interface MuffinPlayer {
  seat: number
  participantId: string
  name: string
}

export type MuffinCardKind = 'action' | 'trap' | 'counter'

/** 陷阱觸發時機（簡化版） */
export type MuffinTrapTrigger = 'on_owner_draw' | 'on_any_action' | 'on_owner_hand_7'

export interface MuffinCardDef {
  id: string
  name: string
  kind: MuffinCardKind
  desc: string
  trapTrigger?: MuffinTrapTrigger
  /** 效果鍵，由遊戲端解析 */
  effect: string
}

export type MuffinTurnPhase = 'trap' | 'main'

/** 等待目標玩家打出反擊，或所有人放棄 */
export interface MuffinPendingEffect {
  kind: 'discard'
  targetParticipantId: string
  amount: number
  /** 觸發此效果的行動牌 id（反擊成功時進棄牌堆） */
  sourceActionCardId: string
}

/** 反擊時間窗（例如 5 秒內可反擊） */
export interface MuffinCounterWindow {
  targetParticipantId: string
  /** UNIX timestamp (ms) 截止時間 */
  expiresAt: number
}

export interface MuffinTimeGameData {
  room_id: string
  status: MuffinTimeStatus
  participants: MuffinParticipant[]
  players: MuffinPlayer[]
  /** 開房者 = 先手玩家 */
  host_participant_id: string

  deck: string[]
  discard: string[]
  current_seat: number
  turn_phase: MuffinTurnPhase
  log: string[]

  hands: Record<string, string[]>
  /** 每人最多 3 格陷阱（存卡牌 id） */
  traps: Record<string, [string | null, string | null, string | null]>

  winner_seat?: number | null
  win_reason?: string

  /** 已喊「吸爆鬆餅」並等待自己下回合開始結算 */
  muffin_pending_seat?: number | null
  muffin_declared?: boolean

  /** 手牌剛達 10 張時，須先按鈕宣告 */
  muffin_needs_shout_seat?: number | null

  /**
   * 手牌「第一次」達成 10 張時，獲得宣告資格的座位。
   * 若該座位手牌數再度變成不是 10，視為錯過機會，且不會再被設為 eligible。
   */
  muffin_eligible_seat?: number | null

  /** 已成功喊過吸爆鬆餅的座位（僅一次機會） */
  muffin_shout_used_seat?: number | null

  /** 已永久失去靠 10 張獲勝資格的座位列表（例如沒在 10 張時按） */
  muffin_disabled_seats?: number[]

  /** 被行動指定時，目標可打反擊 */
  pending_effect?: MuffinPendingEffect | null

  /** 反擊時間窗（例如 5 秒內可使用反擊牌），僅在有 pending_effect 時存在 */
  counter_window?: MuffinCounterWindow | null

  /**
   * 最後一次「打出行動牌」的同步事件（供全員桌面動畫）。
   * seq 遞增，前端以 seq 變化觸發動畫。
   */
  last_play_seq?: number
  last_card_play?: {
    cardId: string
    actorSeat: number
    seq: number
  } | null

  created_at?: unknown
  updated_at?: unknown
}
