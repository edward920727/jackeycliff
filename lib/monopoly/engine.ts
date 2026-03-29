import { BOARD } from './board'
import type { BoardCellDef, GameState, PlayerState } from './types'
import { BOARD_LEN, GO_BONUS, JAIL_POSITION, MONOPOLY_RENT_MULTIPLIER } from './types'
import { PROPERTY_GROUPS, propertyGroupKeys } from './propertyGroups'
import { canBuildHouse, canSellHouse, houseCostForGroup, sellHouseRefund } from './houseRules'

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

type DrawnCard = { kind: 'chance' | 'chest'; title: string; text: string }
type CardEffect =
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { money: number })
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { goto: number })
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { gotoNearest: 'railroad' | 'utility' })
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { move: number })
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { jail: true })
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { getOutOfJail: true })
  | ({ kind: 'chance' | 'chest'; title: string; text: string } & { repairs: { house: number; hotel: number } })

const CHANCE_DECK: CardEffect[] = [
  { kind: 'chance', title: '機會', text: '前進到起點（領取 $200）。', goto: 0 },
  { kind: 'chance', title: '機會', text: '前進到最近的鐵路。', gotoNearest: 'railroad' },
  { kind: 'chance', title: '機會', text: '前進到最近的公共事業。', gotoNearest: 'utility' },
  { kind: 'chance', title: '機會', text: '前進到「台北101」。', goto: 26 },
  { kind: 'chance', title: '機會', text: '後退 3 格。', move: -3 },
  { kind: 'chance', title: '機會', text: '銀行發放股利，獲得 $150。', money: 150 },
  { kind: 'chance', title: '機會', text: '超速罰款 $15。', money: -15 },
  { kind: 'chance', title: '機會', text: '房屋修繕費：每戶 $25、每旅館 $100。', repairs: { house: 25, hotel: 100 } },
  { kind: 'chance', title: '機會', text: '取得出獄卡（保留）。', getOutOfJail: true },
  { kind: 'chance', title: '機會', text: '進入監獄。', jail: true },
]

const CHEST_DECK: CardEffect[] = [
  { kind: 'chest', title: '命運', text: '銀行錯帳：獲得 $200。', money: 200 },
  { kind: 'chest', title: '命運', text: '醫療費 $50。', money: -50 },
  { kind: 'chest', title: '命運', text: '所得退稅：獲得 $20。', money: 20 },
  { kind: 'chest', title: '命運', text: '生日快樂：獲得 $10。', money: 10 },
  { kind: 'chest', title: '命運', text: '保險到期：獲得 $100。', money: 100 },
  { kind: 'chest', title: '命運', text: '房屋修繕費：每戶 $40、每旅館 $115。', repairs: { house: 40, hotel: 115 } },
  { kind: 'chest', title: '命運', text: '取得出獄卡（保留）。', getOutOfJail: true },
  { kind: 'chest', title: '命運', text: '進入監獄。', jail: true },
]

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
    const h = state.buildings[cellIndex] ?? 0
    if (h === 0) {
      let r = cell.baseRent
      if (state.fullSetOwners[cell.group] === owner) {
        r = Math.round(cell.baseRent * MONOPOLY_RENT_MULTIPLIER)
      }
      return r
    }
    if (h >= 1 && h <= 4) return cell.houseRents[h - 1]!
    return cell.houseRents[4]!
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
    pendingMove: null,
    lastMessage: `${state.players.find((x) => x.id === playerId)?.name ?? '玩家'} 破產出局！`,
  }
  s = checkWinner(s)
  if (s.phase === 'gameover') return s
  s.currentPlayer = nextAliveIndex(s, s.currentPlayer)
  s.phase = 'roll'
  s.dice = null
  return s
}

/** 前進一格（逐步走棋用）；從第 39 格走到第 0 格時領起點獎金 */
function stepPlayerOnce(p: PlayerState): { player: PlayerState; crossedGo: boolean } {
  const old = p.position
  const newPos = (old + 1) % BOARD_LEN
  let money = p.money
  let crossed = false
  if (old === BOARD_LEN - 1) {
    money += GO_BONUS
    crossed = true
  }
  return { player: { ...p, position: newPos, money }, crossedGo: crossed }
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

function gotoIndex(
  p: PlayerState,
  idx: number,
  collectGo: boolean
): { player: PlayerState; passedGo: boolean } {
  const old = p.position
  const passedGo = collectGo && idx < old
  let money = p.money
  if (passedGo) money += GO_BONUS
  return { player: { ...p, position: idx, money }, passedGo }
}

function findNearest(from: number, kind: 'railroad' | 'utility'): number {
  for (let step = 1; step <= BOARD_LEN + 1; step++) {
    const idx = (from + step) % BOARD_LEN
    if (BOARD[idx].kind === kind) return idx
  }
  return from
}

function countHousesAndHotels(state: GameState, ownerId: number): { houses: number; hotels: number } {
  let houses = 0
  let hotels = 0
  for (let i = 0; i < BOARD.length; i++) {
    const c = BOARD[i]
    if (c.kind !== 'property') continue
    if (state.owners[i] !== ownerId) continue
    const b = state.buildings[i] ?? 0
    if (b >= 1 && b <= 4) houses += b
    if (b >= 5) hotels += 1
  }
  return { houses, hotels }
}

export function createInitialState(names: string[]): GameState {
  const players: PlayerState[] = names.map((name, id) => ({
    id,
    name: name.trim() || `玩家 ${id + 1}`,
    money: 1500,
    position: 0,
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    bankrupt: false,
  }))
  const owners = Array(BOARD_LEN).fill(null) as (number | null)[]
  const buildings = Array(BOARD_LEN).fill(0) as number[]
  return {
    players,
    owners,
    buildings,
    fullSetOwners: computeFullSetOwners(owners),
    fullSetToast: null,
    fullSetToastSeq: 0,
    moneyFx: null,
    moneyFxSeq: 0,
    drawnCard: null,
    drawnCardSeq: 0,
    currentPlayer: 0,
    phase: 'roll',
    pendingMove: null,
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
  | { type: 'BUILD_HOUSE'; cellIndex: number }
  | { type: 'SELL_HOUSE'; cellIndex: number }
  | { type: 'CLEAR_FULL_SET_TOAST'; id: number }
  | { type: 'CLEAR_DRAWN_CARD'; id: number }
  | { type: 'USE_JAIL_CARD'; d1?: number; d2?: number }
  | { type: 'MOVE_STEP' }

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
    const deck = cell.kind === 'chance' ? CHANCE_DECK : CHEST_DECK
    const effect = deck[Math.floor(Math.random() * deck.length)]!
    let card: DrawnCard = { kind: effect.kind, title: effect.title, text: effect.text }

    const curP = players.find((x) => x.id === pid)!
    let updatedP: PlayerState = curP
    let extraLine = ''

    if ('money' in effect) {
      updatedP = { ...updatedP, money: updatedP.money + effect.money }
      extraLine = effect.money >= 0 ? ` +$${effect.money}` : ` -$${Math.abs(effect.money)}`
    } else if ('getOutOfJail' in effect) {
      updatedP = { ...updatedP, getOutOfJailCards: (updatedP.getOutOfJailCards ?? 0) + 1 }
    } else if ('repairs' in effect) {
      const { houses, hotels } = countHousesAndHotels(state, pid)
      const fee = houses * effect.repairs.house + hotels * effect.repairs.hotel
      updatedP = { ...updatedP, money: updatedP.money - fee }
      extraLine = ` 修繕費 $${fee}（戶:${houses} 旅館:${hotels}）`
    } else if ('jail' in effect && effect.jail) {
      updatedP = { ...updatedP, position: JAIL_POSITION, inJail: true, jailTurns: 0 }
    } else if ('move' in effect) {
      const res = movePlayer(updatedP, effect.move, false)
      updatedP = res.player
    } else if ('goto' in effect) {
      const res = gotoIndex(updatedP, effect.goto, true)
      updatedP = res.player
    } else if ('gotoNearest' in effect) {
      const target = findNearest(updatedP.position, effect.gotoNearest)
      const res = gotoIndex(updatedP, target, true)
      updatedP = res.player
    }

    players = players.map((x) => (x.id === pid ? updatedP : x))
    if (updatedP.money < 0) {
      return bankruptPlayer({ ...base, players }, pid)
    }

    // 若移動到別格，繼續結算該格（但保留抽卡 UI）
    const movedTo = updatedP.position
    if (movedTo !== cellIndex && !updatedP.inJail) {
      const s2 = resolveLanding(
        {
          ...base,
          players,
        },
        updatedP,
        false,
      )
      return {
        ...s2,
        drawnCard: { id: s2.drawnCardSeq + 1, kind: card.kind, title: card.title, text: card.text },
        drawnCardSeq: s2.drawnCardSeq + 1,
        lastMessage: `${lastMessage} 抽卡：${card.text}${extraLine}`,
      }
    }

    return {
      ...base,
      players,
      drawnCard: { id: base.drawnCardSeq + 1, kind: card.kind, title: card.title, text: card.text },
      drawnCardSeq: base.drawnCardSeq + 1,
      phase: 'roll',
      lastMessage: `${lastMessage} 抽卡：${card.text}${extraLine}`,
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

    case 'CLEAR_FULL_SET_TOAST': {
      if (!state.fullSetToast || state.fullSetToast.id !== action.id) return state
      return { ...state, fullSetToast: null }
    }

    case 'CLEAR_DRAWN_CARD': {
      if (!state.drawnCard || state.drawnCard.id !== action.id) return state
      return { ...state, drawnCard: null }
    }

    case 'BUILD_HOUSE': {
      if (state.phase !== 'roll') return state
      const cur = getCurrent(state)
      if (cur.bankrupt) return state
      if (!canBuildHouse(state, action.cellIndex, cur.id)) return state
      const cell = BOARD[action.cellIndex]
      if (cell.kind !== 'property') return state
      const cost = houseCostForGroup(cell.group)
      const buildings = [...state.buildings]
      buildings[action.cellIndex] = (buildings[action.cellIndex] ?? 0) + 1
      const players = state.players.map((p) => (p.id === cur.id ? { ...p, money: p.money - cost } : p))
      const np = players.find((x) => x.id === cur.id)!
      if (np.money < 0) {
        return bankruptPlayer({ ...state, buildings, players }, cur.id)
      }
      return {
        ...state,
        buildings,
        players,
        lastMessage: `在「${cell.name}」升級建物（-$${cost}）。`,
      }
    }

    case 'SELL_HOUSE': {
      if (state.phase !== 'roll') return state
      const cur = getCurrent(state)
      if (cur.bankrupt) return state
      if (!canSellHouse(state, action.cellIndex, cur.id)) return state
      const cell = BOARD[action.cellIndex]
      if (cell.kind !== 'property') return state
      const refund = sellHouseRefund(cell.group)
      const buildings = [...state.buildings]
      buildings[action.cellIndex] = Math.max(0, (buildings[action.cellIndex] ?? 0) - 1)
      const players = state.players.map((p) => (p.id === cur.id ? { ...p, money: p.money + refund } : p))
      return {
        ...state,
        buildings,
        players,
        lastMessage: `賣出「${cell.name}」建物（+$${refund}）。`,
      }
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
          const players = state.players.map((p) => (p.id === cur.id ? freed : p))
          return {
            ...state,
            players,
            dice: [d1, d2],
            phase: 'moving',
            pendingMove: { playerId: freed.id, stepsRemaining: sum },
            doublesCount: state.doublesCount + 1,
            lastMessage: `監獄擲出雙數！請按「前進一格」走 ${sum} 步。`,
          }
        }
        return {
          ...state,
          dice: [d1, d2],
          phase: 'roll',
          lastMessage: `監獄擲出 ${d1}+${d2}，沒有雙數，回合結束。`,
          currentPlayer: nextAliveIndex(state, state.currentPlayer),
        }
      }

      return {
        ...state,
        dice: [d1, d2],
        phase: 'moving',
        pendingMove: { playerId: cur.id, stepsRemaining: sum },
        lastMessage: `擲出 ${d1}+${d2}=${sum}，請按「前進一格」自己走棋。`,
      }
    }

    case 'MOVE_STEP': {
      if (state.phase !== 'moving' || !state.pendingMove) return state
      const pm = state.pendingMove
      const cur = getCurrent(state)
      if (!cur || cur.bankrupt || cur.id !== pm.playerId) return state
      if (pm.stepsRemaining <= 0) return state

      const { player: stepped, crossedGo } = stepPlayerOnce(cur)
      const players = state.players.map((p) => (p.id === cur.id ? stepped : p))
      const newRem = pm.stepsRemaining - 1

      if (newRem > 0) {
        return {
          ...state,
          players,
          pendingMove: { playerId: pm.playerId, stepsRemaining: newRem },
          lastMessage: crossedGo
            ? `經過起點，領取 $${GO_BONUS}！還剩 ${newRem} 步。`
            : `還剩 ${newRem} 步，繼續前進。`,
        }
      }

      const movedPlayer = players.find((x) => x.id === pm.playerId)!
      const landed = resolveLanding({ ...state, players, pendingMove: null, dice: state.dice }, movedPlayer, false)
      return { ...landed, pendingMove: null }
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
      const players = state.players.map((p) => (p.id === cur.id ? paid : p))
      const d1 = action.d1 !== undefined ? clampDie(action.d1) : randDie()
      const d2 = action.d2 !== undefined ? clampDie(action.d2) : randDie()
      const sum = d1 + d2
      return {
        ...state,
        players,
        dice: [d1, d2],
        phase: 'moving',
        pendingMove: { playerId: paid.id, stepsRemaining: sum },
        lastMessage: `付 $${fee} 出獄，請按「前進一格」走 ${sum} 步。`,
      }
    }

    case 'USE_JAIL_CARD': {
      if (state.phase !== 'roll') return state
      const cur = getCurrent(state)
      if (!cur.inJail || cur.bankrupt) return state
      if ((cur.getOutOfJailCards ?? 0) <= 0) return state
      const freed = { ...cur, inJail: false, jailTurns: 0, getOutOfJailCards: cur.getOutOfJailCards - 1 }
      const players = state.players.map((p) => (p.id === cur.id ? freed : p))
      const d1 = action.d1 !== undefined ? clampDie(action.d1) : randDie()
      const d2 = action.d2 !== undefined ? clampDie(action.d2) : randDie()
      const sum = d1 + d2
      return {
        ...state,
        players,
        dice: [d1, d2],
        phase: 'moving',
        pendingMove: { playerId: freed.id, stepsRemaining: sum },
        lastMessage: `使用出獄卡，請按「前進一格」走 ${sum} 步。`,
      }
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
      const prevFull = state.fullSetOwners
      const owners = [...state.owners]
      owners[idx] = cur.id
      const fullSetOwners = computeFullSetOwners(owners)
      let fullSetToast = state.fullSetToast
      let fullSetToastSeq = state.fullSetToastSeq
      for (const g of propertyGroupKeys()) {
        if (prevFull[g] == null && fullSetOwners[g] != null) {
          fullSetToastSeq += 1
          fullSetToast = { id: fullSetToastSeq, groupKey: g, playerId: fullSetOwners[g]! }
          break
        }
      }
      const players = state.players.map((p) =>
        p.id === cur.id ? { ...p, money: p.money - cell.price } : p
      )
      return {
        ...state,
        owners,
        fullSetOwners,
        fullSetToast,
        fullSetToastSeq,
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
