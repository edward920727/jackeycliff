export type CardColor = 'red' | 'blue' | 'black' | 'beige'

export interface WordCard {
  word: string
  color: CardColor
  revealed: boolean
}

export interface GameData {
  room_id: string
  words_data: WordCard[]
  current_turn: 'red' | 'blue'
}

export type PlayerRole = 'spymaster' | 'operative'
