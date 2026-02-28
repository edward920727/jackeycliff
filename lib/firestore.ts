import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  Firestore,
  DocumentSnapshot,
  Unsubscribe,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from './firebase'
import { WordCard, Player } from '@/types/game'

export interface GameData {
  room_id: string
  words_data: WordCard[]
  current_turn: 'red' | 'blue'
  players: Player[]
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
      players: [],
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
 * 加入遊戲（添加玩家）
 */
export async function joinGame(
  roomId: string,
  player: Player
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', roomId)
    await updateDoc(gameRef, {
      players: arrayUnion(player),
      updated_at: new Date(),
    })
  } catch (error) {
    console.error('Error joining game:', error)
    throw error
  }
}

/**
 * 離開遊戲（移除玩家）
 */
export async function leaveGame(
  roomId: string,
  playerId: string
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', roomId)
    const gameSnap = await getDoc(gameRef)
    
    if (gameSnap.exists()) {
      const gameData = gameSnap.data() as GameData
      const playerToRemove = gameData.players.find(p => p.id === playerId)
      
      if (playerToRemove) {
        await updateDoc(gameRef, {
          players: arrayRemove(playerToRemove),
          updated_at: new Date(),
        })
      }
    }
  } catch (error) {
    console.error('Error leaving game:', error)
    // 不抛出错误，因为离开时可能已经断开连接
  }
}

/**
 * 更新遊戲數據（帶驗證）
 */
export async function updateGame(
  roomId: string, 
  wordsData: WordCard[], 
  currentTurn: 'red' | 'blue'
): Promise<void> {
  try {
    // 驗證數據完整性
    if (!wordsData || wordsData.length !== 25) {
      throw new Error('卡片數據不完整，必須有 25 張卡片')
    }

    // 驗證每張卡片的結構
    for (const card of wordsData) {
      if (!card.word || !card.color || typeof card.revealed !== 'boolean') {
        throw new Error('卡片數據格式錯誤')
      }
    }

    // 驗證回合值
    if (currentTurn !== 'red' && currentTurn !== 'blue') {
      throw new Error('無效的回合值')
    }

    const gameRef = doc(db, 'games', roomId)
    
    // 使用事務更新（如果 Firestore 支持）
    // 這裡先獲取當前狀態進行驗證
    const currentGame = await getDoc(gameRef)
    if (!currentGame.exists()) {
      throw new Error('遊戲不存在')
    }

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
