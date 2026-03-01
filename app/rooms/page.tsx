'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllRooms, subscribeToAllRooms, deleteAllRooms, GameData } from '@/lib/firestore'

export default function RoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<GameData[]>([])
  const [loading, setLoading] = useState(true)
  const [playerName, setPlayerName] = useState('')
  const [playerRole, setPlayerRole] = useState<'spymaster' | 'operative'>('operative')
  const [playerTeam, setPlayerTeam] = useState<'red' | 'blue' | ''>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [roomId, setRoomId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // 從 localStorage 獲取玩家名稱（如果有的話）
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }

    // 訂閱房間列表的實時更新
    const unsubscribe = subscribeToAllRooms((updatedRooms) => {
      setRooms(updatedRooms)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleJoinRoom = (roomId: string) => {
    if (!playerName.trim()) {
      alert('請先輸入您的名字')
      return
    }
    if (!playerTeam) {
      alert('請選擇隊伍（紅隊或藍隊）')
      return
    }

    // 保存玩家名稱到 localStorage
    localStorage.setItem('playerName', playerName.trim())

    const params = new URLSearchParams({
      role: playerRole,
      name: playerName.trim(),
      team: playerTeam, // 隊伍是必選的
    })
    router.push(`/game/${roomId}?${params.toString()}`)
  }

  const handleJoinRoomByCode = () => {
    if (!roomId.trim()) {
      alert('請輸入房間代碼')
      return
    }
    if (!playerName.trim()) {
      alert('請先輸入您的名字')
      return
    }
    if (!playerTeam) {
      alert('請選擇隊伍（紅隊或藍隊）')
      return
    }

    // 保存玩家名稱到 localStorage
    localStorage.setItem('playerName', playerName.trim())

    const params = new URLSearchParams({
      role: playerRole,
      name: playerName.trim(),
      team: playerTeam, // 隊伍是必選的
    })
    router.push(`/game/${roomId.toUpperCase()}?${params.toString()}`)
  }

  const handleDeleteAllRooms = async () => {
    if (!confirm('⚠️ 確定要刪除所有房間嗎？此操作無法復原！')) {
      return
    }
    
    if (!confirm('再次確認：真的要刪除所有房間嗎？')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteAllRooms()
      alert('✅ 所有房間已成功刪除！')
    } catch (error: any) {
      console.error('Error deleting all rooms:', error)
      alert('❌ 刪除失敗：' + (error.message || '未知錯誤'))
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '未知時間'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      
      if (minutes < 1) return '剛剛'
      if (minutes < 60) return `${minutes} 分鐘前`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours} 小時前`
      const days = Math.floor(hours / 24)
      return `${days} 天前`
    } catch {
      return '未知時間'
    }
  }

  const getRedCount = (room: GameData) => {
    return room.words_data?.filter(card => card.color === 'red' && !card.revealed).length || 0
  }

  const getBlueCount = (room: GameData) => {
    return room.words_data?.filter(card => card.color === 'blue' && !card.revealed).length || 0
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 relative overflow-hidden">
      {/* 全屏背景图片 - 机密行动主题（Unsplash 无版权图片） */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div 
          className="h-full w-full animate-background"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)',
            backgroundSize: '120%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* 背景图片的覆盖层，确保内容可读性 */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* 返回按鈕 */}
        <button
          onClick={() => router.push('/')}
          className="mb-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-semibold"
        >
          ← 返回首頁
        </button>

        {/* 標題 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
              房間列表
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">選擇一個房間加入遊戲</p>
          </div>
          {rooms.length > 0 && (
            <button
              onClick={handleDeleteAllRooms}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-sm sm:text-base whitespace-nowrap"
            >
              {isDeleting ? '刪除中...' : '🗑️ 刪除所有房間'}
            </button>
          )}
        </div>

        {/* 輸入房間代碼 */}
        <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 mb-6 border border-gray-700/50">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">輸入房間代碼</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="例如: ABC123"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
            />
            <button
              onClick={handleJoinRoomByCode}
              disabled={!roomId.trim() || !playerName.trim() || !playerTeam}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold px-4 sm:px-6 py-2 rounded-lg transition-all text-sm sm:text-base whitespace-nowrap"
            >
              加入房間
            </button>
          </div>
        </div>

        {/* 玩家信息設置 */}
        <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 mb-6 border border-gray-700/50">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">玩家設置</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                輸入您的名字
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="例如: 小明"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                選擇角色
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPlayerRole('spymaster')
                    setPlayerTeam('')
                  }}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                    playerRole === 'spymaster'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  隊長
                </button>
                <button
                  onClick={() => {
                    setPlayerRole('operative')
                    setPlayerTeam('')
                  }}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                    playerRole === 'operative'
                      ? 'border-green-500 bg-green-500/20 text-green-300'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  隊員
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                選擇隊伍（必選）
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPlayerTeam('red')}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                    playerTeam === 'red'
                      ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold">🔴 紅隊</div>
                  <div className="text-[10px] sm:text-xs mt-1 text-gray-400">
                    {playerRole === 'spymaster' ? '紅隊隊長' : '紅隊隊員'}
                  </div>
                </button>
                <button
                  onClick={() => setPlayerTeam('blue')}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                    playerTeam === 'blue'
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold">🔵 藍隊</div>
                  <div className="text-[10px] sm:text-xs mt-1 text-gray-400">
                    {playerRole === 'spymaster' ? '藍隊隊長' : '藍隊隊員'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 房間列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-400">載入房間列表中...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-12 border border-gray-700/50 text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-2">目前沒有房間</h3>
            <p className="text-gray-400 mb-6">返回首頁創建新房間吧！</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg transition-all"
            >
              返回首頁
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const redCount = getRedCount(room)
              const blueCount = getBlueCount(room)
              const playerCount = room.players?.length || 0
              const redPlayers = room.players?.filter(p => p.team === 'red').length || 0
              const bluePlayers = room.players?.filter(p => p.team === 'blue').length || 0

              return (
                <div
                  key={room.room_id}
                  className="bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-lg p-4 sm:p-5 border border-gray-700/50 hover:border-blue-500/50 transition-all"
                >
                  {/* 房間號 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎮</span>
                      <span className="font-bold text-lg sm:text-xl text-white">
                        {room.room_id}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatTime(room.created_at)}
                    </span>
                  </div>

                  {/* 當前回合 */}
                  <div className="mb-3">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      room.current_turn === 'red'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                    }`}>
                      {room.current_turn === 'red' ? '🔴 紅隊回合' : '🔵 藍隊回合'}
                    </div>
                  </div>

                  {/* 分數 */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-2">
                      <div className="text-xs text-gray-400 mb-1">紅隊剩餘</div>
                      <div className="text-lg font-bold text-red-400">{redCount}</div>
                    </div>
                    <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-2">
                      <div className="text-xs text-gray-400 mb-1">藍隊剩餘</div>
                      <div className="text-lg font-bold text-blue-400">{blueCount}</div>
                    </div>
                  </div>

                  {/* 玩家信息 */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">玩家 ({playerCount})</div>
                    <div className="flex gap-2 text-xs">
                      <span className="text-red-300">🔴 {redPlayers}</span>
                      <span className="text-blue-300">🔵 {bluePlayers}</span>
                    </div>
                  </div>

                  {/* 加入按鈕 */}
                  <button
                    onClick={() => handleJoinRoom(room.room_id)}
                    disabled={!playerName.trim() || !playerTeam}
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
                  >
                    加入房間
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
