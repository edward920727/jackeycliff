'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [roomId, setRoomId] = useState('')
  const [playerRole, setPlayerRole] = useState<'spymaster' | 'operative'>('operative')
  const router = useRouter()

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    router.push(`/game/${newRoomId}?role=${playerRole}`)
  }

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      router.push(`/game/${roomId.toUpperCase()}?role=${playerRole}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
          機密代號
        </h1>
        <p className="text-center text-gray-400 mb-8">Codenames Online</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              選擇角色
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPlayerRole('spymaster')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  playerRole === 'spymaster'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">隊長</div>
                <div className="text-xs mt-1">可看到所有顏色</div>
              </button>
              <button
                onClick={() => setPlayerRole('operative')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  playerRole === 'operative'
                    ? 'border-green-500 bg-green-500/20 text-green-300'
                    : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="font-semibold">隊員</div>
                <div className="text-xs mt-1">點擊後翻牌</div>
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              輸入房間代碼
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="例如: ABC123"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomId.trim()}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
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
