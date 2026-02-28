import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
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
  used_words?: string[] // 記錄這個房間使用過的所有詞彙
  word_bank_id?: string // 記錄使用的題庫ID
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
export async function createGame(
  roomId: string, 
  wordsData: WordCard[], 
  keepPlayers: boolean = false, 
  swapTeams: boolean = false,
  usedWords?: string[],
  wordBankId?: string
): Promise<void> {
  try {
    const gameRef = doc(db, 'games', roomId)
    
    let existingPlayers: Player[] = []
    let existingUsedWords: string[] = []
    let existingWordBankId: string | undefined = undefined
    
    if (keepPlayers) {
      // 保留現有玩家列表
      const existingGame = await getDoc(gameRef)
      if (existingGame.exists()) {
        const gameData = existingGame.data() as GameData
        existingPlayers = gameData.players || []
        existingUsedWords = gameData.used_words || []
        // 優先使用房間記錄的題庫ID
        existingWordBankId = gameData.word_bank_id || wordBankId
        
        // 如果要求交換隊伍，則交換所有玩家的隊伍
        if (swapTeams) {
          existingPlayers = existingPlayers.map(player => ({
            ...player,
            team: player.team === 'red' ? 'blue' : 'red'
          }))
        }
      }
    }
    
    // 確定最終使用的題庫ID（優先使用傳入的，否則使用現有的）
    const finalWordBankId = wordBankId !== undefined ? wordBankId : existingWordBankId
    
    console.log('createGame - wordBankId:', wordBankId, 'existingWordBankId:', existingWordBankId, 'finalWordBankId:', finalWordBankId, 'keepPlayers:', keepPlayers)
    
    const gameData: GameData = {
      room_id: roomId,
      words_data: wordsData,
      current_turn: 'red',
      players: existingPlayers,
      used_words: usedWords !== undefined ? usedWords : existingUsedWords, // 使用傳入的已使用詞彙列表，或保留現有的
      word_bank_id: finalWordBankId, // 記錄題庫ID
      created_at: new Date(),
      updated_at: new Date(),
    }
    await setDoc(gameRef, gameData)
    
    console.log('遊戲數據已保存 - word_bank_id:', gameData.word_bank_id, 'used_words數量:', (gameData.used_words || []).length)
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
    const gameSnap = await getDoc(gameRef)
    
    if (!gameSnap.exists()) {
      throw new Error('遊戲不存在')
    }

    const gameData = gameSnap.data() as GameData
    const existingPlayers = gameData.players || []

    // 檢查玩家是否已經在遊戲中
    const playerExists = existingPlayers.some(p => p.id === player.id)
    if (playerExists) {
      // 玩家已存在，不重複添加（這是正常的，因為可能因為網絡問題重試）
      return
    }

    // 驗證玩家數據
    if (!player.id || !player.name || !player.team || !player.role) {
      throw new Error('玩家數據不完整')
    }

    // 驗證隊伍值
    if (player.team !== 'red' && player.team !== 'blue') {
      throw new Error('無效的隊伍值')
    }

    // 驗證角色值
    if (player.role !== 'spymaster' && player.role !== 'operative') {
      throw new Error('無效的角色值')
    }

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
  currentTurn: 'red' | 'blue',
  playerId?: string,
  playerRole?: 'spymaster' | 'operative',
  playerTeam?: 'red' | 'blue'
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
    
    // 獲取當前遊戲狀態進行驗證
    const currentGame = await getDoc(gameRef)
    if (!currentGame.exists()) {
      throw new Error('遊戲不存在')
    }

    const gameData = currentGame.data() as GameData

    // 服務器端驗證：驗證玩家身份和權限
    if (playerId && playerRole && playerTeam) {
      // 驗證玩家是否在遊戲中
      const player = gameData.players?.find(p => p.id === playerId)
      if (!player) {
        throw new Error('您不是此遊戲的玩家')
      }

      // 驗證玩家角色：隊長不能點擊卡片
      if (playerRole === 'spymaster') {
        throw new Error('隊長不能點擊卡片')
      }

      // 驗證玩家隊伍是否匹配
      if (player.team !== playerTeam) {
        throw new Error('玩家隊伍信息不匹配')
      }

      // 驗證回合：只有當前回合的隊伍才能操作
      if (gameData.current_turn !== playerTeam) {
        throw new Error(`現在是${gameData.current_turn === 'red' ? '紅' : '藍'}隊的回合`)
      }

      // 驗證回合變更是否合理
      const previousTurn = gameData.current_turn
      if (currentTurn !== previousTurn && currentTurn !== (previousTurn === 'red' ? 'blue' : 'red')) {
        throw new Error('無效的回合變更')
      }
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

/**
 * 獲取所有房間列表
 */
export async function getAllRooms(): Promise<GameData[]> {
  try {
    const gamesRef = collection(db, 'games')
    const q = query(gamesRef, orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      room_id: doc.id, // 使用 document ID 作為 room_id
      ...doc.data()
    } as GameData))
  } catch (error) {
    console.error('Error getting all rooms:', error)
    throw error
  }
}

/**
 * 訂閱所有房間的實時更新
 */
export function subscribeToAllRooms(
  callback: (rooms: GameData[]) => void
): Unsubscribe {
  const gamesRef = collection(db, 'games')
  const q = query(gamesRef, orderBy('created_at', 'desc'))
  
  return onSnapshot(
    q,
    (querySnapshot) => {
      const rooms = querySnapshot.docs.map(doc => ({
        room_id: doc.id, // 使用 document ID 作為 room_id
        ...doc.data()
      } as GameData))
      callback(rooms)
    },
    (error) => {
      console.error('Error subscribing to all rooms:', error)
      callback([])
    }
  )
}

/**
 * 刪除所有房間
 */
export async function deleteAllRooms(): Promise<void> {
  try {
    const gamesRef = collection(db, 'games')
    const querySnapshot = await getDocs(gamesRef)
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Error deleting all rooms:', error)
    throw error
  }
}
