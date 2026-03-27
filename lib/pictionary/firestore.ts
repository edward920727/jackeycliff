import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
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
  PictionaryGuessLogEntry,
  PictionaryParticipant,
  PictionaryRound,
  StartPictionaryGameOptions,
} from '@/types/pictionary'
import {
  DEFAULT_WORD_BANK_ID,
  isValidWordBankId,
  pickWordExcluding,
} from '@/lib/pictionary/wordBanks'

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

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function nextDrawer(participants: PictionaryParticipant[], roundNumber: number): PictionaryParticipant {
  const idx = (roundNumber - 1) % participants.length
  return participants[idx]
}

function newGuessLogId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** 第 1 位答對分數最高，之後遞減；作畫者與答對者同額加分 */
const POINTS_BY_CORRECT_ORDER = [5, 4, 3, 2, 1]

export function pointsForCorrectOrder(rank: number): number {
  if (rank < 1) return 1
  return POINTS_BY_CORRECT_ORDER[rank - 1] ?? 1
}

function existingCorrectOrderIds(round: PictionaryRound): string[] {
  if (round.correctOrderIds?.length) return round.correctOrderIds
  if (round.solvedById) return [round.solvedById]
  return []
}

function createRound(
  participants: PictionaryParticipant[],
  roundNumber: number,
  word: string
): PictionaryRound {
  const drawer = nextDrawer(participants, roundNumber)
  return {
    roundNumber,
    drawerId: drawer.id,
    drawerName: drawer.name,
    word,
    startedAt: new Date(),
    durationSeconds: 60,
    solvedById: null,
    solvedByName: null,
    correctOrderIds: [],
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

export async function startPictionaryGame(
  roomId: string,
  options: StartPictionaryGameOptions
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  if (data.participants.length < 2) throw new Error('至少需要 2 位玩家')

  const maxRounds = clamp(options.maxRounds, 1, 30)
  const winMode = options.winMode
  const targetScore = clamp(options.targetScore, 1, 99)
  const wordBankId = isValidWordBankId(options.wordBankId) ? options.wordBankId : DEFAULT_WORD_BANK_ID

  const used: string[] = []
  const word1 = pickWordExcluding(used, wordBankId)

  await updateDoc(ref, {
    status: 'playing',
    maxRounds,
    winMode,
    targetScore,
    wordBankId,
    participants: data.participants.map((p) => ({ ...p, score: 0 })),
    currentRound: createRound(data.participants, 1, word1),
    used_words: [word1],
    strokes: [],
    strokeInProgress: null,
    guess_log: [],
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
): Promise<{ correct: boolean; rank?: number; points?: number }> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  const round = data.currentRound
  if (!round) return { correct: false }
  if (participantId === round.drawerId) return { correct: false }

  const priorOrder = existingCorrectOrderIds(round)
  if (priorOrder.includes(participantId)) return { correct: false }

  const trimmed = guessed.trim()
  const participantName = data.participants.find((p) => p.id === participantId)?.name || '玩家'

  if (trimmed !== round.word.trim()) {
    const wrong: PictionaryGuessLogEntry = {
      id: newGuessLogId(),
      roundNumber: round.roundNumber,
      participantId,
      name: participantName,
      text: trimmed,
      isCorrect: false,
      at: new Date(),
    }
    await updateDoc(ref, {
      guess_log: arrayUnion(wrong),
      updated_at: new Date(),
    })
    return { correct: false }
  }

  const scorer = data.participants.find((p) => p.id === participantId)
  const rank = priorOrder.length + 1
  const pts = pointsForCorrectOrder(rank)

  const updatedParticipants = data.participants.map((p) => {
    if (p.id === participantId || p.id === round.drawerId) {
      return { ...p, score: p.score + pts }
    }
    return p
  })

  const winMode = data.winMode ?? 'most_points'
  const targetScore = data.targetScore ?? 5
  let nextStatus = data.status
  if (winMode === 'first_to_score') {
    const maxScore = Math.max(0, ...updatedParticipants.map((p) => p.score))
    if (maxScore >= targetScore) {
      nextStatus = 'finished'
    }
  }

  const newOrder = [...priorOrder, participantId]

  const correct: PictionaryGuessLogEntry = {
    id: newGuessLogId(),
    roundNumber: round.roundNumber,
    participantId,
    name: participantName,
    isCorrect: true,
    rank,
    points: pts,
    at: new Date(),
  }

  await updateDoc(ref, {
    participants: updatedParticipants,
    currentRound: {
      ...round,
      correctOrderIds: newOrder,
      solvedById: round.solvedById ?? participantId,
      solvedByName: round.solvedByName ?? scorer?.name ?? '玩家',
      isRevealed: false,
    },
    guess_log: arrayUnion(correct),
    status: nextStatus,
    updated_at: new Date(),
  })

  return { correct: true, rank, points: pts }
}

export async function nextPictionaryRound(roomId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('房間不存在')
  const data = snap.data() as PictionaryGameData
  if (data.status === 'finished') return
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

  const usedArr = [...(data.used_words || [])]
  if (data.currentRound?.word && !usedArr.includes(data.currentRound.word)) {
    usedArr.push(data.currentRound.word)
  }
  const bankId = data.wordBankId ?? DEFAULT_WORD_BANK_ID
  const nextWord = pickWordExcluding(usedArr, bankId)

  await updateDoc(ref, {
    currentRound: createRound(data.participants, nextRoundNumber, nextWord),
    used_words: [...usedArr, nextWord],
    strokes: [],
    strokeInProgress: null,
    guess_log: [],
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
    used_words: [],
    guess_log: [],
    winMode: deleteField(),
    targetScore: deleteField(),
    wordBankId: deleteField(),
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

