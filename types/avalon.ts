import type { AvalonFaction, AvalonRoleId } from '@/lib/avalon/constants'

export type AvalonStatus = 'lobby' | 'started'

export interface AvalonParticipant {
  /** 用來辨識連線玩家（存在 localStorage） */
  id: string
  name: string
  isHost: boolean
}

export interface AvalonPlayer {
  /** 座位號（1 ~ player_count），用來在 UI 顯示「玩家1、玩家2…」 */
  seat: number
  /** 對應大廳中的參與者 ID（用來讓每個人只看到自己的身分） */
  participantId: string
  name: string
  roleId: AvalonRoleId
  faction: AvalonFaction
}

export interface AvalonGameData {
  /** Firestore document ID，同時作為房間代碼使用 */
  room_id: string
  status: AvalonStatus
  /** 實際分配身分的玩家人數（開始遊戲後才會有意義） */
  player_count: number
  /** 已分配好身分的玩家列表（尚未開始時可以為空陣列） */
  players: AvalonPlayer[]
  /** 正在房間大廳中的玩家（包含房主與一般玩家） */
  participants?: AvalonParticipant[]
  created_at?: any
  updated_at?: any
}

