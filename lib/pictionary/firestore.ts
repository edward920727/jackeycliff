import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  DrawStroke,
  PictionaryGameData,
  PictionaryParticipant,
  PictionaryRound,
} from '@/types/pictionary'

const COLLECTION_NAME = 'pictionary_games'

/** 將 Firestore 錯誤轉成使用者可讀訊息（權限、索引等） */
export function formatPictionaryFirestoreError(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: string }).code) : ''
  if (code === 'permission-denied') {
    return 'Firestore 拒絕寫入：請在 Firebase Console → Firestore → 規則 中允許讀寫 `pictionary_games`（專案根目錄有 `firestore.rules` 範例可貼上後發佈）。'
  }
  if (code === 'failed-precondition') {
    return 'Firestore 條件不符（常見為缺少索引）；請看瀏覽器主控台完整錯誤。'
  }
  if (err instanceof Error && err.message) return err.message
  return '連線 Firestore 失敗，請檢查網路與 Firebase 設定。'
}

function sortRoomsByCreatedAtDesc(rooms: PictionaryGameData[]): PictionaryGameData[] {
  return [...rooms].sort((a, b) => {
    const ta = toMillis(a.created_at)
    const tb = toMillis(b.created_at)
    return tb - ta
  })
}

function toMillis(value: unknown): number {
  if (!value) return 0
  const v = value as { toMillis?: () => number; toDate?: () => Date }
  if (typeof v.toMillis === 'function') return v.toMillis()
  if (typeof v.toDate === 'function') return v.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  return new Date(value as string | number).getTime()
}

const WORDS = [
  '貓咪',
  '披薩',
  '火山',
  '摩天輪',
  '太空人',
  '恐龍',
  '雨傘',
  '蛋糕',
  '校車',
  '城堡',
  '吉他',
  '章魚',
]

function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)]
}

function nextDrawer(participants: PictionaryParticipant[], roundNumber: number): PictionaryParticipant {
  const idx = (roundNumber - 1) % participants.length
  return participants[idx]
}

function createRound(participants: PictionaryParticipant[], roundNumber: number): PictionaryRound {
  const drawer = nextDrawer(participants, roundNumber)
  return {
    roundNumber,
    drawerId: drawer.id,
    drawerName: drawer.name,
    word: randomWord(),
    startedAt: new Date(),
    durationSeconds: 60,
    solvedById: null,
    solvedByName: null,
    isRevealed: false,
  }
}

export async function getPictionaryGame(roomId: string): Promise<PictionaryGameData | null> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return snap.data() as PictionaryGameData
}

export async function createPictionaryRoom(
  roomId: string,
  host: Omit<PictionaryParticipant, 'score'>
): Promise<PictionaryGameData> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const now = new Date()
  const data: PictionaryGameData = {
    room_id: roomId,
    status: 'lobby',
    participants: [{ ...host, score: 0 }],
    currentRound: null,
    strokes: [],
    maxRounds: 6,
    created_at: now,
    updated_at: now,
  }
  await setDoc(ref, data)
  return data
}

export async function joinPictionaryRoom(
  roomId: string,
  participant: Omit<PictionaryParticipant, 'score'>
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  if (data.participants.some((p) => p.id === participant.id)) return
  await updateDoc(ref, {
    participants: arrayUnion({ ...participant, score: 0 }),
    updated_at: new Date(),
  })
}

export async function startPictionaryGame(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  if (data.participants.length < 2) throw new Error('至少需要 2 位玩家')

  await updateDoc(ref, {
    status: 'playing',
    participants: data.participants.map((p) => ({ ...p, score: 0 })),
    currentRound: createRound(data.participants, 1),
    strokes: [],
    strokeInProgress: null,
    updated_at: new Date(),
  })
}

/** 作畫中即時同步（他人畫面用）；傳 null 表示提筆或清空進行中筆跡 */
export async function setStrokeInProgress(roomId: string, stroke: DrawStroke | null): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  await updateDoc(ref, {
    strokeInProgress: stroke,
    updated_at: new Date(),
  })
}

/** 提筆後寫入正式筆畫並清除進行中（單次寫入，降低延遲） */
export async function finalizePictionaryStroke(roomId: string, stroke: DrawStroke): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  await updateDoc(ref, {
    strokes: arrayUnion(stroke),
    strokeInProgress: null,
    updated_at: new Date(),
  })
}

export async function clearPictionaryCanvas(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  await updateDoc(ref, {
    strokes: [],
    strokeInProgress: null,
    updated_at: new Date(),
  })
}

export async function revealPictionaryAnswer(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  if (!data.currentRound) return

  await updateDoc(ref, {
    currentRound: {
      ...data.currentRound,
      isRevealed: true,
    },
    updated_at: new Date(),
  })
}

export async function submitPictionaryGuess(
  roomId: string,
  participantId: string,
  guessed: string
): Promise<{ correct: boolean }> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  const round = data.currentRound
  if (!round) return { correct: false }
  if (round.solvedById) return { correct: false }
  if (guessed.trim() !== round.word.trim()) return { correct: false }

  const scorer = data.participants.find((p) => p.id === participantId)
  const updatedParticipants = data.participants.map((p) => {
    if (p.id === participantId || p.id === round.drawerId) {
      return { ...p, score: p.score + 1 }
    }
    return p
  })

  await updateDoc(ref, {
    participants: updatedParticipants,
    currentRound: {
      ...round,
      solvedById: participantId,
      solvedByName: scorer?.name || '玩家',
      isRevealed: true,
    },
    updated_at: new Date(),
  })

  return { correct: true }
}

export async function nextPictionaryRound(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  if (!data.currentRound) return

  const nextRoundNumber = data.currentRound.roundNumber + 1
  if (nextRoundNumber > (data.maxRounds || 6)) {
    await updateDoc(ref, {
      status: 'finished',
      currentRound: {
        ...data.currentRound,
        isRevealed: true,
      },
      strokeInProgress: null,
      updated_at: new Date(),
    })
    return
  }

  await updateDoc(ref, {
    currentRound: createRound(data.participants, nextRoundNumber),
    strokes: [],
    strokeInProgress: null,
    updated_at: new Date(),
  })
}

export async function resetPictionaryToLobby(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData

  await updateDoc(ref, {
    status: 'lobby',
    participants: data.participants.map((p) => ({ ...p, score: 0 })),
    currentRound: null,
    strokes: [],
    strokeInProgress: null,
    updated_at: new Date(),
  })
}

export function subscribeToPictionaryGame(
  roomId: string,
  callback: (game: PictionaryGameData | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const ref = doc(db, COLLECTION_NAME, roomId)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      callback(snap.data() as PictionaryGameData)
    },
    (error) => {
      console.error('subscribeToPictionaryGame', error)
      onError?.(error)
    }
  )
}

export function subscribeToAllPictionaryRooms(
  callback: (rooms: PictionaryGameData[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const ref = collection(db, COLLECTION_NAME)
  return onSnapshot(
    ref,
    (snap) => {
      const rooms = snap.docs.map((d) => ({ ...(d.data() as PictionaryGameData), room_id: d.id }))
      callback(sortRoomsByCreatedAtDesc(rooms))
    },
    (error) => {
      console.error('subscribeToAllPictionaryRooms', error)
      onError?.(error)
      callback([])
    }
  )
}

export async function getAllPictionaryRooms(): Promise<PictionaryGameData[]> {
  const ref = collection(db, COLLECTION_NAME)
  const snap = await getDocs(ref)
  const rooms = snap.docs.map((d) => ({ ...(d.data() as PictionaryGameData), room_id: d.id }))
  return sortRoomsByCreatedAtDesc(rooms)
}

export async function deletePictionaryRoom(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  await deleteDoc(ref)
}

