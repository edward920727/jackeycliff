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

  /** 被行動指定時，目標可打反擊 */
  pending_effect?: MuffinPendingEffect | null

  created_at?: unknown
  updated_at?: unknown
}
