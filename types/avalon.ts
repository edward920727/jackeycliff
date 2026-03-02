import type { AvalonFaction, AvalonRoleId } from '@/lib/avalon/constants'

export type AvalonStatus = 'lobby' | 'started' | 'finished'

export type AvalonPhase = 'leader_select' | 'team_vote' | 'mission' | 'round_result'

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

export interface AvalonTeamVote {
  seat: number
  approve: boolean
}

export interface AvalonMissionVote {
  seat: number
  success: boolean
}

export interface AvalonMissionResult {
  round: number
  success: boolean
  failCount: number
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
  /** 房主在開始遊戲前選擇要使用的角色（長度需等於玩家人數） */
  selectedRoles?: AvalonRoleId[]

  /** ---- 遊戲進行相關狀態（開始遊戲後） ---- */
  /** 目前是第幾輪任務（1~5） */
  currentRound?: number
  /** 目前這一輪已經到了第幾次提案（1~5） */
  currentProposal?: number
  /** 目前遊戲階段（隊長選人 / 團隊投票 / 任務執行 / 顯示結果） */
  phase?: AvalonPhase
  /** 目前輪到哪個座位當隊長 */
  leaderSeat?: number
  /** 本輪目前隊長提案的出任務成員座位號 */
  proposedTeamSeats?: number[]
  /** 本輪全體投票的結果（每個座位一票） */
  votes?: AvalonTeamVote[]
  /** 本輪任務隊伍成員的投票（成功 / 失敗） */
  missionVotes?: AvalonMissionVote[]
  /** 已完成的任務結果列表，用來顯示進度條 */
  missionResults?: AvalonMissionResult[]
  /** 若遊戲結束，紀錄哪一方獲勝（good / evil） */
  winnerFaction?: AvalonFaction

  created_at?: any
  updated_at?: any
}

