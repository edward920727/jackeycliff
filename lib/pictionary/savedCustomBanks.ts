/** 本機儲存的自訂題庫（localStorage，僅此瀏覽器） */

const STORAGE_KEY = 'pictionary_saved_custom_banks_v1'
const MAX_SAVED = 40
const MAX_NAME_LEN = 32

export interface SavedCustomBank {
  id: string
  name: string
  words: string[]
  updatedAt: number
}

function readAll(): SavedCustomBank[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedCustomBank[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((b) => b && typeof b.id === 'string' && Array.isArray(b.words))
  } catch {
    return []
  }
}

function writeAll(banks: SavedCustomBank[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(banks))
  } catch {
    /* quota */
  }
}

export function listSavedCustomBanks(): SavedCustomBank[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt)
}

/** 同名則覆蓋詞彙與更新時間 */
export function upsertSavedCustomBank(
  name: string,
  words: string[]
): { ok: true } | { ok: false; error: string } {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: '請輸入題庫名稱' }
  if (trimmed.length > MAX_NAME_LEN) return { ok: false, error: `名稱最長 ${MAX_NAME_LEN} 字` }
  if (words.length < 3) return { ok: false, error: '至少 3 個詞才能儲存' }

  let banks = readAll()
  const now = Date.now()
  const idx = banks.findIndex((b) => b.name.trim() === trimmed)
  if (idx >= 0) {
    banks[idx] = { ...banks[idx], words: [...words], updatedAt: now }
  } else {
    if (banks.length >= MAX_SAVED) {
      banks = [...banks].sort((a, b) => a.updatedAt - b.updatedAt)
      banks.shift()
    }
    banks.push({
      id: `sb_${now}_${Math.random().toString(36).slice(2, 9)}`,
      name: trimmed,
      words: [...words],
      updatedAt: now,
    })
  }
  writeAll(banks)
  return { ok: true }
}

export function deleteSavedCustomBank(id: string): void {
  writeAll(readAll().filter((b) => b.id !== id))
}

export function getSavedCustomBank(id: string): SavedCustomBank | null {
  return readAll().find((b) => b.id === id) ?? null
}
