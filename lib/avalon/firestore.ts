import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
  type Unsubscribe,
  getDocs,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { AvalonGameData, AvalonParticipant, AvalonPlayer } from '@/types/avalon'
import { assignRoles, AVALON_ROLES } from './constants'

const COLLECTION_NAME = 'avalon_games'

export async function getAvalonGame(roomId: string): Promise<AvalonGameData | null> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) return null
  return snap.data() as AvalonGameData
}

/**
 * 建立一個新的阿瓦隆房間（大廳），尚未分配身分
 */
export async function createAvalonRoom(
  roomId: string,
  host: AvalonParticipant
): Promise<AvalonGameData> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const now = new Date()

  const data: AvalonGameData = {
    room_id: roomId,
    status: 'lobby',
    player_count: 0,
    players: [],
    participants: [host],
    created_at: now,
    updated_at: now,
  }

  await setDoc(gameRef, data)
  return data
}

/**
 * 玩家加入房間大廳
 */
export async function joinAvalonRoom(
  roomId: string,
  participant: AvalonParticipant
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as AvalonGameData
  const existing = data.participants || []

  // 如果已經在列表中就不重複加入
  if (existing.some((p) => p.id === participant.id)) {
    return
  }

  await updateDoc(gameRef, {
    participants: arrayUnion(participant),
    updated_at: new Date(),
  })
}

/**
 * 玩家離開房間大廳
 */
export async function leaveAvalonRoom(roomId: string, participantId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) return

  const data = snap.data() as AvalonGameData
  const participants = data.participants || []
  const target = participants.find((p) => p.id === participantId)
  if (!target) return

  await updateDoc(gameRef, {
    participants: arrayRemove(target),
    updated_at: new Date(),
  })
}

/**
 * 由房主按下「開始遊戲」時呼叫：
 * - 依照目前大廳中的參與者數量分配身分
 * - 將狀態從 lobby 改為 started
 * - 所有訂閱此房間的玩家可以偵測到狀態變更，進而自動進入遊戲畫面
 */
export async function startAvalonGame(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as AvalonGameData

  if (data.status !== 'lobby') {
    throw new Error('遊戲已經開始或已結束')
  }

  const participants = data.participants || []
  const playerCount = participants.length

  if (playerCount < 5 || playerCount > 10) {
    throw new Error('阿瓦隆目前只支援 5～10 人，請確認大廳中的玩家人數')
  }

  const assigned = assignRoles(playerCount)

  // 依照參與者順序分配座位與身分
  const players: AvalonPlayer[] = assigned.map(({ seat, roleId }, index) => {
    const participant = participants[index]
    return {
      seat,
      participantId: participant?.id || `p_${seat}`,
      name: participant?.name || `玩家 ${seat}`,
      roleId,
      faction: AVALON_ROLES[roleId].faction,
    }
  })

  await updateDoc(gameRef, {
    status: 'started',
    player_count: playerCount,
    players,
    updated_at: new Date(),
  })
}

export async function updateAvalonGame(
  roomId: string,
  payload: Partial<Omit<AvalonGameData, 'room_id'>>
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  await updateDoc(gameRef, {
    ...payload,
    updated_at: new Date(),
  })
}

export function subscribeToAvalonGame(
  roomId: string,
  callback: (game: AvalonGameData | null) => void
): Unsubscribe {
  const gameRef = doc(db, COLLECTION_NAME, roomId)

  return onSnapshot(
    gameRef,
    (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AvalonGameData)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error('Error subscribing to avalon game:', error)
      callback(null)
    }
  )
}

/**
 * （可選）取得所有阿瓦隆房間列表，方便之後做「阿瓦隆房間列表」頁面
 */
export async function getAllAvalonRooms(): Promise<AvalonGameData[]> {
  const gamesRef = collection(db, COLLECTION_NAME)
  const q = query(gamesRef, orderBy('created_at', 'desc'))
  const snap = await getDocs(q)

  return snap.docs.map((docSnap) => ({
    room_id: docSnap.id,
    ...docSnap.data(),
  })) as AvalonGameData[]
}

