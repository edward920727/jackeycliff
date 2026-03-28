/** 題庫：依 id 取得詞彙；供你畫我猜抽題使用 */

export const DEFAULT_WORD_BANK_ID = 'general'

/** 房主貼詞；與內建題庫並列 */
export const CUSTOM_WORD_BANK_ID = 'custom'

const MIN_CUSTOM_WORDS = 3
const MAX_CUSTOM_WORDS = 500
const MAX_WORD_LEN = 40

export const WORD_BANK_OPTIONS: { id: string; label: string }[] = [
  { id: 'general', label: '綜合' },
  { id: 'food', label: '食物' },
  { id: 'animals', label: '動物' },
  { id: 'daily', label: '日常物品' },
  { id: CUSTOM_WORD_BANK_ID, label: '自訂（貼上詞彙）' },
]

const BANKS: Record<string, string[]> = {
  general: [
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
    '彩虹',
    '潛水艇',
    '聖誕樹',
    '龍捲風',
    '熱氣球',
    '海盜船',
    '機器人',
    '獨角獸',
  ],
  food: [
    '拉麵',
    '壽司',
    '漢堡',
    '薯條',
    '冰淇淋',
    '珍珠奶茶',
    '水餃',
    '粽子',
    '月餅',
    '火鍋',
    '臭豆腐',
    '芒果冰',
    '可樂',
    '吐司',
    '鬆餅',
    '咖哩飯',
    '章魚燒',
    '泡麵',
    '布丁',
    '蘋果派',
  ],
  animals: [
    '企鵝',
    '長頸鹿',
    '無尾熊',
    '海豚',
    '刺蝟',
    '貓頭鷹',
    '變色龍',
    '袋鼠',
    '浣熊',
    '紅鶴',
    '海龜',
    '水母',
    '北極熊',
    '斑馬',
    '犀牛',
    '孔雀',
    '松鼠',
    '鯨魚',
    '蝴蝶',
    '寄居蟹',
  ],
  daily: [
    '鬧鐘',
    '雨傘',
    '遙控器',
    '吹風機',
    '洗衣機',
    '冰箱',
    '電風扇',
    '掃把',
    '剪刀',
    '膠帶',
    '書包',
    '眼鏡',
    '手機',
    '充電線',
    '馬桶',
    '馬桶刷',
    '衣架',
    '鑰匙',
    '水壺',
    '便利貼',
  ],
}

/** 從文字區塊解析詞彙：換行、逗號、分號、頓號皆可分隔；去重、單詞長度上限 */
export function parseCustomWordBankInput(raw: string): string[] {
  const parts = raw
    .split(/[\n,，、;；]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, MAX_WORD_LEN))
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    if (seen.has(p)) continue
    seen.add(p)
    out.push(p)
    if (out.length >= MAX_CUSTOM_WORDS) break
  }
  return out
}

/** 驗證自訂題庫是否符合開局條件 */
export function validateCustomWordList(words: string[]): string | null {
  if (words.length < MIN_CUSTOM_WORDS) {
    return `自訂題庫至少需要 ${MIN_CUSTOM_WORDS} 個不重複詞彙（目前 ${words.length} 個）`
  }
  if (words.length > MAX_CUSTOM_WORDS) {
    return `自訂題庫最多 ${MAX_CUSTOM_WORDS} 個詞`
  }
  return null
}

export function getWordsForBank(bankId: string): string[] {
  const words = BANKS[bankId]
  if (words?.length) return words
  return BANKS[DEFAULT_WORD_BANK_ID]
}

export function getWordBankLabel(bankId: string): string {
  if (bankId === CUSTOM_WORD_BANK_ID) return '自訂題庫'
  return WORD_BANK_OPTIONS.find((o) => o.id === bankId)?.label ?? '綜合'
}

export function isValidWordBankId(id: string): boolean {
  return id === CUSTOM_WORD_BANK_ID || Boolean(BANKS[id]?.length)
}

function resolveWordPool(bankId: string, customWords?: string[] | null): string[] {
  if (bankId === CUSTOM_WORD_BANK_ID) {
    if (customWords?.length) return customWords
    return getWordsForBank(DEFAULT_WORD_BANK_ID)
  }
  return getWordsForBank(bankId)
}

/** 從題庫抽一題，優先不重複本局已用過的詞；題庫用盡才重複 */
export function pickWordExcluding(used: string[], bankId: string, customWords?: string[] | null): string {
  const WORDS = resolveWordPool(bankId, customWords)
  const safeUsed = new Set(used)
  const pool = WORDS.filter((w) => !safeUsed.has(w))
  const source = pool.length > 0 ? pool : WORDS
  return source[Math.floor(Math.random() * source.length)]
}
