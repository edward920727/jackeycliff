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
  UndeadBoard,
  UndeadGuess,
  UndeadGuessSubmission,
} from '@/types/undead-feast'
import {
  UNDEAD_CHARACTER_POOL,
  ALL_UNDEAD_CHALLENGE_KEYS,
  UNDEAD_CHALLENGE_DEFINITIONS,
  pickRandomCharacters,
  pickRandomChallengeKey,
} from './constants'

const COLLECTION_NAME = 'undead_feast_games'

function normalizeSeat(seat: number, playerCount: number): number {
  return ((seat - 1 + playerCount) % playerCount) + 1
}

function getBoardOwnerSeatForHolderSeat(holderSeat: number, round: number, playerCount: number): number {
  return normalizeSeat(holderSeat - (round - 1), playerCount)
}

export async function getUndercoverGame(roomId: string): Promise<UndercoverGameData | null> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) return null
  return snap.data() as UndercoverGameData
}

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
    boards: [],
    round: 1,
    maxRounds: 4,
    currentRoundSubmissions: {},
    candidateCharacters: [],
    guessSubmissions: [],
    restedSeats: [],
    advancedMode: false,
    enabledChallengeKeys: ALL_UNDEAD_CHALLENGE_KEYS,
    currentRoundChallengeKey: null,
    customChallenges: [],
    currentRoundCustomChallengeText: null,
    created_at: now,
    updated_at: now,
  }

  await setDoc(gameRef, data)
  return data
}

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
  if (existing.some((p) => p.id === participant.id)) return

  await updateDoc(gameRef, {
    participants: arrayUnion(participant),
    updated_at: new Date(),
  })
}

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

export async function startUndercoverGame(
  roomId: string,
  advancedMode: boolean = false,
  enabledChallengeKeys?: string[],
  customChallenges?: string[]
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'lobby') throw new Error('遊戲已開始或已結束')

  const participants = data.participants || []
  const playerCount = participants.length
  if (playerCount < 4 || playerCount > 8) {
    throw new Error('亡靈盛宴需要 4 到 8 位玩家')
  }

  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5)
  const players: UndercoverPlayer[] = shuffledParticipants.map((p, idx) => ({
    seat: idx + 1,
    participantId: p.id,
    name: p.name,
  }))

  const characters = pickRandomCharacters(playerCount)
  const boards: UndeadBoard[] = players.map((p, idx) => ({
    ownerSeat: p.seat,
    ownerParticipantId: p.participantId,
    ownerName: p.name,
    character: characters[idx],
    words: [],
  }))

  const normalizedChallengeKeys =
    enabledChallengeKeys && enabledChallengeKeys.length > 0
      ? enabledChallengeKeys.filter((k) => k in UNDEAD_CHALLENGE_DEFINITIONS)
      : ALL_UNDEAD_CHALLENGE_KEYS
  if (advancedMode && normalizedChallengeKeys.length === 0) {
    throw new Error('進階規則至少要啟用 1 張難題牌')
  }
  const normalizedCustomChallenges = Array.from(
    new Set((customChallenges || []).map((c) => c.trim()).filter(Boolean))
  ).slice(0, 20)
  const randomCustomChallenge =
    normalizedCustomChallenges.length > 0
      ? normalizedCustomChallenges[Math.floor(Math.random() * normalizedCustomChallenges.length)]
      : null

  await updateDoc(gameRef, {
    status: 'playing',
    players,
    boards,
    round: 1,
    maxRounds: 4,
    currentRoundSubmissions: {},
    candidateCharacters: [],
    guessSubmissions: [],
    restedSeats: [],
    advancedMode,
    enabledChallengeKeys: normalizedChallengeKeys,
    currentRoundChallengeKey: advancedMode ? pickRandomChallengeKey(normalizedChallengeKeys) : null,
    customChallenges: normalizedCustomChallenges,
    currentRoundCustomChallengeText: advancedMode ? randomCustomChallenge : null,
    updated_at: new Date(),
  })
}

export async function submitUndeadWord(
  roomId: string,
  participantId: string,
  wordRaw: string
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'playing') throw new Error('目前不是傳詞階段')

  const players = data.players || []
  const boards = [...(data.boards || [])]
  const round = data.round || 1
  const maxRounds = data.maxRounds || 4
  const submissions = { ...(data.currentRoundSubmissions || {}) }

  const me = players.find((p) => p.participantId === participantId)
  if (!me) throw new Error('找不到玩家資料')
  if (submissions[String(me.seat)]) throw new Error('你這輪已提交詞彙')

  const word = wordRaw.trim()
  if (!word) throw new Error('請輸入詞彙')
  if (word.includes(' ')) throw new Error('請填寫單一詞語，不要有空白')
  if (UNDEAD_CHARACTER_POOL.includes(word)) {
    throw new Error('不能填寫真實或虛構人物名稱')
  }
  if (data.advancedMode && data.currentRoundChallengeKey) {
    const def =
      UNDEAD_CHALLENGE_DEFINITIONS[
        data.currentRoundChallengeKey as keyof typeof UNDEAD_CHALLENGE_DEFINITIONS
      ]
    if (def && !def.validate(word)) {
      throw new Error(`未符合本輪難題限制：${def.label}`)
    }
  }

  const ownerSeat = getBoardOwnerSeatForHolderSeat(me.seat, round, players.length)
  const boardIdx = boards.findIndex((b) => b.ownerSeat === ownerSeat)
  if (boardIdx < 0) throw new Error('找不到對應骷髏板')

  const board = boards[boardIdx]
  const previousWord = board.words[board.words.length - 1]
  if (previousWord && previousWord === word) {
    throw new Error('不能與上一位玩家使用相同詞語')
  }

  boards[boardIdx] = {
    ...board,
    words: [...board.words, word],
  }

  submissions[String(me.seat)] = word

  const everyoneSubmitted = Object.keys(submissions).length >= players.length
  if (!everyoneSubmitted) {
    await updateDoc(gameRef, {
      boards,
      currentRoundSubmissions: submissions,
      updated_at: new Date(),
    })
    return
  }

  if (round >= maxRounds) {
    const coreCharacters = boards.map((b) => b.character)
    const fillers = pickRandomCharacters(8).filter((name) => !coreCharacters.includes(name))
    const candidateCharacters = [...coreCharacters, ...fillers].slice(0, 8)

    await updateDoc(gameRef, {
      status: 'guessing',
      boards,
      currentRoundSubmissions: {},
      candidateCharacters,
      currentRoundChallengeKey: null,
      currentRoundCustomChallengeText: null,
      updated_at: new Date(),
    })
    return
  }

  const nextCustomChallenge =
    data.advancedMode && (data.customChallenges || []).length > 0
      ? data.customChallenges[Math.floor(Math.random() * data.customChallenges.length)]
      : null
  await updateDoc(gameRef, {
    boards,
    round: round + 1,
    currentRoundSubmissions: {},
    currentRoundChallengeKey: data.advancedMode
      ? pickRandomChallengeKey(data.enabledChallengeKeys)
      : null,
    currentRoundCustomChallengeText: data.advancedMode ? nextCustomChallenge : null,
    updated_at: new Date(),
  })
}

export async function submitUndeadGuesses(
  roomId: string,
  participantId: string,
  guesses: UndeadGuess[]
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')

  const data = snap.data() as UndercoverGameData
  if (data.status !== 'guessing') throw new Error('目前不是猜測階段')

  const players = data.players || []
  const boards = data.boards || []
  const me = players.find((p) => p.participantId === participantId)
  if (!me) throw new Error('找不到玩家資料')
  if (guesses.length !== boards.length) throw new Error('請完成所有骷髏身分猜測')

  const normalizedGuesses: UndeadGuess[] = boards.map((b) => {
    const guess = guesses.find((g) => g.ownerSeat === b.ownerSeat)
    return {
      ownerSeat: b.ownerSeat,
      character: guess?.character?.trim() || '',
    }
  })

  if (normalizedGuesses.some((g) => !g.character)) {
    throw new Error('請完成所有骷髏身分猜測')
  }

  const existing = data.guessSubmissions || []
  const others = existing.filter((s) => s.guesserParticipantId !== participantId)
  const updatedSubmissions: UndeadGuessSubmission[] = [
    ...others,
    { guesserParticipantId: participantId, guesses: normalizedGuesses },
  ]

  const everyoneSubmitted = updatedSubmissions.length >= players.length
  if (!everyoneSubmitted) {
    await updateDoc(gameRef, {
      guessSubmissions: updatedSubmissions,
      updated_at: new Date(),
    })
    return
  }

  const restedSeats = boards
    .filter((b) => {
      const correct = updatedSubmissions.filter((sub) => {
        const myGuess = sub.guesses.find((g) => g.ownerSeat === b.ownerSeat)
        return myGuess?.character === b.character
      }).length
      return correct >= players.length - 1
    })
    .map((b) => b.ownerSeat)

  await updateDoc(gameRef, {
    status: 'finished',
    guessSubmissions: updatedSubmissions,
    restedSeats,
    updated_at: new Date(),
  })
}

export async function resetUndercoverGameToLobby(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) throw new Error('房間不存在')

  await updateDoc(gameRef, {
    status: 'lobby',
    players: [],
    boards: [],
    round: 1,
    maxRounds: 4,
    currentRoundSubmissions: {},
    candidateCharacters: [],
    guessSubmissions: [],
    restedSeats: [],
    advancedMode: false,
    enabledChallengeKeys: ALL_UNDEAD_CHALLENGE_KEYS,
    currentRoundChallengeKey: null,
    customChallenges: [],
    currentRoundCustomChallengeText: null,
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
      if (snapshot.exists()) callback(snapshot.data() as UndercoverGameData)
      else callback(null)
    },
    () => callback(null)
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
    () => callback([])
  )
}

export async function deleteUndercoverRoom(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  await deleteDoc(gameRef)
}

