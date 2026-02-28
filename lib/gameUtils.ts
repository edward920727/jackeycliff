import { WordCard, CardColor } from '@/types/game'
import { createGame } from './firestore'

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
 * @returns 生成的卡片陣列
 */
export async function initializeGame(roomId: string): Promise<WordCard[]> {
  // 生成隨機顏色分配
  const colors = generateColorDistribution()
  
  // 隨機打亂詞彙
  const shuffledWords = [...DEFAULT_WORDS].sort(() => Math.random() - 0.5)
  
  // 創建 25 張卡片
  const cards: WordCard[] = shuffledWords.slice(0, 25).map((word, index) => ({
    word,
    color: colors[index],
    revealed: false,
  }))
  
  // 存入 Firestore
  await createGame(roomId, cards)
  
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
