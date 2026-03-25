export const UNDEAD_CHARACTER_POOL = [
  '愛因斯坦',
  '瑪麗蓮夢露',
  '貝多芬',
  '拿破崙',
  '莎士比亞',
  '武則天',
  '成吉思汗',
  '林肯',
  '達文西',
  '貓王',
  '居禮夫人',
  '卓別林',
  '孔子',
  '孫中山',
  '梵谷',
  '莫札特',
  '甘地',
  '戴安娜王妃',
  '喬布斯',
  '李小龍',
  '海倫凱勒',
  '牛頓',
  '哥倫布',
  '凱撒',
]

export const UNDEAD_CHALLENGE_DEFINITIONS = {
  noA: {
    label: '本輪詞語不能包含「的」',
    validate: (word: string) => !word.includes('的'),
  },
  min3: {
    label: '本輪詞語至少 3 個字',
    validate: (word: string) => word.length >= 3,
  },
  max4: {
    label: '本輪詞語最多 4 個字',
    validate: (word: string) => word.length <= 4,
  },
  noRepeatChar: {
    label: '本輪詞語不能有重複字',
    validate: (word: string) => {
      const chars = [...word]
      return new Set(chars).size === chars.length
    },
  },
  noDirection: {
    label: '本輪詞語不能包含方位詞（上/下/左/右）',
    validate: (word: string) =>
      !word.includes('上') && !word.includes('下') && !word.includes('左') && !word.includes('右'),
  },
} as const

export type UndeadChallengeKey = keyof typeof UNDEAD_CHALLENGE_DEFINITIONS
export const ALL_UNDEAD_CHALLENGE_KEYS = Object.keys(
  UNDEAD_CHALLENGE_DEFINITIONS
) as UndeadChallengeKey[]

export function pickRandomCharacters(count: number): string[] {
  const shuffled = [...UNDEAD_CHARACTER_POOL].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function pickRandomChallengeKey(enabledKeys?: string[]): UndeadChallengeKey {
  const normalized =
    enabledKeys && enabledKeys.length > 0
      ? (enabledKeys.filter((k) => k in UNDEAD_CHALLENGE_DEFINITIONS) as UndeadChallengeKey[])
      : ALL_UNDEAD_CHALLENGE_KEYS
  const keys = normalized.length > 0 ? normalized : ALL_UNDEAD_CHALLENGE_KEYS
  const idx = Math.floor(Math.random() * keys.length)
  return keys[idx]
}

export function getChallengeLabel(key: string | null | undefined): string | null {
  if (!key) return null
  const def = (UNDEAD_CHALLENGE_DEFINITIONS as Record<string, { label: string }>)[key]
  return def?.label ?? null
}

