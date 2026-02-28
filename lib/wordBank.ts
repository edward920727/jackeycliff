import { 
  collection,
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Firestore,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore'
import { db } from './firebase'
import { WordBank } from '@/types/game'

/**
 * 獲取所有題庫
 */
export async function getAllWordBanks(): Promise<WordBank[]> {
  try {
    const wordBanksRef = collection(db, 'wordBanks')
    const q = query(wordBanksRef, orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WordBank))
  } catch (error) {
    console.error('Error getting word banks:', error)
    throw error
  }
}

/**
 * 獲取單個題庫
 */
export async function getWordBank(bankId: string): Promise<WordBank | null> {
  try {
    const wordBankRef = doc(db, 'wordBanks', bankId)
    const wordBankSnap = await getDoc(wordBankRef)
    
    if (wordBankSnap.exists()) {
      return {
        id: wordBankSnap.id,
        ...wordBankSnap.data()
      } as WordBank
    }
    return null
  } catch (error) {
    console.error('Error getting word bank:', error)
    throw error
  }
}

/**
 * 創建新題庫
 */
export async function createWordBank(name: string, words: string[]): Promise<string> {
  try {
    const wordBankRef = doc(collection(db, 'wordBanks'))
    const wordBankData: WordBank = {
      id: wordBankRef.id,
      name,
      words,
      created_at: new Date(),
      updated_at: new Date(),
      is_default: false,
    }
    await setDoc(wordBankRef, wordBankData)
    return wordBankRef.id
  } catch (error) {
    console.error('Error creating word bank:', error)
    throw error
  }
}

/**
 * 更新題庫
 */
export async function updateWordBank(bankId: string, name: string, words: string[]): Promise<void> {
  try {
    const wordBankRef = doc(db, 'wordBanks', bankId)
    await updateDoc(wordBankRef, {
      name,
      words,
      updated_at: new Date(),
    })
  } catch (error) {
    console.error('Error updating word bank:', error)
    throw error
  }
}

/**
 * 刪除題庫
 */
export async function deleteWordBank(bankId: string): Promise<void> {
  try {
    const wordBankRef = doc(db, 'wordBanks', bankId)
    await deleteDoc(wordBankRef)
  } catch (error) {
    console.error('Error deleting word bank:', error)
    throw error
  }
}

/**
 * 從題庫中隨機抽取指定數量的詞彙
 */
export function randomSelectWords(words: string[], count: number): string[] {
  if (words.length <= count) {
    return [...words].sort(() => Math.random() - 0.5)
  }
  
  const shuffled = [...words].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * 創建預設1000個名詞題庫
 */
export async function createDefaultWordBank1000(): Promise<string> {
  const { DEFAULT_WORD_BANK_1000 } = await import('./defaultWordBank1000')
  
  // 檢查是否已經存在
  const wordBanks = await getAllWordBanks()
  const existing = wordBanks.find(bank => bank.name === '機密代號大型題庫（1000個詞彙）')
  
  if (existing) {
    throw new Error('題庫「機密代號大型題庫（1000個詞彙）」已存在')
  }
  
  return await createWordBank('機密代號大型題庫（1000個詞彙）', DEFAULT_WORD_BANK_1000)
}
