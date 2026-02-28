'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllWordBanks } from '@/lib/wordBank'
import { WordBank } from '@/types/game'

export default function Home() {
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerRole, setPlayerRole] = useState<'spymaster' | 'operative'>('operative')
  const [playerTeam, setPlayerTeam] = useState<'red' | 'blue' | ''>('')
  const [wordBanks, setWordBanks] = useState<WordBank[]>([])
  const [selectedWordBank, setSelectedWordBank] = useState<string>('')
  const [loadingBanks, setLoadingBanks] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadWordBanks()
  }, [])

  const loadWordBanks = async () => {
    try {
      const banks = await getAllWordBanks()
      setWordBanks(banks)
    } catch (error) {
      console.error('Error loading word banks:', error)
    } finally {
      setLoadingBanks(false)
    }
  }

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('請輸入您的名字')
      return
    }
    if (playerRole === 'spymaster' && !playerTeam) {
      alert('隊長請選擇隊伍（紅隊或藍隊）')
      return
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const params = new URLSearchParams({
      role: playerRole,
      name: playerName.trim(),
    })
    if (playerTeam) {
      params.append('team', playerTeam)
    }
    if (selectedWordBank) {
      params.append('wordBank', selectedWordBank)
    }
    router.push(`/game/${newRoomId}?${params.toString()}`)
  }

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      alert('請輸入房間代碼')
      return
    }
    if (!playerName.trim()) {
      alert('請輸入您的名字')
      return
    }
    if (playerRole === 'spymaster' && !playerTeam) {
      alert('隊長請選擇隊伍（紅隊或藍隊）')
      return
    }
    const params = new URLSearchParams({
      role: playerRole,
      name: playerName.trim(),
    })
    if (playerTeam) {
      params.append('team', playerTeam)
    }
    router.push(`/game/${roomId.toUpperCase()}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      
      {/* 右侧背景图片 */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden md:block">
        <div 
          className="h-full w-full"
          style={{
            backgroundImage: 'url(/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* 右侧图片的轻微覆盖层 */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      {/* 規則按鈕 - 左上角 */}
      <button
        onClick={() => router.push('/rules')}
        className="absolute top-4 left-4 z-20 px-3 sm:px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg transition-all text-xs sm:text-sm font-semibold text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500 shadow-lg"
      >
        📖 遊戲規則
      </button>

      {/* 房間列表按鈕 - 右上角 */}
      <button
        onClick={() => router.push('/rooms')}
        className="absolute top-4 right-4 z-20 px-3 sm:px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg transition-all text-xs sm:text-sm font-semibold text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500 shadow-lg"
      >
        🏠 房間列表
      </button>
      
      {/* 内容 */}
      <div className="relative z-10 bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-md border border-gray-700/50">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
          機密代號
        </h1>
        <p className="text-center text-gray-400 mb-4 sm:mb-6 md:mb-8 text-sm sm:text-base">Codenames Online</p>

        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              輸入您的名字
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="例如: 小明"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              選擇題庫（可選）
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <select
                value={selectedWordBank}
                onChange={(e) => setSelectedWordBank(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">使用預設題庫</option>
                {wordBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name} ({bank.words.length} 個詞彙)
                  </option>
                ))}
              </select>
              <button
                onClick={() => router.push('/word-bank')}
                className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
              >
                管理題庫
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              選擇角色
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setPlayerRole('spymaster')
                  setPlayerTeam('') // 重置隊伍選擇
                }}
                className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                  playerRole === 'spymaster'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-xs sm:text-sm">隊長</div>
                <div className="text-[10px] sm:text-xs mt-1">可看到所有顏色</div>
              </button>
              <button
                onClick={() => {
                  setPlayerRole('operative')
                  setPlayerTeam('') // 隊員不需要選擇隊伍
                }}
                className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                  playerRole === 'operative'
                    ? 'border-green-500 bg-green-500/20 text-green-300'
                    : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold text-xs sm:text-sm">隊員</div>
                <div className="text-[10px] sm:text-xs mt-1">點擊後翻牌</div>
              </button>
            </div>
          </div>

          {/* 隊長選擇隊伍 */}
          {playerRole === 'spymaster' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                選擇隊伍（隊長必選）
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setPlayerTeam('red')}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                    playerTeam === 'red'
                      ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold text-xs sm:text-sm">🔴 紅隊</div>
                  <div className="text-[10px] sm:text-xs mt-1">紅隊隊長</div>
                </button>
                <button
                  onClick={() => setPlayerTeam('blue')}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                    playerTeam === 'blue'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold text-xs sm:text-sm">🔵 藍隊</div>
                  <div className="text-[10px] sm:text-xs mt-1">藍隊隊長</div>
                </button>
              </div>
            </div>
          )}

          <div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              建立新房間
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">或</span>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              輸入房間代碼
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="例如: ABC123"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomId.trim()}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap"
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
