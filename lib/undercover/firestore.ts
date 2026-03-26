import {
  collection,
  doc,
  deleteDoc,
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
import type {
  UndercoverGameData,
  UndercoverParticipant,
  UndercoverPlayer,
  UndercoverRole,
  UndercoverEliminationVote,
} from '@/types/undercover'
import { getRandomWordPair } from './constants'

const COLLECTION_NAME = 'undercover_games'

export async function getUndercoverGame(roomId: string): Promise<UndercoverGameData | null> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) return null
  return snap.data() as UndercoverGameData
}

/**
 * 建立一個新的「誰是臥底」房間大廳
 */
export async function createUndercoverRoom(
  roomId: string,
  host: UndercoverParticipant
): Promise<UndercoverGameData> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const now = new Date()

  const data: UndercoverGameData = {
    room_id: roomId,
    status: 'lobby',
    participants: [host],
    players: [],
    created_at: now,
    updated_at: now,
  }

  await setDoc(gameRef, data)
  return data
}

/**
 * 玩家加入房間大廳
 */
export async function joinUndercoverRoom(
  roomId: string,
  participant: UndercoverParticipant
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as UndercoverGameData
  const existing = data.participants || []

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
export async function leaveUndercoverRoom(roomId: string, participantId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) return

  const data = snap.data() as UndercoverGameData
  const participants = data.participants || []
  const target = participants.find((p) => p.id === participantId)
  if (!target) return

  await updateDoc(gameRef, {
    participants: arrayRemove(target),
    updated_at: new Date(),
  })
}

/**
 * 房主按下「開始遊戲」，系統會：
 * - 從大廳參與者建立玩家列表與座位號
 * - 隨機抽取一組「平民詞 / 臥底詞」
 * - 指定臥底與白板平民人數（其餘為一般平民）
 */
export async function startUndercoverGame(
  roomId: string,
  undercoverCount: number = 1,
  blankCount: number = 0
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as UndercoverGameData

  if (data.status !== 'lobby') {
    throw new Error('遊戲已經開始或已結束')
  }

  const participants = data.participants || []
  const playerCount = participants.length

  if (playerCount < 3) {
    throw new Error('誰是臥底至少需要 3 位玩家')
  }

  const normalizedUndercoverCount = Math.floor(Number.isFinite(undercoverCount) ? undercoverCount : 1)
  const normalizedBlankCount = Math.floor(Number.isFinite(blankCount) ? blankCount : 0)
  const safeUndercoverCount = Math.max(1, Math.min(normalizedUndercoverCount, playerCount - 1))
  const maxBlankCount = Math.max(0, playerCount - safeUndercoverCount - 1)
  const safeBlankCount = Math.max(0, Math.min(normalizedBlankCount, maxBlankCount))
  const shuffled = [...participants].sort(() => Math.random() - 0.5)

  const wordPair = getRandomWordPair()

  // 先決定座位，再隨機抽座位當臥底（避免每局固定「玩家1」是臥底）
  const undercoverSeatSet = new Set<number>()
  while (undercoverSeatSet.size < safeUndercoverCount) {
    const seat = Math.floor(Math.random() * playerCount) + 1
    undercoverSeatSet.add(seat)
  }

  const blankSeatSet = new Set<number>()
  while (blankSeatSet.size < safeBlankCount) {
    const seat = Math.floor(Math.random() * playerCount) + 1
    if (!undercoverSeatSet.has(seat)) {
      blankSeatSet.add(seat)
    }
  }

  const players: UndercoverPlayer[] = shuffled.map((p, idx) => {
    const seat = idx + 1
    let role: UndercoverRole = 'civilian'
    if (undercoverSeatSet.has(seat)) {
      role = 'undercover'
    } else if (blankSeatSet.has(seat)) {
      role = 'blank'
    }
    return {
      seat,
      participantId: p.id,
      name: p.name,
      role,
      alive: true,
    }
  })

  await updateDoc(gameRef, {
    status: 'playing',
    players,
    undercoverCount: safeUndercoverCount,
    blankCount: safeBlankCount,
    words: wordPair,
    currentRound: 1,
    eliminatedSeats: [],
    votes: [],
    winnerRole: null,
    updated_at: new Date(),
  })
}

export async function updateUndercoverGame(
  roomId: string,
  payload: Partial<Omit<UndercoverGameData, 'room_id'>>
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  await updateDoc(gameRef, {
    ...payload,
    updated_at: new Date(),
  })
}

/**
 * 存活玩家投票要淘汰誰（每人一票，可改票；下一輪/淘汰後會清空）
 */
export async function submitUndercoverVote(
  roomId: string,
  voterParticipantId: string,
  targetSeat: number
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'playing') {
    throw new Error('遊戲尚未開始或已結束')
  }

  const players = data.players || []
  const voter = players.find((p) => p.participantId === voterParticipantId)
  if (!voter) {
    throw new Error('找不到對應玩家')
  }
  if (!voter.alive) {
    throw new Error('已被淘汰的玩家不能投票')
  }

  const target = players.find((p) => p.seat === targetSeat)
  if (!target) {
    throw new Error('找不到投票目標')
  }
  if (!target.alive) {
    throw new Error('不能投票淘汰已被淘汰的玩家')
  }
  if (target.seat === voter.seat) {
    throw new Error('不能投票淘汰自己')
  }

  const existingVotes: UndercoverEliminationVote[] = data.votes || []
  const withoutCurrent = existingVotes.filter((v) => v.voterSeat !== voter.seat)
  const nextVotes: UndercoverEliminationVote[] = [...withoutCurrent, { voterSeat: voter.seat, targetSeat }]

  await updateDoc(gameRef, {
    votes: nextVotes,
    updated_at: new Date(),
  })
}

/**
 * 房主在每輪投票後標記淘汰的玩家
 * 同時檢查是否達成勝利條件：
 * - 所有臥底被淘汰 => 平民獲勝
 * - 臥底人數 >= 平民人數 => 臥底獲勝
 */
export async function eliminateUndercoverPlayer(
  roomId: string,
  hostParticipantId: string,
  targetSeat: number
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'playing') {
    throw new Error('遊戲尚未開始或已結束')
  }

  const participants = data.participants || []
  const host = participants.find((p) => p.id === hostParticipantId)
  if (!host || !host.isHost) {
    throw new Error('只有房主可以標記淘汰玩家')
  }

  const players = data.players || []
  const target = players.find((p) => p.seat === targetSeat)
  if (!target) {
    throw new Error('找不到要淘汰的玩家')
  }
  if (!target.alive) {
    throw new Error('該玩家已被淘汰')
  }

  const updatedPlayers = players.map((p) =>
    p.seat === targetSeat
      ? {
          ...p,
          alive: false,
        }
      : p
  )

  const eliminatedSeats = [...(data.eliminatedSeats || []), targetSeat]

  const alive = updatedPlayers.filter((p) => p.alive)
  const aliveUndercover = alive.filter((p) => p.role === 'undercover').length
  const aliveCivilians = alive.filter((p) => p.role === 'civilian' || p.role === 'blank').length

  let nextStatus: UndercoverGameData['status'] = data.status
  let winnerRole: UndercoverGameData['winnerRole'] | null | undefined = data.winnerRole
  const nextRound = (data.currentRound ?? 1) + 1

  if (aliveUndercover === 0) {
    nextStatus = 'finished'
    winnerRole = 'civilian'
  } else if (aliveUndercover >= aliveCivilians) {
    nextStatus = 'finished'
    winnerRole = 'undercover'
  }

  await updateDoc(gameRef, {
    players: updatedPlayers,
    eliminatedSeats,
    status: nextStatus,
    winnerRole: winnerRole ?? null,
    // 淘汰後進入下一輪（純顯示用），並清空本輪投票
    currentRound: nextStatus === 'playing' ? nextRound : data.currentRound ?? 1,
    votes: [],
    updated_at: new Date(),
  })
}

/**
 * 遊戲結束後重置回大廳（保留房主，清空玩家 / 詞彙與淘汰紀錄）
 */
export async function resetUndercoverGameToLobby(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'finished') {
    throw new Error('只有在遊戲結束後才能重新開局')
  }

  await updateDoc(gameRef, {
    status: 'lobby',
    players: [],
    words: null,
    currentRound: null,
    eliminatedSeats: [],
    votes: [],
    winnerRole: null,
    updated_at: new Date(),
  })
}

export function subscribeToUndercoverGame(
  roomId: string,
  callback: (game: UndercoverGameData | null) => void
): Unsubscribe {
  const gameRef = doc(db, COLLECTION_NAME, roomId)

  return onSnapshot(
    gameRef,
    (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UndercoverGameData)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error('Error subscribing to undercover game:', error)
      callback(null)
    }
  )
}

export async function getAllUndercoverRooms(): Promise<UndercoverGameData[]> {
  const gamesRef = collection(db, COLLECTION_NAME)
  const q = query(gamesRef, orderBy('created_at', 'desc'))
  const snap = await getDocs(q)

  return snap.docs.map((docSnap) => ({
    ...(docSnap.data() as Omit<UndercoverGameData, 'room_id'>),
    room_id: docSnap.id,
  })) as UndercoverGameData[]
}

export function subscribeToAllUndercoverRooms(
  callback: (rooms: UndercoverGameData[]) => void
): Unsubscribe {
  const gamesRef = collection(db, COLLECTION_NAME)
  const q = query(gamesRef, orderBy('created_at', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const rooms: UndercoverGameData[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<UndercoverGameData, 'room_id'>),
        room_id: docSnap.id,
      }))
      callback(rooms)
    },
    (error) => {
      console.error('Error subscribing to undercover rooms:', error)
      callback([])
    }
  )
}

export async function deleteUndercoverRoom(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  await deleteDoc(gameRef)
}
