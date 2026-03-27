import type { MuffinCardDef } from '@/types/muffin-time'

/**
 * 自創簡化牌庫（靈感來自派對卡牌玩法，非官方牌面）
 */
export const MUFFIN_CARD_DEFS: Record<string, MuffinCardDef> = {
  // 行動牌（藍色主題）
  a01: {
    id: 'a01',
    name: '小補貨',
    kind: 'action',
    desc: '抽 1 張牌。',
    effect: 'draw_1',
  },
  a02: {
    id: 'a02',
    name: '大補貨',
    kind: 'action',
    desc: '抽 2 張牌。',
    effect: 'draw_2',
  },
  a03: {
    id: 'a03',
    name: '手滑一下',
    kind: 'action',
    desc: '自己丟棄 1 張（自選）。',
    effect: 'self_discard_1_choice',
  },
  a04: {
    id: 'a04',
    name: '隔壁倒楣',
    kind: 'action',
    desc: '下一位玩家隨機丟棄 1 張。',
    effect: 'next_discard_1_random',
  },
  a05: {
    id: 'a05',
    name: '連環手滑',
    kind: 'action',
    desc: '下一位玩家隨機丟棄 2 張。',
    effect: 'next_discard_2_random',
  },
  a06: {
    id: 'a06',
    name: '全場整理',
    kind: 'action',
    desc: '每位玩家隨機丟棄 1 張。',
    effect: 'all_discard_1_random',
  },
  a07: {
    id: 'a07',
    name: '借看一下',
    kind: 'action',
    desc: '隨機從上一位玩家手中拿 1 張到手牌。',
    effect: 'take_1_random_from_prev',
  },
  a08: {
    id: 'a08',
    name: '硬塞禮物',
    kind: 'action',
    desc: '隨機給下一位玩家 1 張手牌。',
    effect: 'give_1_random_to_next',
  },
  a09: {
    id: 'a09',
    name: '命運贈禮',
    kind: 'action',
    desc: '立刻多抽 3 張，再隨機丟棄 2 張。',
    effect: 'draw_3_then_discard_2_random',
  },
  a10: {
    id: 'a10',
    name: '鬆餅之神',
    kind: 'action',
    desc: '直接獲勝（整人遊戲用彩蛋）。',
    effect: 'instant_win',
  },

  // 反擊牌
  c01: {
    id: 'c01',
    name: '我沒看到',
    kind: 'counter',
    desc: '抵消一次「指定你丟棄」的效果。',
    effect: 'counter_negate_discard',
  },
  c02: {
    id: 'c02',
    name: '等一下',
    kind: 'counter',
    desc: '抵消一次「指定你丟棄」的效果。',
    effect: 'counter_negate_discard',
  },

  // 陷阱牌
  t01: {
    id: 't01',
    name: '踩雷抽牌',
    kind: 'trap',
    desc: '當你抽牌時觸發：再抽 1 張。',
    trapTrigger: 'on_owner_draw',
    effect: 'trap_draw_1',
  },
  t02: {
    id: 't02',
    name: '全場驚喜',
    kind: 'trap',
    desc: '當任何人打出行動牌時觸發：每人抽 1 張。',
    trapTrigger: 'on_any_action',
    effect: 'trap_all_draw_1',
  },
  t03: {
    id: 't03',
    name: '七上八下',
    kind: 'trap',
    desc: '當你手牌達 7 張或以上時觸發：隨機丟 1 張。',
    trapTrigger: 'on_owner_hand_7',
    effect: 'trap_self_discard_1_random',
  },
  t04: {
    id: 't04',
    name: '偷偷補貨',
    kind: 'trap',
    desc: '當你抽牌時觸發：抽 2 張。',
    trapTrigger: 'on_owner_draw',
    effect: 'trap_draw_2',
  },
}

/** 建構牌庫：多張重複讓遊戲節奏夠長 */
export function buildMuffinDeck(): string[] {
  const ids: string[] = []
  const repeat = (id: string, n: number) => {
    for (let i = 0; i < n; i++) ids.push(id)
  }
  repeat('a01', 5)
  repeat('a02', 4)
  repeat('a03', 3)
  repeat('a04', 4)
  repeat('a05', 3)
  repeat('a06', 2)
  repeat('a07', 3)
  repeat('a08', 3)
  repeat('a09', 2)
  repeat('a10', 1)
  repeat('c01', 3)
  repeat('c02', 3)
  repeat('t01', 3)
  repeat('t02', 2)
  repeat('t03', 3)
  repeat('t04', 2)

  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

export function getCardDef(id: string): MuffinCardDef | undefined {
  return MUFFIN_CARD_DEFS[id]
}
