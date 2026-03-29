import { db } from '@/lib/firebase'
import type { GameAction } from '@/lib/monopoly/engine'
import { createInitialState, gameReducer } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  limit,
} from 'firebase/firestore'

export type MonopolyRoomDoc = {
  roomId: string
  state: GameState
  createdAt: unknown
  updatedAt: unknown
  version: number
}

const COL = 'monopoly_rooms'

export type MonopolyRoomListItem = {
  roomId: string
  updatedAt: unknown
  createdAt: unknown
  version: number
  players: { id: number; name: string; bankrupt: boolean }[]
  phase: GameState['phase']
}

export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return `srv_${Date.now()}`
  const k = 'monopoly_client_id'
  const existing = window.localStorage.getItem(k)
  if (existing) return existing
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(k, id)
  return id
}

export async function ensureMonopolyRoom(roomId: string, names?: string[]): Promise<void> {
  const ref = doc(db, COL, roomId)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  const initialNames = (names && names.length ? names : ['玩家1', '玩家2', '玩家3', '玩家4']).slice(0, 4)
  const state = createInitialState(initialNames)
  const data: MonopolyRoomDoc = {
    roomId,
    state,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1,
  }
  await setDoc(ref, data as unknown as Record<string, unknown>)
}

export function subscribeMonopolyRoom(
  roomId: string,
  onState: (state: GameState) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const ref = doc(db, COL, roomId)
  return onSnapshot(
    ref,
    (snap) => {
      const d = snap.data() as MonopolyRoomDoc | undefined
      if (!d?.state) return
      onState(d.state)
    },
    (err) => onError?.(err),
  )
}

export function subscribeMonopolyRoomsList(
  onRooms: (rooms: MonopolyRoomListItem[]) => void,
  onError?: (err: unknown) => void,
  maxRooms: number = 20,
): Unsubscribe {
  const q = query(collection(db, COL), orderBy('updatedAt', 'desc'), limit(maxRooms))
  return onSnapshot(
    q,
    (snap) => {
      const rooms: MonopolyRoomListItem[] = snap.docs
        .map((d) => d.data() as MonopolyRoomDoc)
        .filter((x) => !!x?.roomId && !!x?.state)
        .map((x) => ({
          roomId: x.roomId,
          updatedAt: x.updatedAt,
          createdAt: x.createdAt,
          version: x.version ?? 0,
          players: (x.state.players ?? []).map((p) => ({ id: p.id, name: p.name, bankrupt: p.bankrupt })),
          phase: x.state.phase,
        }))
      onRooms(rooms)
    },
    (err) => onError?.(err),
  )
}

/**
 * 用 Firestore transaction 序列化 reducer，避免多人同時點擊造成分歧。
 * 注意：為了決定性，ROLL / JAIL_PAY 務必帶 d1/d2（UI 已是預先擲骰）。
 */
export async function submitMonopolyAction(roomId: string, action: GameAction): Promise<void> {
  const ref = doc(db, COL, roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    let cur: MonopolyRoomDoc
    if (!snap.exists()) {
      const state = createInitialState(['玩家1', '玩家2', '玩家3', '玩家4'])
      cur = {
        roomId,
        state,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: 1,
      }
      tx.set(ref, cur as unknown as Record<string, unknown>)
      return
    }
    cur = snap.data() as MonopolyRoomDoc
    const next = gameReducer(cur.state, action)
    tx.update(ref, {
      state: next,
      updatedAt: serverTimestamp(),
      version: (cur.version ?? 1) + 1,
    } as unknown as Record<string, unknown>)
  })
}

