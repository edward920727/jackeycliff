export type CardColor = 'red' | 'blue' | 'black' | 'beige'

export interface WordCard {
  word: string
  color: CardColor
  revealed: boolean
}

export interface Player {
  id: string
  name: string
  team: 'red' | 'blue'
  role: 'spymaster' | 'operative'
  joined_at: Date
}

export interface GameData {
  room_id: string
  words_data: WordCard[]
  current_turn: 'red' | 'blue'
  players: Player[]
  created_at?: any
  updated_at?: any
}

export type PlayerRole = 'spymaster' | 'operative'
