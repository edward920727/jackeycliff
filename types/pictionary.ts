export type PictionaryStatus = 'lobby' | 'playing' | 'finished'

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
  isRevealed?: boolean
}

export interface PictionaryGameData {
  room_id: string
  status: PictionaryStatus
  participants: PictionaryParticipant[]
  currentRound: PictionaryRound | null
  strokes: DrawStroke[]
  maxRounds: number
  created_at?: any
  updated_at?: any
}

