import type { UndercoverWords } from '@/types/undercover'

export const UNDERCOVER_WORD_PAIRS: UndercoverWords[] = [
  { civilian: '蘋果', undercover: '梨子' },
  { civilian: '可口可樂', undercover: '百事可樂' },
  { civilian: '圖書館', undercover: '書店' },
  { civilian: '筷子', undercover: '湯匙' },
  { civilian: '籃球', undercover: '排球' },
  { civilian: '牙刷', undercover: '牙線' },
  { civilian: '雨傘', undercover: '雨衣' },
  { civilian: '牛排', undercover: '豬排' },
  { civilian: '計程車', undercover: 'Uber' },
  { civilian: '咖啡', undercover: '奶茶' },
  { civilian: '空調', undercover: '電風扇' },
  { civilian: '便利商店', undercover: '超級市場' },
  { civilian: '電視劇', undercover: '電影' },
  { civilian: '手機殼', undercover: '手機膜' },
  { civilian: '耳機', undercover: '音響' },
]

export function getRandomWordPair(): UndercoverWords {
  const idx = Math.floor(Math.random() * UNDERCOVER_WORD_PAIRS.length)
  return UNDERCOVER_WORD_PAIRS[idx]
}

