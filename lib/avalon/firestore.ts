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
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  AvalonGameData,
  AvalonParticipant,
  AvalonPlayer,
  AvalonMissionResult,
  AvalonMissionVote,
  AvalonTeamVote,
} from '@/types/avalon'
import { assignRoles, AVALON_ROLES } from './constants'

const COLLECTION_NAME = 'avalon_games'

/** 依照人數與回合數，計算本輪需要幾個人出任務 */
export function getMissionTeamSize(playerCount: number, round: number): number {
  // 標準阿瓦隆規則
  const table: Record<number, number[]> = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
  }
  const arr = table[playerCount] || []
  return arr[round - 1] ?? 0
}

/** 是否為第 4 輪且需要兩張失敗才算任務失敗（7 人以上） */
export function missionNeedsTwoFails(playerCount: number, round: number): boolean {
  return playerCount >= 7 && round === 4
}

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

  const firstLeaderSeat = players[0]?.seat ?? 1

  await updateDoc(gameRef, {
    status: 'started',
    player_count: playerCount,
    players,
    // 初始化回合 / 隊長 / 任務狀態
    currentRound: 1,
    currentProposal: 1,
    phase: 'leader_select',
    leaderSeat: firstLeaderSeat,
    proposedTeamSeats: [],
    votes: [],
    missionVotes: [],
    missionResults: [],
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

/**
 * 由隊長選擇本輪要出任務的成員
 */
export async function selectMissionTeam(
  roomId: string,
  leaderParticipantId: string,
  teamSeats: number[]
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as AvalonGameData
  if (data.status !== 'started') {
    throw new Error('遊戲尚未開始')
  }

  if (data.phase && data.phase !== 'leader_select') {
    throw new Error('目前不是隊長選人階段')
  }

  const players = data.players || []
  const leaderPlayer = players.find((p) => p.participantId === leaderParticipantId)
  if (!leaderPlayer || data.leaderSeat !== leaderPlayer.seat) {
    throw new Error('只有本輪隊長可以選人')
  }

  const round = data.currentRound ?? 1
  const teamSize = getMissionTeamSize(data.player_count, round)
  if (teamSeats.length !== teamSize) {
    throw new Error(`本輪需要選擇 ${teamSize} 人出任務`)
  }

  await updateDoc(gameRef, {
    proposedTeamSeats: teamSeats,
    votes: [],
    phase: 'team_vote',
    updated_at: new Date(),
  })
}

/**
 * 玩家對目前隊長提案的隊伍進行贊成 / 反對投票
 */
export async function submitTeamVote(
  roomId: string,
  voterParticipantId: string,
  approve: boolean
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as AvalonGameData
  if (data.status !== 'started') {
    throw new Error('遊戲尚未開始')
  }
  if (data.phase !== 'team_vote') {
    throw new Error('目前不是全體投票階段')
  }

  const players = data.players || []
  const voter = players.find((p) => p.participantId === voterParticipantId)
  if (!voter) {
    throw new Error('找不到對應玩家')
  }

  const existingVotes: AvalonTeamVote[] = data.votes || []
  const withoutCurrent = existingVotes.filter((v) => v.seat !== voter.seat)
  const newVotes: AvalonTeamVote[] = [...withoutCurrent, { seat: voter.seat, approve }]

  // 若還沒全部投完，單純更新票數即可
  if (newVotes.length < data.player_count) {
    await updateDoc(gameRef, {
      votes: newVotes,
      updated_at: new Date(),
    })
    return
  }

  // 全部投完，結算
  const approveCount = newVotes.filter((v) => v.approve).length
  const majority = Math.floor(data.player_count / 2) + 1

  const currentRound = data.currentRound ?? 1
  const currentProposal = data.currentProposal ?? 1
  const leaderSeat = data.leaderSeat ?? 1

  if (approveCount >= majority) {
    // 通過：進入任務階段
    await updateDoc(gameRef, {
      votes: newVotes,
      phase: 'mission',
      missionVotes: [],
      updated_at: new Date(),
    })
  } else {
    // 否決：換下一個隊長，提案次數 +1
    const nextProposal = currentProposal + 1
    const nextLeaderIndex = players.findIndex((p) => p.seat === leaderSeat) + 1
    const nextLeaderSeat = players[nextLeaderIndex % players.length]?.seat ?? leaderSeat

    await updateDoc(gameRef, {
      votes: newVotes,
      currentProposal: nextProposal,
      leaderSeat: nextLeaderSeat,
      phase: 'leader_select',
      proposedTeamSeats: [],
      updated_at: new Date(),
    })
  }
}

/**
 * 任務隊伍成員投「成功」或「失敗」
 */
export async function submitMissionVote(
  roomId: string,
  voterParticipantId: string,
  success: boolean
): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  const snap = await getDoc(gameRef)
  if (!snap.exists()) {
    throw new Error('房間不存在')
  }

  const data = snap.data() as AvalonGameData
  if (data.status !== 'started') {
    throw new Error('遊戲尚未開始')
  }
  if (data.phase !== 'mission') {
    throw new Error('目前不是任務執行階段')
  }

  const players = data.players || []
  const voter = players.find((p) => p.participantId === voterParticipantId)
  if (!voter) {
    throw new Error('找不到對應玩家')
  }

  const teamSeats = data.proposedTeamSeats || []
  if (!teamSeats.includes(voter.seat)) {
    throw new Error('只有被選上出任務的玩家可以投票')
  }

  const existingVotes: AvalonMissionVote[] = data.missionVotes || []
  const withoutCurrent = existingVotes.filter((v) => v.seat !== voter.seat)
  const newVotes: AvalonMissionVote[] = [...withoutCurrent, { seat: voter.seat, success }]

  // 若還沒全部投完，單純更新票數即可
  if (newVotes.length < teamSeats.length) {
    await updateDoc(gameRef, {
      missionVotes: newVotes,
      updated_at: new Date(),
    })
    return
  }

  // 全部投完，結算本輪任務結果
  const failCount = newVotes.filter((v) => !v.success).length
  const currentRound = data.currentRound ?? 1
  const playerCount = data.player_count

  const needTwoFails = missionNeedsTwoFails(playerCount, currentRound)
  const missionSuccess = needTwoFails ? failCount < 2 : failCount === 0

  const prevResults: AvalonMissionResult[] = data.missionResults || []
  const newResult: AvalonMissionResult = {
    round: currentRound,
    success: missionSuccess,
    failCount,
  }
  const allResults = [...prevResults, newResult]

  const successCount = allResults.filter((r) => r.success).length
  const failMissionCount = allResults.filter((r) => !r.success).length

  let winnerFaction: 'good' | 'evil' | undefined
  if (successCount >= 3) {
    winnerFaction = 'good'
  } else if (failMissionCount >= 3) {
    winnerFaction = 'evil'
  }

  if (winnerFaction) {
    // 遊戲結束
    await updateDoc(gameRef, {
      missionVotes: newVotes,
      missionResults: allResults,
      status: 'finished',
      phase: 'round_result',
      winnerFaction,
      updated_at: new Date(),
    })
  } else {
    // 進入下一輪
    const nextRound = currentRound + 1
    const currentLeaderSeat = data.leaderSeat ?? players[0]?.seat ?? 1
    const currentLeaderIndex = players.findIndex((p) => p.seat === currentLeaderSeat)
    const nextLeaderSeat =
      players[(currentLeaderIndex + 1) % players.length]?.seat ?? currentLeaderSeat

    await updateDoc(gameRef, {
      missionVotes: newVotes,
      missionResults: allResults,
      currentRound: nextRound,
      currentProposal: 1,
      leaderSeat: nextLeaderSeat,
      phase: 'leader_select',
      proposedTeamSeats: [],
      updated_at: new Date(),
    })
  }
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

/**
 * 訂閱所有阿瓦隆房間列表（房間列表頁面使用）
 */
export function subscribeToAllAvalonRooms(
  callback: (rooms: AvalonGameData[]) => void
): Unsubscribe {
  const gamesRef = collection(db, COLLECTION_NAME)
  const q = query(gamesRef, orderBy('created_at', 'desc'))

  return onSnapshot(
    q,
    (snapshot) => {
      const rooms: AvalonGameData[] = snapshot.docs.map((docSnap) => ({
        room_id: docSnap.id,
        ...(docSnap.data() as AvalonGameData),
      }))
      callback(rooms)
    },
    (error) => {
      console.error('Error subscribing to avalon rooms:', error)
      callback([])
    }
  )
}

/**
 * 刪除單一阿瓦隆房間
 */
export async function deleteAvalonRoom(roomId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION_NAME, roomId)
  await deleteDoc(gameRef)
}

