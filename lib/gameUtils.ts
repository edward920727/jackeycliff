import { WordCard, CardColor } from '@/types/game'
import { createGame } from './firestore'
import { getWordBank, randomSelectWords } from './wordBank'

// 預設的 25 個詞彙（可以擴展）
export const DEFAULT_WORDS = [
  '蘋果', '香蕉', '橘子', '葡萄', '草莓',
  '老虎', '獅子', '大象', '猴子', '兔子',
  '飛機', '火車', '汽車', '船', '腳踏車',
  '太陽', '月亮', '星星', '雲', '雨',
  '書', '筆', '桌子', '椅子', '燈'
]

// 生成隨機的顏色分配（9 紅、8 藍、1 黑、7 米色）
function generateColorDistribution(): CardColor[] {
  const colors: CardColor[] = []
  // 9 個紅色
  for (let i = 0; i < 9; i++) colors.push('red')
  // 8 個藍色
  for (let i = 0; i < 8; i++) colors.push('blue')
  // 1 個黑色
  colors.push('black')
  // 7 個米色
  for (let i = 0; i < 7; i++) colors.push('beige')
  
  // 隨機打亂
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]]
  }
  
  return colors
}

/**
 * 初始化遊戲數據並存入 Firestore
 * @param roomId 房間 ID
 * @param wordBankId 可選的題庫 ID，如果不提供則使用預設詞彙
 * @param keepPlayers 是否保留現有玩家列表（用於重置遊戲）
 * @returns 生成的卡片陣列
 */
export async function initializeGame(roomId: string, wordBankId?: string, keepPlayers: boolean = false): Promise<WordCard[]> {
  // 生成隨機顏色分配
  const colors = generateColorDistribution()
  
  // 獲取詞彙列表
  let words: string[] = DEFAULT_WORDS
  if (wordBankId) {
    try {
      const wordBank = await getWordBank(wordBankId)
      if (wordBank && wordBank.words.length >= 25) {
        words = randomSelectWords(wordBank.words, 25)
      } else if (wordBank && wordBank.words.length > 0) {
        // 如果題庫詞彙不足 25 個，重複使用
        const selected = randomSelectWords(wordBank.words, Math.min(25, wordBank.words.length))
        while (selected.length < 25) {
          selected.push(...randomSelectWords(wordBank.words, Math.min(25 - selected.length, wordBank.words.length)))
        }
        words = selected.slice(0, 25)
      }
    } catch (error) {
      console.error('Error loading word bank, using default words:', error)
    }
  }
  
  // 隨機打亂詞彙
  const shuffledWords = [...words].sort(() => Math.random() - 0.5)
  
  // 創建 25 張卡片
  const cards: WordCard[] = shuffledWords.slice(0, 25).map((word, index) => ({
    word,
    color: colors[index],
    revealed: false,
  }))
  
  // 存入 Firestore
  await createGame(roomId, cards, keepPlayers)
  
  return cards
}

/**
 * 僅生成遊戲數據（不存入資料庫）
 * 用於測試或預覽
 */
export function generateGameData(): WordCard[] {
  const colors = generateColorDistribution()
  const shuffledWords = [...DEFAULT_WORDS].sort(() => Math.random() - 0.5)
  
  return shuffledWords.slice(0, 25).map((word, index) => ({
    word,
    color: colors[index],
    revealed: false,
  }))
}
