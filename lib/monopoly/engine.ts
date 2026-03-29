import { BOARD } from './board'
import type { BoardCellDef, GameState, PlayerState } from './types'
import { BOARD_LEN, GO_BONUS, JAIL_POSITION, MONOPOLY_RENT_MULTIPLIER } from './types'
import { PROPERTY_GROUPS, propertyGroupKeys } from './propertyGroups'

function randDie() {
  return 1 + Math.floor(Math.random() * 6)
}

function clampDie(n: number): number {
  if (!Number.isFinite(n)) return randDie()
  const v = Math.round(n)
  return Math.min(6, Math.max(1, v))
}

/** 供 UI 先擲骰再送入 reducer（全螢幕擲骰動畫用） */
export function rollTwoDice(): [number, number] {
  return [randDie(), randDie()]
}

/** 機會／命運效果（簡化版） */
const CHANCE_EFFECTS = [
  { text: '銀行發放股利，獲得 $150。', money: 150 },
  { text: '繳納醫藥費 $50。', money: -50 },
  { text: '遺產繼承 $100。', money: 100 },
  { text: '被罰超速 $15。', money: -15 },
  { text: '參加猜謎獲獎 $25。', money: 25 },
  { text: '旅遊基金：退回起點並領 $200。', gotoGo: true },
  { text: '進入監獄。', jail: true },
] as const

function countRailroadsOwned(owners: (number | null)[], playerId: number): number {
  return owners.filter((o, i) => {
    const c = BOARD[i]
    return o === playerId && c.kind === 'railroad'
  }).length
}

function countUtilitiesOwned(owners: (number | null)[], playerId: number): number {
  return owners.filter((o, i) => {
    const c = BOARD[i]
    return o === playerId && c.kind === 'utility'
  }).length
}

function groupPropertyIndices(group: string): number[] {
  return BOARD.map((c, i) => (c.kind === 'property' && c.group === group ? i : -1)).filter(
    (i) => i >= 0
  )
}

function ownsFullGroup(owners: (number | null)[], playerId: number, group: string): boolean {
  const idx = groupPropertyIndices(group)
  if (idx.length === 0) return false
  return idx.every((i) => owners[i] === playerId)
}

function computeFullSetOwners(owners: (number | null)[]): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const g of propertyGroupKeys()) {
    const indices = PROPERTY_GROUPS[g].indices
    if (indices.length === 0) {
      out[g] = null
      continue
    }
    const firstOwner = owners[indices[0]!] ?? null
    if (firstOwner == null) {
      out[g] = null
      continue
    }
    const ok = indices.every((i) => owners[i] === firstOwner)
    out[g] = ok ? firstOwner : null
  }
  return out
}

/** 該格為地產且地主已達成同色壟斷（該組全持有） */
export function hasColorMonopoly(state: GameState, cellIndex: number): boolean {
  const cell = BOARD[cellIndex]
  const owner = state.owners[cellIndex]
  if (cell.kind !== 'property' || owner == null) return false
  return state.fullSetOwners[cell.group] === owner
}

export function computeRent(cellIndex: number, state: GameState): number {
  const cell = BOARD[cellIndex]
  const owner = state.owners[cellIndex]
  if (owner == null) return 0

  if (cell.kind === 'railroad') {
    const n = countRailroadsOwned(state.owners, owner)
    const tier = Math.min(Math.max(n, 1), 4) - 1
    return cell.rents[tier]
  }

  if (cell.kind === 'utility') {
    const n = countUtilitiesOwned(state.owners, owner)
    const diceSum = state.dice ? state.dice[0] + state.dice[1] : 7
    if (n === 1) return 4 * diceSum
    if (n >= 2) return 10 * diceSum
    return 0
  }

  if (cell.kind === 'property') {
    let r = cell.baseRent
    if (state.fullSetOwners[cell.group] === owner) {
      r = Math.round(cell.baseRent * MONOPOLY_RENT_MULTIPLIER)
    }
    return r
  }

  return 0
}

function activePlayers(state: GameState): PlayerState[] {
  return state.players.filter((p) => !p.bankrupt)
}

function nextAliveIndex(state: GameState, from: number): number {
  const n = state.players.length
  let i = (from + 1) % n
  let guard = 0
  while (state.players[i].bankrupt && guard < n + 1) {
    i = (i + 1) % n
    guard++
  }
  return i
}

function checkWinner(state: GameState): GameState {
  const alive = activePlayers(state)
  if (alive.length === 1) {
    return {
      ...state,
      phase: 'gameover',
      winnerId: alive[0].id,
      lastMessage: `${alive[0].name} 獲勝！`,
    }
  }
  return state
}

function bankruptPlayer(state: GameState, playerId: number): GameState {
  const owners = [...state.owners]
  for (let i = 0; i < owners.length; i++) {
    if (owners[i] === playerId) owners[i] = null
  }
  // 若剛好在顯示跳字，直接清掉避免留在畫面上
  const moneyFx = state.moneyFx?.entries?.some((e) => e.playerId === playerId) ? null : state.moneyFx
  const fullSetOwners = computeFullSetOwners(owners)
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, bankrupt: true, money: 0 } : p
  )
  let s: GameState = {
    ...state,
    owners,
    fullSetOwners,
    moneyFx,
    players,
    lastMessage: `${state.players.find((x) => x.id === playerId)?.name ?? '玩家'} 破產出局！`,
  }
  s = checkWinner(s)
  if (s.phase === 'gameover') return s
  s.currentPlayer = nextAliveIndex(s, s.currentPlayer)
  s.phase = 'roll'
  s.dice = null
  return s
}

function movePlayer(
  p: PlayerState,
  steps: number,
  collectGo: boolean
): { player: PlayerState; passedGo: boolean } {
  const old = p.position
  const passedGo = old + steps >= BOARD_LEN
  const pos = (old + steps) % BOARD_LEN
  let money = p.money
  if (passedGo && collectGo) {
    money += GO_BONUS
  }
  return {
    player: { ...p, position: pos, money },
    passedGo: passedGo && collectGo,
  }
}

export function createInitialState(names: string[]): GameState {
  const players: PlayerState[] = names.map((name, id) => ({
    id,
    name: name.trim() || `玩家 ${id + 1}`,
    money: 1500,
    position: 0,
    inJail: false,
    jailTurns: 0,
    bankrupt: false,
  }))
  const owners = Array(BOARD_LEN).fill(null) as (number | null)[]
  return {
    players,
    owners,
    fullSetOwners: computeFullSetOwners(owners),
    moneyFx: null,
    moneyFxSeq: 0,
    currentPlayer: 0,
    phase: 'roll',
    dice: null,
    lastMessage: '擲骰開始你的回合！',
    doublesCount: 0,
    winnerId: null,
  }
}

export type GameAction =
  | { type: 'NEW_GAME'; names: string[] }
  /** 可帶 d1、d2（由 UI 預先擲出），省略則在 reducer 內隨機 */
  | { type: 'ROLL'; d1?: number; d2?: number }
  | { type: 'JAIL_PAY'; d1?: number; d2?: number }
  | { type: 'BUY' }
  | { type: 'SKIP_BUY' }
  | { type: 'CLEAR_MONEY_FX'; id: number }

function getCurrent(state: GameState): PlayerState {
  return state.players[state.currentPlayer]
}

function landingMessage(cell: BoardCellDef, extra?: string): string {
  if (extra) return extra
  return `停在「${cell.name}」。`
}

function resolveLanding(state: GameState, movedPlayer: PlayerState, passedGoMsg: boolean): GameState {
  const cellIndex = movedPlayer.position
  const cell = BOARD[cellIndex]
  const pid = movedPlayer.id

  let players = state.players.map((p) => (p.id === pid ? movedPlayer : p))
  let lastMessage =
    (passedGoMsg ? `經過起點，領取 $${GO_BONUS}！ ` : '') + landingMessage(cell)

  const base: GameState = {
    ...state,
    players,
    dice: state.dice,
  }

  if (cell.kind === 'goto_jail') {
    const p = players.find((x) => x.id === pid)!
    const updated = {
      ...p,
      position: JAIL_POSITION,
      inJail: true,
      jailTurns: 0,
    }
    players = players.map((x) => (x.id === pid ? updated : x))
    return {
      ...base,
      players,
      phase: 'roll',
      lastMessage: '被送到監獄！下回合可付費出獄或擲雙數。',
      dice: null,
      currentPlayer: nextAliveIndex({ ...base, players }, base.currentPlayer),
    }
  }

  if (cell.kind === 'tax') {
    const p = players.find((x) => x.id === pid)!
    const after = { ...p, money: p.money - cell.amount }
    players = players.map((x) => (x.id === pid ? after : x))
    if (after.money < 0) {
      return bankruptPlayer({ ...base, players }, pid)
    }
    return {
      ...base,
      players,
      phase: 'roll',
      lastMessage: lastMessage + ` 繳納 $${cell.amount}。`,
      dice: null,
      currentPlayer: nextAliveIndex({ ...base, players }, base.currentPlayer),
    }
  }

  if (cell.kind === 'chance' || cell.kind === 'chest') {
    const effect = CHANCE_EFFECTS[Math.floor(Math.random() * CHANCE_EFFECTS.length)]
    let cardLine = ''
    if ('money' in effect && typeof effect.money === 'number') {
      const p = players.find((x) => x.id === pid)!
      const after = { ...p, money: p.money + effect.money }
      players = players.map((x) => (x.id === pid ? after : x))
      cardLine = effect.text
      if (after.money < 0) {
        return bankruptPlayer({ ...base, players }, pid)
      }
    } else if ('gotoGo' in effect && effect.gotoGo) {
      const p = players.find((x) => x.id === pid)!
      const after = { ...p, position: 0, money: p.money + GO_BONUS }
      players = players.map((x) => (x.id === pid ? after : x))
      cardLine = effect.text
    } else if ('jail' in effect && effect.jail) {
      const p = players.find((x) => x.id === pid)!
      const after = {
        ...p,
        position: JAIL_POSITION,
        inJail: true,
        jailTurns: 0,
      }
      players = players.map((x) => (x.id === pid ? after : x))
      cardLine = effect.text
    }
    return {
      ...base,
      players,
      phase: 'roll',
      lastMessage: `${lastMessage} 抽卡：${cardLine}`,
      dice: null,
      currentPlayer: nextAliveIndex({ ...base, players }, base.currentPlayer),
    }
  }

  if (cell.kind === 'property' || cell.kind === 'railroad' || cell.kind === 'utility') {
    const owner = state.owners[cellIndex]
    if (owner == null || owner === pid) {
      if (owner === pid) {
        return {
          ...base,
          players,
          phase: 'roll',
          lastMessage: lastMessage + ' 這是你自己的地。',
          dice: null,
          currentPlayer: nextAliveIndex({ ...base, players }, base.currentPlayer),
        }
      }
      return {
        ...base,
        players,
        phase: 'buy_prompt',
        lastMessage: lastMessage + ` 無人擁有，價格 $${cell.price}。`,
      }
    }
    const rent = computeRent(cellIndex, state)
    const p = players.find((x) => x.id === pid)!
    const o = players.find((x) => x.id === owner)!
    const afterP = { ...p, money: p.money - rent }
    const afterO = { ...o, money: o.money + rent }
    players = players.map((x) => {
      if (x.id === pid) return afterP
      if (x.id === owner) return afterO
      return x
    })
    if (afterP.money < 0) {
      return bankruptPlayer({ ...base, players }, pid)
    }
    const monoNote =
      cell.kind === 'property' && hasColorMonopoly(state, cellIndex)
        ? `（同色壟斷 ×${MONOPOLY_RENT_MULTIPLIER}）`
        : ''
    return {
      ...base,
      players,
      phase: 'roll',
      lastMessage: lastMessage + ` 付給 ${afterO.name} 租金 $${rent}。${monoNote}`,
      moneyFx: {
        id: base.moneyFxSeq + 1,
        entries: [
          { playerId: pid, amount: -rent },
          { playerId: owner, amount: rent },
        ],
      },
      moneyFxSeq: base.moneyFxSeq + 1,
      dice: null,
      currentPlayer: nextAliveIndex({ ...base, players }, base.currentPlayer),
    }
  }

  // go, jail visit, parking
  return {
    ...base,
    players,
    phase: 'roll',
    lastMessage,
    dice: null,
    currentPlayer: nextAliveIndex({ ...base, players }, base.currentPlayer),
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.phase === 'gameover' && action.type !== 'NEW_GAME') {
    return state
  }

  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState(action.names)

    case 'CLEAR_MONEY_FX': {
      if (!state.moneyFx || state.moneyFx.id !== action.id) return state
      return { ...state, moneyFx: null }
    }

    case 'ROLL': {
      if (state.phase !== 'roll') return state
      const cur = getCurrent(state)
      if (cur.bankrupt) return state

      const d1 = action.d1 !== undefined ? clampDie(action.d1) : randDie()
      const d2 = action.d2 !== undefined ? clampDie(action.d2) : randDie()
      const sum = d1 + d2

      if (cur.inJail) {
        if (d1 === d2) {
          const freed = { ...cur, inJail: false, jailTurns: 0 }
          const { player: moved, passedGo } = movePlayer(freed, sum, true)
          return resolveLanding(
            { ...state, dice: [d1, d2], doublesCount: state.doublesCount + 1 },
            moved,
            passedGo
          )
        }
        return {
          ...state,
          dice: [d1, d2],
          phase: 'roll',
          lastMessage: `監獄擲出 ${d1}+${d2}，沒有雙數，回合結束。`,
          currentPlayer: nextAliveIndex(state, state.currentPlayer),
        }
      }

      const { player: moved, passedGo } = movePlayer(cur, sum, true)
      return resolveLanding({ ...state, dice: [d1, d2] }, moved, passedGo)
    }

    case 'JAIL_PAY': {
      if (state.phase !== 'roll') return state
      const cur = getCurrent(state)
      if (!cur.inJail || cur.bankrupt) return state
      const fee = 50
      if (cur.money < fee) {
        return bankruptPlayer(state, cur.id)
      }
      const paid = { ...cur, money: cur.money - fee, inJail: false, jailTurns: 0 }
      const d1 = action.d1 !== undefined ? clampDie(action.d1) : randDie()
      const d2 = action.d2 !== undefined ? clampDie(action.d2) : randDie()
      const sum = d1 + d2
      const { player: moved, passedGo } = movePlayer(paid, sum, true)
      return resolveLanding({ ...state, dice: [d1, d2] }, moved, passedGo)
    }

    case 'BUY': {
      if (state.phase !== 'buy_prompt') return state
      const cur = getCurrent(state)
      const idx = cur.position
      const cell = BOARD[idx]
      if (cell.kind !== 'property' && cell.kind !== 'railroad' && cell.kind !== 'utility')
        return state
      if (state.owners[idx] != null) return state
      if (cur.money < cell.price) return state
      const owners = [...state.owners]
      owners[idx] = cur.id
      const fullSetOwners = computeFullSetOwners(owners)
      const players = state.players.map((p) =>
        p.id === cur.id ? { ...p, money: p.money - cell.price } : p
      )
      return {
        ...state,
        owners,
        fullSetOwners,
        players,
        phase: 'roll',
        lastMessage: `購買「${cell.name}」成功！`,
        dice: null,
        currentPlayer: nextAliveIndex({ ...state, owners, players }, state.currentPlayer),
      }
    }

    case 'SKIP_BUY': {
      if (state.phase !== 'buy_prompt') return state
      return {
        ...state,
        phase: 'roll',
        lastMessage: '放棄購買。',
        dice: null,
        currentPlayer: nextAliveIndex(state, state.currentPlayer),
      }
    }

    default:
      return state
  }
}
