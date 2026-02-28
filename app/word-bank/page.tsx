'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllWordBanks, createWordBank, updateWordBank, deleteWordBank, createDefaultWordBank1000 } from '@/lib/wordBank'
import { WordBank } from '@/types/game'
import { DEFAULT_WORDS } from '@/lib/gameUtils'
import { DEFAULT_WORD_BANK_100 } from '@/lib/defaultWordBank'

export default function WordBankPage() {
  const router = useRouter()
  const [wordBanks, setWordBanks] = useState<WordBank[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBank, setEditingBank] = useState<WordBank | null>(null)
  const [bankName, setBankName] = useState('')
  const [bankWords, setBankWords] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadWordBanks()
  }, [])

  const loadWordBanks = async () => {
    try {
      setLoading(true)
      const banks = await getAllWordBanks()
      setWordBanks(banks)
    } catch (err: any) {
      setError(err.message || '載入題庫失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!bankName.trim()) {
      alert('請輸入題庫名稱')
      return
    }
    
    const words = bankWords
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0)
    
    if (words.length < 25) {
      alert('題庫至少需要 25 個詞彙')
      return
    }

    try {
      await createWordBank(bankName.trim(), words)
      setShowCreateModal(false)
      setBankName('')
      setBankWords('')
      loadWordBanks()
    } catch (err: any) {
      alert(err.message || '創建題庫失敗')
    }
  }

  const handleUpdate = async () => {
    if (!editingBank || !bankName.trim()) {
      return
    }
    
    const words = bankWords
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0)
    
    if (words.length < 25) {
      alert('題庫至少需要 25 個詞彙')
      return
    }

    try {
      await updateWordBank(editingBank.id, bankName.trim(), words)
      setEditingBank(null)
      setBankName('')
      setBankWords('')
      loadWordBanks()
    } catch (err: any) {
      alert(err.message || '更新題庫失敗')
    }
  }

  const handleDelete = async (bankId: string) => {
    if (!confirm('確定要刪除這個題庫嗎？')) {
      return
    }

    try {
      await deleteWordBank(bankId)
      loadWordBanks()
    } catch (err: any) {
      alert(err.message || '刪除題庫失敗')
    }
  }

  const handleEdit = (bank: WordBank) => {
    setEditingBank(bank)
    setBankName(bank.name)
    setBankWords(bank.words.join('\n'))
    setShowCreateModal(true)
  }

  const handleUseDefault = () => {
    setBankName('預設題庫（25個詞彙）')
    setBankWords(DEFAULT_WORDS.join('\n'))
    setShowCreateModal(true)
  }

  const handleCreateDefault100 = async () => {
    try {
      // 檢查是否已經存在預設100題庫
      const existing = wordBanks.find(bank => bank.name === '機密代號預設題庫（100個詞彙）')
      if (existing) {
        alert('預設100題庫已存在！')
        return
      }
      
      await createWordBank('機密代號預設題庫（100個詞彙）', DEFAULT_WORD_BANK_100)
      loadWordBanks()
      alert('預設100題庫創建成功！')
    } catch (err: any) {
      alert(err.message || '創建題庫失敗')
    }
  }

  const handleCreateDefault1000 = async () => {
    if (!confirm('確定要創建「機密代號大型題庫（1000個詞彙）」嗎？')) {
      return
    }
    try {
      await createDefaultWordBank1000()
      alert('大型1000題庫創建成功！')
      loadWordBanks()
    } catch (err: any) {
      alert(err.message || '創建題庫失敗')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => router.push('/')}
            className="mb-3 sm:mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-xs sm:text-sm font-semibold"
          >
            ← 返回首頁
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
              題庫管理
            </h1>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={handleUseDefault}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold"
              >
                預設25題庫
              </button>
              <button
                onClick={handleCreateDefault100}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold"
              >
                創建100題庫
              </button>
              <button
                onClick={handleCreateDefault1000}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold"
              >
                創建1000題庫
              </button>
              <button
                onClick={() => {
                  setEditingBank(null)
                  setBankName('')
                  setBankWords('')
                  setShowCreateModal(true)
                }}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold"
              >
                + 新增題庫
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {wordBanks.map((bank) => (
            <div
              key={bank.id}
              className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white break-words flex-1">{bank.name}</h3>
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(bank)}
                    className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm px-1"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(bank.id)}
                    className="text-red-400 hover:text-red-300 text-xs sm:text-sm px-1"
                  >
                    刪除
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                {bank.words.length} 個詞彙
              </p>
              <div className="text-[10px] sm:text-xs text-gray-500 max-h-16 sm:max-h-20 overflow-y-auto">
                {bank.words.slice(0, 10).join(', ')}
                {bank.words.length > 10 && '...'}
              </div>
            </div>
          ))}
        </div>

        {wordBanks.length === 0 && (
          <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-gray-400 mb-4">還沒有題庫</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-semibold"
            >
              創建第一個題庫
            </button>
          </div>
        )}

        {/* 創建/編輯題庫對話框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-gray-800 rounded-xl border-2 border-gray-700 p-4 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                {editingBank ? '編輯題庫' : '新增題庫'}
              </h3>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    題庫名稱
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="例如: 動物題庫"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    詞彙列表（每行一個，至少 25 個）
                  </label>
                  <textarea
                    value={bankWords}
                    onChange={(e) => setBankWords(e.target.value)}
                    placeholder="蘋果&#10;香蕉&#10;橘子&#10;..."
                    rows={12}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                    目前: {bankWords.split('\n').filter(w => w.trim().length > 0).length} 個詞彙
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingBank(null)
                    setBankName('')
                    setBankWords('')
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                >
                  取消
                </button>
                <button
                  onClick={editingBank ? handleUpdate : handleCreate}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base"
                >
                  {editingBank ? '更新' : '創建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
