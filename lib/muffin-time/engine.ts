import type { MuffinTimeGameData, MuffinPendingEffect } from '@/types/muffin-time'
import { buildMuffinDeck, getCardDef } from './cards'

const MAX_TRAPS = 3
const MUFFIN_WIN_COUNT = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sortedPlayersBySeat(game: MuffinTimeGameData) {
  return [...(game.players || [])].sort((a, b) => a.seat - b.seat)
}

export function seatToParticipantId(game: MuffinTimeGameData, seat: number): string | undefined {
  return game.players?.find((p) => p.seat === seat)?.participantId
}

export function participantIdToSeat(game: MuffinTimeGameData, pid: string): number | undefined {
  return game.players?.find((p) => p.participantId === pid)?.seat
}

export function nextSeat(game: MuffinTimeGameData, seat: number): number {
  const sorted = sortedPlayersBySeat(game)
  if (sorted.length === 0) return seat
  const idx = sorted.findIndex((p) => p.seat === seat)
  const next = sorted[(idx + 1) % sorted.length]
  return next.seat
}

function pushLog(game: MuffinTimeGameData, line: string) {
  const log = [...(game.log || [])]
  log.push(line)
  if (log.length > 80) log.splice(0, log.length - 80)
  game.log = log
}

function removeCardFromHand(game: MuffinTimeGameData, pid: string, cardId: string): boolean {
  const h = [...(game.hands[pid] || [])]
  const i = h.indexOf(cardId)
  if (i === -1) return false
  h.splice(i, 1)
  game.hands[pid] = h
  return true
}

function addToHand(game: MuffinTimeGameData, pid: string, cardId: string) {
  const h = [...(game.hands[pid] || [])]
  h.push(cardId)
  game.hands[pid] = h
}

function drawOne(game: MuffinTimeGameData): string | null {
  if (!game.deck.length) {
    if (game.discard.length) {
      const top = game.discard[game.discard.length - 1]
      const rest = game.discard.slice(0, -1)
      game.deck = shuffle(rest)
      game.discard = top ? [top] : []
    }
  }
  if (!game.deck.length) return null
  const id = game.deck.pop()!
  return id
}

function discardPileAdd(game: MuffinTimeGameData, cardId: string) {
  game.discard = [...(game.discard || []), cardId]
}

function randomRemoveHand(game: MuffinTimeGameData, pid: string): string | null {
  const h = game.hands[pid] || []
  if (!h.length) return null
  const idx = Math.floor(Math.random() * h.length)
  const [card] = h.splice(idx, 1)
  game.hands[pid] = h
  return card
}

function randomRemoveHandMany(game: MuffinTimeGameData, pid: string, n: number): string[] {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const c = randomRemoveHand(game, pid)
    if (c) {
      out.push(c)
      discardPileAdd(game, c)
    }
  }
  return out
}

/** 回合開始時檢查吸爆鬆餅勝利 */
export function checkMuffinWinAtTurnStart(game: MuffinTimeGameData, currentSeat: number): boolean {
  const pending = game.muffin_pending_seat
  const declared = game.muffin_declared
  if (pending == null || !declared) return false
  if (pending !== currentSeat) return false
  const pid = seatToParticipantId(game, currentSeat)
  if (!pid) return false
  const n = (game.hands[pid] || []).length
  if (n === MUFFIN_WIN_COUNT) {
    game.winner_seat = currentSeat
    game.win_reason = 'muffin'
    game.status = 'finished'
    pushLog(game, `玩家 ${game.players.find((p) => p.seat === currentSeat)?.name} 在下回合開始時仍持有 10 張牌，吸爆鬆餅獲勝！`)
    return true
  }
  game.muffin_pending_seat = null
  game.muffin_declared = false
  pushLog(game, '吸爆鬆餅宣告失效（手牌已非 10 張）。')
  return false
}

function maybeSetMuffinShout(game: MuffinTimeGameData, seat: number) {
  const pid = seatToParticipantId(game, seat)
  if (!pid) return
  if ((game.hands[pid] || []).length === MUFFIN_WIN_COUNT) {
    game.muffin_needs_shout_seat = seat
  }
}

function clearMuffinShoutIfNotTen(game: MuffinTimeGameData, seat: number) {
  const pid = seatToParticipantId(game, seat)
  if (!pid) return
  if ((game.hands[pid] || []).length !== MUFFIN_WIN_COUNT) {
    if (game.muffin_needs_shout_seat === seat) game.muffin_needs_shout_seat = null
  }
}

function advanceTurn(game: MuffinTimeGameData) {
  game.current_seat = nextSeat(game, game.current_seat)
  game.turn_phase = 'trap'
  game.pending_effect = null
  checkMuffinWinAtTurnStart(game, game.current_seat)
}

function triggerTrapsAfterDraw(game: MuffinTimeGameData, drawerPid: string) {
  const drawerSeat = participantIdToSeat(game, drawerPid)
  if (drawerSeat == null) return

  for (const p of game.players || []) {
    const traps = game.traps[p.participantId] || [null, null, null]
    for (let s = 0; s < MAX_TRAPS; s++) {
      const tid = traps[s]
      if (!tid) continue
      const def = getCardDef(tid)
      if (!def || def.kind !== 'trap') continue
      if (def.trapTrigger !== 'on_owner_draw') continue
      if (p.participantId !== drawerPid) continue

      pushLog(game, `陷阱「${def.name}」觸發！`)
      traps[s] = null
      game.traps[p.participantId] = [traps[0], traps[1], traps[2]] as [
        string | null,
        string | null,
        string | null,
      ]
      discardPileAdd(game, tid)
      applyTrapEffect(game, def.effect, p.participantId)
      maybeSetMuffinShout(game, drawerSeat)
      clearMuffinShoutIfNotTen(game, drawerSeat)
    }
  }
}

function triggerTrapsHand7(game: MuffinTimeGameData) {
  for (const p of game.players || []) {
    const n = (game.hands[p.participantId] || []).length
    if (n < 7) continue
    const traps = [...(game.traps[p.participantId] || [null, null, null])] as [
      string | null,
      string | null,
      string | null,
    ]
    for (let s = 0; s < MAX_TRAPS; s++) {
      const tid = traps[s]
      if (!tid) continue
      const def = getCardDef(tid)
      if (!def || def.kind !== 'trap') continue
      if (def.trapTrigger !== 'on_owner_hand_7') continue

      pushLog(game, `陷阱「${def.name}」觸發！`)
      traps[s] = null
      game.traps[p.participantId] = traps
      discardPileAdd(game, tid)
      applyTrapEffect(game, def.effect, p.participantId)
      maybeSetMuffinShout(game, p.seat)
      clearMuffinShoutIfNotTen(game, p.seat)
    }
  }
}

function triggerTrapsAnyAction(game: MuffinTimeGameData, actorPid: string) {
  for (const p of game.players || []) {
    const traps = [...(game.traps[p.participantId] || [null, null, null])] as [
      string | null,
      string | null,
      string | null,
    ]
    for (let s = 0; s < MAX_TRAPS; s++) {
      const tid = traps[s]
      if (!tid) continue
      const def = getCardDef(tid)
      if (!def || def.kind !== 'trap') continue
      if (def.trapTrigger !== 'on_any_action') continue

      pushLog(game, `陷阱「${def.name}」觸發！`)
      traps[s] = null
      game.traps[p.participantId] = traps
      discardPileAdd(game, tid)
      for (const pl of game.players || []) {
        const d = drawOne(game)
        if (d) addToHand(game, pl.participantId, d)
        maybeSetMuffinShout(game, pl.seat)
        clearMuffinShoutIfNotTen(game, pl.seat)
      }
    }
  }
}

function applyTrapEffect(game: MuffinTimeGameData, effect: string, ownerPid: string) {
  const ownerSeat = participantIdToSeat(game, ownerPid)!
  switch (effect) {
    case 'trap_draw_1': {
      const c = drawOne(game)
      if (c) addToHand(game, ownerPid, c)
      maybeSetMuffinShout(game, ownerSeat)
      break
    }
    case 'trap_draw_2': {
      for (let i = 0; i < 2; i++) {
        const c = drawOne(game)
        if (c) addToHand(game, ownerPid, c)
      }
      maybeSetMuffinShout(game, ownerSeat)
      break
    }
    case 'trap_all_draw_1':
      for (const pl of game.players || []) {
        const c = drawOne(game)
        if (c) addToHand(game, pl.participantId, c)
        maybeSetMuffinShout(game, pl.seat)
      }
      break
    case 'trap_self_discard_1_random': {
      const c = randomRemoveHand(game, ownerPid)
      if (c) discardPileAdd(game, c)
      clearMuffinShoutIfNotTen(game, ownerSeat)
      break
    }
    default:
      break
  }
}

export function createInitialGameState(
  roomId: string,
  participants: MuffinTimeGameData['participants'],
  hostId: string
): MuffinTimeGameData {
  const shuffled = shuffle(participants)
  const players = shuffled.map((p, i) => ({
    seat: i + 1,
    participantId: p.id,
    name: p.name,
  }))

  const deck = buildMuffinDeck()
  const hands: Record<string, string[]> = {}
  const traps: Record<string, [string | null, string | null, string | null]> = {}

  for (const pl of players) {
    hands[pl.participantId] = []
    traps[pl.participantId] = [null, null, null]
  }

  for (let i = 0; i < 3; i++) {
    for (const pl of players) {
      const c = deck.pop()
      if (c) hands[pl.participantId].push(c)
    }
  }

  const hostPlayer = players.find((p) => p.participantId === hostId)
  const startSeat = hostPlayer?.seat ?? 1

  return {
    room_id: roomId,
    status: 'playing',
    participants,
    players,
    host_participant_id: hostId,
    deck,
    discard: [],
    current_seat: startSeat,
    turn_phase: 'trap',
    log: [`遊戲開始！由 ${hostPlayer?.name ?? '房主'} 先手。`],
    hands,
    traps,
    muffin_pending_seat: null,
    muffin_declared: false,
    muffin_needs_shout_seat: null,
    pending_effect: null,
    created_at: new Date(),
    updated_at: new Date(),
  }
}

export function assertCurrentPlayer(game: MuffinTimeGameData, pid: string) {
  const seat = participantIdToSeat(game, pid)
  if (seat !== game.current_seat) throw new Error('不是你的回合')
}

export function placeTrap(
  game: MuffinTimeGameData,
  pid: string,
  cardId: string,
  slotIndex: number
): MuffinTimeGameData {
  assertCurrentPlayer(game, pid)
  if (game.turn_phase !== 'trap') throw new Error('目前不能放置陷阱')
  if (slotIndex < 0 || slotIndex >= MAX_TRAPS) throw new Error('無效的陷阱格')
  const def = getCardDef(cardId)
  if (!def || def.kind !== 'trap') throw new Error('這不是陷阱牌')
  if (!removeCardFromHand(game, pid, cardId)) throw new Error('你沒有這張牌')

  const row = [...(game.traps[pid] || [null, null, null])] as [
    string | null,
    string | null,
    string | null,
  ]
  if (row[slotIndex]) discardPileAdd(game, row[slotIndex]!)
  row[slotIndex] = cardId
  game.traps[pid] = row
  pushLog(game, `${game.players.find((p) => p.participantId === pid)?.name} 放置了陷阱。`)
  return game
}

export function skipTrapPhase(game: MuffinTimeGameData, pid: string): MuffinTimeGameData {
  assertCurrentPlayer(game, pid)
  if (game.turn_phase !== 'trap') throw new Error('目前不是陷阱階段')
  game.turn_phase = 'main'
  return game
}

export function drawTurn(game: MuffinTimeGameData, pid: string): MuffinTimeGameData {
  assertCurrentPlayer(game, pid)
  if (game.turn_phase !== 'main') throw new Error('請先結束陷阱階段')
  if (game.pending_effect) throw new Error('請先處理反擊效果')

  const c = drawOne(game)
  if (!c) throw new Error('牌庫已空')
  addToHand(game, pid, c)
  pushLog(game, `${game.players.find((p) => p.participantId === pid)?.name} 抽了一張牌。`)

  const seat = participantIdToSeat(game, pid)!
  triggerTrapsAfterDraw(game, pid)
  triggerTrapsHand7(game)
  maybeSetMuffinShout(game, seat)
  clearMuffinShoutIfNotTen(game, seat)

  if (!game.muffin_needs_shout_seat) advanceTurn(game)
  return game
}

function applyActionEffect(
  game: MuffinTimeGameData,
  actorPid: string,
  cardId: string,
  effect: string
): { pending?: MuffinPendingEffect } {
  const actorSeat = participantIdToSeat(game, actorPid)!
  const sorted = sortedPlayersBySeat(game)
  const idx = sorted.findIndex((p) => p.participantId === actorPid)
  const nextPid = sorted[(idx + 1) % sorted.length].participantId
  const prevPid = sorted[(idx - 1 + sorted.length) % sorted.length].participantId

  switch (effect) {
    case 'draw_1': {
      const c = drawOne(game)
      if (c) addToHand(game, actorPid, c)
      maybeSetMuffinShout(game, actorSeat)
      break
    }
    case 'draw_2':
      for (let i = 0; i < 2; i++) {
        const c = drawOne(game)
        if (c) addToHand(game, actorPid, c)
      }
      maybeSetMuffinShout(game, actorSeat)
      break
    case 'draw_3_then_discard_2_random':
      for (let i = 0; i < 3; i++) {
        const c = drawOne(game)
        if (c) addToHand(game, actorPid, c)
      }
      maybeSetMuffinShout(game, actorSeat)
      randomRemoveHandMany(game, actorPid, 2)
      clearMuffinShoutIfNotTen(game, actorSeat)
      break
    case 'self_discard_1_choice': {
      const h = game.hands[actorPid] || []
      if (h.length === 0) break
      const victim = h[Math.floor(Math.random() * h.length)]
      removeCardFromHand(game, actorPid, victim)
      discardPileAdd(game, victim)
      clearMuffinShoutIfNotTen(game, actorSeat)
      break
    }
    case 'next_discard_1_random': {
      const t = nextPid
      if ((game.hands[t] || []).length === 0) break
      return {
        pending: {
          kind: 'discard',
          targetParticipantId: t,
          amount: 1,
          sourceActionCardId: cardId,
        },
      }
    }
    case 'next_discard_2_random': {
      const t = nextPid
      const amt = Math.min(2, (game.hands[t] || []).length)
      if (amt === 0) break
      return {
        pending: {
          kind: 'discard',
          targetParticipantId: t,
          amount: amt,
          sourceActionCardId: cardId,
        },
      }
    }
    case 'all_discard_1_random':
      for (const pl of game.players || []) {
        const c = randomRemoveHand(game, pl.participantId)
        if (c) discardPileAdd(game, c)
        maybeSetMuffinShout(game, pl.seat)
        clearMuffinShoutIfNotTen(game, pl.seat)
      }
      break
    case 'take_1_random_from_prev': {
      const h = game.hands[prevPid] || []
      if (h.length) {
        const c = randomRemoveHand(game, prevPid)
        if (c) addToHand(game, actorPid, c)
      }
      maybeSetMuffinShout(game, actorSeat)
      clearMuffinShoutIfNotTen(game, participantIdToSeat(game, prevPid)!)
      break
    }
    case 'give_1_random_to_next': {
      const h = game.hands[actorPid] || []
      if (h.length) {
        const c = randomRemoveHand(game, actorPid)
        if (c) addToHand(game, nextPid, c)
      }
      maybeSetMuffinShout(game, actorSeat)
      const ns = participantIdToSeat(game, nextPid)!
      maybeSetMuffinShout(game, ns)
      clearMuffinShoutIfNotTen(game, actorSeat)
      clearMuffinShoutIfNotTen(game, ns)
      break
    }
    case 'instant_win':
      game.winner_seat = actorSeat
      game.win_reason = '鬆餅之神'
      game.status = 'finished'
      pushLog(game, `${game.players.find((p) => p.participantId === actorPid)?.name} 打出鬆餅之神，直接獲勝！`)
      break
    default:
      break
  }
  return {}
}

export function playActionCard(game: MuffinTimeGameData, pid: string, cardId: string): MuffinTimeGameData {
  assertCurrentPlayer(game, pid)
  if (game.turn_phase !== 'main') throw new Error('請先結束陷阱階段')
  const def = getCardDef(cardId)
  if (!def || def.kind !== 'action') throw new Error('只能打出行動牌')
  if (!removeCardFromHand(game, pid, cardId)) throw new Error('你沒有這張牌')
  discardPileAdd(game, cardId)

  pushLog(game, `${game.players.find((p) => p.participantId === pid)?.name} 打出了「${def.name}」。`)
  const { pending } = applyActionEffect(game, pid, cardId, def.effect)
  if (pending) {
    game.pending_effect = pending
    triggerTrapsAnyAction(game, pid)
    triggerTrapsHand7(game)
    return game
  }

  triggerTrapsAnyAction(game, pid)
  triggerTrapsHand7(game)
  const seat = participantIdToSeat(game, pid)!
  maybeSetMuffinShout(game, seat)
  clearMuffinShoutIfNotTen(game, seat)

  if (!game.muffin_needs_shout_seat && game.status === 'playing') advanceTurn(game)
  return game
}

export function resolvePendingDiscard(game: MuffinTimeGameData): MuffinTimeGameData {
  const pe = game.pending_effect
  if (!pe || pe.kind !== 'discard') return game
  const target = pe.targetParticipantId
  for (let i = 0; i < pe.amount; i++) {
    const c = randomRemoveHand(game, target)
    if (c) discardPileAdd(game, c)
  }
  const tSeat = participantIdToSeat(game, target)
  if (tSeat != null) {
    clearMuffinShoutIfNotTen(game, tSeat)
    maybeSetMuffinShout(game, tSeat)
  }
  game.pending_effect = null
  triggerTrapsHand7(game)

  const actorPid = seatToParticipantId(game, game.current_seat)
  if (actorPid) {
    const s = participantIdToSeat(game, actorPid)!
    maybeSetMuffinShout(game, s)
    clearMuffinShoutIfNotTen(game, s)
  }

  if (!game.muffin_needs_shout_seat && game.status === 'playing') advanceTurn(game)
  return game
}

export function playCounterCard(
  game: MuffinTimeGameData,
  pid: string,
  cardId: string
): MuffinTimeGameData {
  const pe = game.pending_effect
  if (!pe || pe.kind !== 'discard') throw new Error('沒有可反擊的效果')
  if (pe.targetParticipantId !== pid) throw new Error('你不是這次效果的目標')
  const def = getCardDef(cardId)
  if (!def || def.kind !== 'counter') throw new Error('這不是反擊牌')
  if (def.effect !== 'counter_negate_discard') throw new Error('無效的反擊')
  if (!removeCardFromHand(game, pid, cardId)) throw new Error('你沒有這張牌')
  discardPileAdd(game, cardId)
  pushLog(game, `${game.players.find((p) => p.participantId === pid)?.name} 反擊成功！`)
  game.pending_effect = null

  triggerTrapsHand7(game)

  const actorPid = seatToParticipantId(game, game.current_seat)
  if (actorPid) {
    const s = participantIdToSeat(game, actorPid)!
    maybeSetMuffinShout(game, s)
  }

  if (!game.muffin_needs_shout_seat && game.status === 'playing') advanceTurn(game)
  return game
}

export function declareMuffinShout(game: MuffinTimeGameData, pid: string): MuffinTimeGameData {
  const seat = participantIdToSeat(game, pid)
  if (seat == null) throw new Error('找不到玩家')
  if (game.muffin_needs_shout_seat !== seat) throw new Error('目前不需要宣告')
  if ((game.hands[pid] || []).length !== MUFFIN_WIN_COUNT) throw new Error('手牌必須剛好 10 張')

  game.muffin_pending_seat = seat
  game.muffin_declared = true
  game.muffin_needs_shout_seat = null
  pushLog(game, `${game.players.find((p) => p.participantId === pid)?.name} 大喊：吸爆鬆餅！`)

  advanceTurn(game)
  return game
}
