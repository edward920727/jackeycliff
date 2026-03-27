import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { MuffinParticipant, MuffinTimeGameData } from '@/types/muffin-time'
import { getCardDef } from './cards'
import {
  createInitialGameState,
  declareMuffinShout,
  drawTurn,
  participantIdToSeat,
  placeTrap,
  playActionCard,
  playCounterCard,
  resolvePendingDiscard,
  skipTrapPhase,
} from './engine'

const COLLECTION_NAME = 'muffin_time_games'

function cloneGame(game: MuffinTimeGameData): MuffinTimeGameData {
  return JSON.parse(JSON.stringify(game)) as MuffinTimeGameData
}

export async function getMuffinGame(roomId: string): Promise<MuffinTimeGameData | null> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) return null
  return snap.data() as MuffinTimeGameData
}

export async function createMuffinRoom(
  roomId: string,
  host: MuffinParticipant
): Promise<MuffinTimeGameData> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const now = new Date()
  const data: MuffinTimeGameData = {
    room_id: roomId,
    status: 'lobby',
    participants: [host],
    players: [],
    host_participant_id: host.id,
    deck: [],
    discard: [],
    current_seat: 1,
    turn_phase: 'trap',
    log: [],
    hands: {},
    traps: {},
    created_at: now,
    updated_at: now,
  }
  await setDoc(gameRef, data)
  return data
}

export async function joinMuffinRoom(roomId: string, participant: MuffinParticipant): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')

  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'lobby') {
    return
  }
  const existing = data.participants || []
  if (existing.some((p) => p.id === participant.id)) return
  if (existing.length >= 8) throw new Error('房間已滿（最多 8 人）')

  await updateDoc(gameRef, {
    participants: [...existing, participant],
    updated_at: new Date(),
  })
}

export async function startMuffinGame(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')

  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'lobby') throw new Error('遊戲已開始或已結束')

  const participants = data.participants || []
  if (participants.length < 2) throw new Error('至少需要 2 位玩家')

  const next = createInitialGameState(roomId, participants, data.host_participant_id)
  next.updated_at = new Date()

  await setDoc(gameRef, next)
}

export async function muffinPlaceTrap(
  roomId: string,
  participantId: string,
  cardId: string,
  slotIndex: number
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  placeTrap(g, participantId, cardId, slotIndex)
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export async function muffinSkipTrap(roomId: string, participantId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  skipTrapPhase(g, participantId)
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export async function muffinDraw(roomId: string, participantId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  drawTurn(g, participantId)
  // 抽牌本身不應留下任何舊的反擊窗
  if (g.counter_window && g.pending_effect == null) {
    g.counter_window = null
  }
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export async function muffinPlayAction(roomId: string, participantId: string, cardId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  playActionCard(g, participantId, cardId)
  const def = getCardDef(cardId)
  if (def?.kind === 'action') {
    const seat = participantIdToSeat(g, participantId)
    if (seat != null) {
      const nextSeq = (g.last_play_seq ?? 0) + 1
      g.last_play_seq = nextSeq
      g.last_card_play = { cardId, actorSeat: seat, seq: nextSeq }
    }
  }
  // 若產生需要棄牌的效果，開啟 5 秒反擊時間窗
  if (g.pending_effect && g.pending_effect.kind === 'discard') {
    g.counter_window = {
      targetParticipantId: g.pending_effect.targetParticipantId,
      expiresAt: Date.now() + 5000,
    }
  } else {
    g.counter_window = null
  }
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export async function muffinResolveDiscard(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  if (!g.pending_effect) {
    throw new Error('目前沒有需要結算的效果')
  }
  if (!g.counter_window) {
    // 若沒有時間窗，視為已過期或不需反擊，允許直接結算
  } else {
    const now = Date.now()
    if (now < g.counter_window.expiresAt) {
      throw new Error('仍在反擊時間內，暫時無法結算')
    }
  }
  resolvePendingDiscard(g)
  g.counter_window = null
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export async function muffinPlayCounter(
  roomId: string,
  participantId: string,
  cardId: string
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  if (!g.pending_effect) {
    throw new Error('目前沒有可以反擊的效果')
  }
  if (!g.counter_window) {
    throw new Error('反擊時間已經結束')
  }
  const now = Date.now()
  if (g.counter_window.targetParticipantId !== participantId) {
    throw new Error('你不是這次效果的目標')
  }
  if (now > g.counter_window.expiresAt) {
    throw new Error('已超過反擊時間')
  }

  playCounterCard(g, participantId, cardId)
  g.counter_window = null
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export async function muffinDeclare(roomId: string, participantId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as MuffinTimeGameData
  if (data.status !== 'playing') throw new Error('遊戲未進行中')

  const g = cloneGame(data)
  declareMuffinShout(g, participantId)
  g.updated_at = new Date()
  await setDoc(gameRef, g)
}

export function subscribeToMuffinGame(
  roomId: string,
  callback: (game: MuffinTimeGameData | null) => void
): Unsubscribe {
  const gameRef = doc(db, COLLECTION_NAME, roomId)

  return onSnapshot(
    gameRef,
    (snapshot: DocumentSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as MuffinTimeGameData)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error('subscribeToMuffinGame', error)
      callback(null)
    }
  )
}
