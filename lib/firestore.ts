import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  Firestore,
  DocumentSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
import { WordCard } from '@/types/game'

export interface GameData {
  room_id: string
  words_data: WordCard[]
  current_turn: 'red' | 'blue'
  created_at?: any
  updated_at?: any
}

/**
 * 獲取遊戲數據
 */
export async function getGame(roomId: string): Promise<GameData | null> {
  try {
    const gameRef = doc(db, 'games', roomId)
    const gameSnap = await getDoc(gameRef)
    
    if (gameSnap.exists()) {
      return gameSnap.data() as GameData
    }
    return null
  } catch (error) {
    console.error('Error getting game:', error)
    throw error
  }
}

/**
 * 創建新遊戲
 */
export async function createGame(roomId: string, wordsData: WordCard[]): Promise<void> {
  try {
    const gameRef = doc(db, 'games', roomId)
    const gameData: GameData = {
      room_id: roomId,
      words_data: wordsData,
      current_turn: 'red',
      created_at: new Date(),
      updated_at: new Date(),
    }
    await setDoc(gameRef, gameData)
  } catch (error) {
    console.error('Error creating game:', error)
    throw error
  }
}

/**
 * 更新遊戲數據
 */
export async function updateGame(
  roomId: string, 
  wordsData: WordCard[], 
  currentTurn: 'red' | 'blue'
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', roomId)
    await updateDoc(gameRef, {
      words_data: wordsData,
      current_turn: currentTurn,
      updated_at: new Date(),
    })
  } catch (error) {
    console.error('Error updating game:', error)
    throw error
  }
}

/**
 * 訂閱遊戲實時更新
 */
export function subscribeToGame(
  roomId: string,
  callback: (gameData: GameData | null) => void
): Unsubscribe {
  const gameRef = doc(db, 'games', roomId)
  
  return onSnapshot(
    gameRef,
    (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as GameData)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error('Error subscribing to game:', error)
      callback(null)
    }
  )
}
