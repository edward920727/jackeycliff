export type UndercoverStatus = 'lobby' | 'playing' | 'guessing' | 'finished'

export interface UndercoverParticipant {
  id: string
  name: string
  isHost: boolean
}

export interface UndercoverPlayer {
  seat: number
  participantId: string
  name: string
}

export interface UndeadBoard {
  ownerSeat: number
  ownerParticipantId: string
  ownerName: string
  character: string
  words: string[]
}

export interface UndeadGuess {
  ownerSeat: number
  character: string
}

export interface UndeadGuessSubmission {
  guesserParticipantId: string
  guesses: UndeadGuess[]
}

export interface UndercoverGameData {
  room_id: string
  status: UndercoverStatus
  participants: UndercoverParticipant[]
  players: UndercoverPlayer[]
  boards: UndeadBoard[]
  round: number
  maxRounds: number
  currentRoundSubmissions: Record<string, string>
  candidateCharacters: string[]
  guessSubmissions: UndeadGuessSubmission[]
  restedSeats: number[]
  advancedMode: boolean
  enabledChallengeKeys: string[]
  currentRoundChallengeKey: string | null
  customChallenges: string[]
  currentRoundCustomChallengeText: string | null
  created_at?: any
  updated_at?: any
}

