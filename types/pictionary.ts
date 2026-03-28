export type PictionaryStatus = 'lobby' | 'playing' | 'finished'

/** most_points：比完所有回合分數最高；first_to_score：任一玩家先達 targetScore 分即結束 */
export type PictionaryWinMode = 'most_points' | 'first_to_score'

export interface StartPictionaryGameOptions {
  maxRounds: number
  winMode: PictionaryWinMode
  /** 先達幾分（first_to_score 時必填；most_points 可傳任意預設） */
  targetScore: number
  wordBankId: string
  /**
   * wordBankId 為 custom 時：可傳已解析的詞（與 customWordBankText 擇一）。
   * 若兩者皆無有效內容則開始失敗。
   */
  customWords?: string[]
  /** 房主貼上的原文；與 customWords 擇一 */
  customWordBankText?: string
}

export interface PictionaryParticipant {
  id: string
  name: string
  isHost: boolean
  score: number
}

export interface DrawPoint {
  x: number
  y: number
}

export interface DrawStroke {
  points: DrawPoint[]
  color: string
  width: number
}

export interface PictionaryRound {
  roundNumber: number
  drawerId: string
  drawerName: string
  word: string
  startedAt: any
  durationSeconds: number
  solvedById?: string | null
  solvedByName?: string | null
  /** 本回合依序答對的玩家 id（第 1 位分數最高）；舊資料可能僅有 solvedById */
  correctOrderIds?: string[]
  isRevealed?: boolean
}

export interface PictionaryGuessLogEntry {
  id: string
  roundNumber: number
  participantId: string
  name: string
  /** 猜錯時為內容；猜中時不顯示文字 */
  text?: string
  isCorrect: boolean
  /** 猜中時：答對順位與得分（供紀錄顯示） */
  rank?: number
  points?: number
  at?: any
}

export interface PictionaryGameData {
  room_id: string
  status: PictionaryStatus
  participants: PictionaryParticipant[]
  currentRound: PictionaryRound | null
  strokes: DrawStroke[]
  /** 作畫者尚未放開筆時的即時筆跡（節流同步給其他人看） */
  strokeInProgress?: DrawStroke | null
  maxRounds: number
  /** 獲勝方式；未寫入的舊房間視為 most_points */
  winMode?: PictionaryWinMode
  /** 先達幾分結束（僅 first_to_score 時使用） */
  targetScore?: number
  /** 題庫 id（如 general、food、custom） */
  wordBankId?: string
  /** 自訂題庫詞彙（僅 wordBankId === 'custom'） */
  custom_words?: string[]
  /** 本局已出現過的題目（同一局內不重複，題庫用盡後才重複） */
  used_words?: string[]
  /** 本回合猜詞紀錄（猜錯顯示內容；猜中只顯示「猜中」不顯示答案） */
  guess_log?: PictionaryGuessLogEntry[]
  created_at?: any
  updated_at?: any
}

