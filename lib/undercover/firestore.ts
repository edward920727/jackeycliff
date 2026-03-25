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
 * ?梁?????????賜???迎?制??????乩???
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
 * ???蹎?頛??剜頛?
 */
export async function joinUndercoverRoom(
  roomId: string,
  participant: UndercoverParticipant
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('Room not found')
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
 * ???嚚??頛??剜頛?
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
 * ?頩????????迎???純????蝯???
 * - ?綜竣銋????玲?舫?∴?????萄??冽???
 * - ????鞈???荔???箏??? / ?鈭??堊窖??
 * - ??? 1 ???制?????蝞?????謑?魂??梱走???
 */
export async function startUndercoverGame(roomId: string, undercoverCount: number = 1): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as UndercoverGameData

  if (data.status !== 'lobby') {
    throw new Error('Game already started or finished')
  }

  const participants = data.participants || []
  const playerCount = participants.length

  if (playerCount < 3) {
    throw new Error('Undercover requires at least 3 players')
  }

  const safeUndercoverCount = Math.max(1, Math.min(2, Math.min(undercoverCount, playerCount - 1)))
  const shuffled = [...participants].sort(() => Math.random() - 0.5)

  const wordPair = getRandomWordPair()

  // ???堊城瞍?????玟????????制??頦??伍??蝞???澗???????鈭???
  const undercoverSeatSet = new Set<number>()
  while (undercoverSeatSet.size < safeUndercoverCount) {
    const seat = Math.floor(Math.random() * playerCount) + 1
    undercoverSeatSet.add(seat)
  }

  const players: UndercoverPlayer[] = shuffled.map((p, idx) => {
    const seat = idx + 1
    return {
      seat,
      participantId: p.id,
      name: p.name,
      role: undercoverSeatSet.has(seat) ? 'undercover' : 'civilian',
      alive: true,
    }
  })

  await updateDoc(gameRef, {
    status: 'playing',
    players,
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
 * ?殉朵?????∪楊?秋撮????????剔???∪?????????????朵????敺??
 */
export async function submitUndercoverVote(
  roomId: string,
  voterParticipantId: string,
  targetSeat: number
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'playing') {
    throw new Error('Game not started or already finished')
  }

  const players = data.players || []
  const voter = players.find((p) => p.participantId === voterParticipantId)
  if (!voter) {
    throw new Error('Player not found')
  }
  if (!voter.alive) {
    throw new Error('Eliminated players cannot vote')
  }

  const target = players.find((p) => p.seat === targetSeat)
  if (!target) {
    throw new Error('Vote target not found')
  }
  if (!target.alive) {
    throw new Error('Cannot vote for an eliminated player')
  }
  if (target.seat === voter.seat) {
    throw new Error('Cannot vote for yourself')
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
 * ?頩???????∪?????朵??????
 * ????潘撓貔??秋?????豲???颲???
 * - ????佗?制?斤?謢瑟? => ?????
 * - ?鈭??剔捂??>= ???剔捂??=> ?鈭????
 */
export async function eliminateUndercoverPlayer(
  roomId: string,
  hostParticipantId: string,
  targetSeat: number
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'playing') {
    throw new Error('Game not started or already finished')
  }

  const participants = data.participants || []
  const host = participants.find((p) => p.id === hostParticipantId)
  if (!host || !host.isHost) {
    throw new Error('Only host can eliminate players')
  }

  const players = data.players || []
  const target = players.find((p) => p.seat === targetSeat)
  if (!target) {
    throw new Error('Target player not found')
  }
  if (!target.alive) {
    throw new Error('Target player already eliminated')
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
  const aliveCivilians = alive.filter((p) => p.role === 'civilian').length

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
    // ?朵??壇??????????嚗蝞???????捂謓梢?????
    currentRound: nextStatus === 'playing' ? nextRound : data.currentRound ?? 1,
    votes: [],
    updated_at: new Date(),
  })
}

/**
 * ????荒???綽??菜???剜頛????謕??陷??敺?? / ?堊竣??????????
 */
export async function resetUndercoverGameToLobby(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('Room not found')
  }

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'finished') {
    throw new Error('Can only reset after game has finished')
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

