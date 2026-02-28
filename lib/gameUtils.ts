import { WordCard, CardColor } from '@/types/game'
import { createGame, getGame } from './firestore'
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
 * 從詞彙列表中選擇不重複的詞彙（盡量避免與上一場重複）
 */
function selectWordsAvoidingPrevious(
  allWords: string[],
  count: number,
  previousWords: string[] = []
): string[] {
  // 如果沒有上一場的詞彙，直接隨機選擇
  if (previousWords.length === 0) {
    return randomSelectWords(allWords, count)
  }

  // 過濾掉上一場使用的詞彙
  const availableWords = allWords.filter(word => !previousWords.includes(word))
  
  // 如果可用詞彙足夠，直接從中選擇
  if (availableWords.length >= count) {
    return randomSelectWords(availableWords, count)
  }
  
  // 如果可用詞彙不足，優先選擇不重複的，不足的部分再從全部詞彙中選擇
  const selected: string[] = []
  
  // 先選擇所有不重複的詞彙
  if (availableWords.length > 0) {
    selected.push(...randomSelectWords(availableWords, availableWords.length))
  }
  
  // 如果還需要更多詞彙，從全部詞彙中隨機選擇（可能會有重複，但盡量減少）
  const remaining = count - selected.length
  if (remaining > 0) {
    // 從全部詞彙中選擇，但優先選擇不在已選列表中的
    const remainingWords = allWords.filter(word => !selected.includes(word))
    if (remainingWords.length >= remaining) {
      selected.push(...randomSelectWords(remainingWords, remaining))
    } else {
      // 如果還是不夠，只能從全部詞彙中選擇（可能會有重複）
      selected.push(...randomSelectWords(allWords, remaining))
    }
  }
  
  return selected.slice(0, count)
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
  
  // 獲取這個房間使用過的所有詞彙（如果是重置遊戲）
  let usedWordsInRoom: string[] = []
  let existingWordBankId: string | undefined = wordBankId
  if (keepPlayers) {
    try {
      const previousGame = await getGame(roomId)
      if (previousGame) {
        // 獲取這個房間使用過的所有詞彙
        usedWordsInRoom = previousGame.used_words || []
        
        // 如果當前沒有指定題庫，使用房間記錄的題庫
        if (!wordBankId && previousGame.word_bank_id) {
          existingWordBankId = previousGame.word_bank_id
        } else if (wordBankId) {
          existingWordBankId = wordBankId
        }
        
        // 將上一場的詞彙也加入已使用列表（如果還沒有記錄）
        if (previousGame.words_data) {
          const lastGameWords = previousGame.words_data.map(card => card.word)
          lastGameWords.forEach(word => {
            if (!usedWordsInRoom.includes(word)) {
              usedWordsInRoom.push(word)
            }
          })
        }
      }
    } catch (error) {
      console.error('Error getting previous game words:', error)
    }
  }
  
  // 獲取詞彙列表（使用房間記錄的題庫ID）
  let allWords: string[] = DEFAULT_WORDS
  const wordBankIdToUse = existingWordBankId || wordBankId
  if (wordBankIdToUse) {
    try {
      const wordBank = await getWordBank(wordBankIdToUse)
      if (wordBank && wordBank.words.length > 0) {
        allWords = wordBank.words
      }
    } catch (error) {
      console.error('Error loading word bank, using default words:', error)
    }
  }
  
  // 選擇詞彙（從題庫中選擇沒有在這個房間使用過的詞彙）
  let words: string[] = []
  if (allWords.length >= 25) {
    // 過濾掉這個房間使用過的所有詞彙
    const availableWords = allWords.filter(word => !usedWordsInRoom.includes(word))
    
    if (availableWords.length >= 25) {
      // 如果可用詞彙足夠，直接從中選擇
      words = randomSelectWords(availableWords, 25)
    } else if (availableWords.length > 0) {
      // 如果可用詞彙不足但還有一些，先選擇所有可用的，然後從全部詞彙中補充
      words = [...availableWords]
      const remaining = 25 - words.length
      const additionalWords = allWords.filter(word => !words.includes(word))
      if (additionalWords.length >= remaining) {
        words.push(...randomSelectWords(additionalWords, remaining))
      } else {
        words.push(...randomSelectWords(allWords, remaining))
      }
      words = words.slice(0, 25)
    } else {
      // 如果所有詞彙都用過了，重置已使用列表並重新選擇
      usedWordsInRoom = []
      words = randomSelectWords(allWords, 25)
    }
  } else if (allWords.length > 0) {
    // 如果題庫詞彙不足 25 個，需要重複使用
    const availableWords = allWords.filter(word => !usedWordsInRoom.includes(word))
    const selected: string[] = []
    
    // 先選擇所有未使用的詞彙
    if (availableWords.length > 0) {
      selected.push(...randomSelectWords(availableWords, Math.min(25, availableWords.length)))
    }
    
    // 如果還需要更多詞彙，從全部詞彙中選擇
    while (selected.length < 25) {
      const remaining = 25 - selected.length
      const remainingWords = allWords.filter(word => !selected.includes(word))
      if (remainingWords.length >= remaining) {
        selected.push(...randomSelectWords(remainingWords, remaining))
      } else {
        selected.push(...randomSelectWords(allWords, remaining))
      }
    }
    words = selected.slice(0, 25)
  }
  
  // 更新已使用詞彙列表
  const newUsedWords = [...usedWordsInRoom]
  words.forEach(word => {
    if (!newUsedWords.includes(word)) {
      newUsedWords.push(word)
    }
  })
  
  // 隨機打亂詞彙
  const shuffledWords = [...words].sort(() => Math.random() - 0.5)
  
  // 創建 25 張卡片
  const cards: WordCard[] = shuffledWords.slice(0, 25).map((word, index) => ({
    word,
    color: colors[index],
    revealed: false,
  }))
  
  // 存入 Firestore（傳遞已使用詞彙列表和題庫ID）
  await createGame(roomId, cards, keepPlayers, keepPlayers, newUsedWords, wordBankIdToUse)
  
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
