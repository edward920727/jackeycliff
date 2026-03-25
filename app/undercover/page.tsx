'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'undercoverClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `uc_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function UndercoverLobby() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    setClientId(getOrCreateClientId())
  }, [])

  const handleCreateRoom = () => {
    if (!name.trim()) {
      alert('請先輸入你的名字')
      return
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const params = new URLSearchParams({
      role: 'host',
      name: name.trim(),
      pid: clientId,
    })
    router.push(`/undercover/${newRoomId}?${params.toString()}`)
  }

  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) {
      alert('請輸入房間代碼')
      return
    }
    if (!name.trim()) {
      alert('請先輸入你的名字')
      return
    }
    const roomId = roomIdInput.trim().toUpperCase()
    const params = new URLSearchParams({
      role: 'player',
      name: name.trim(),
      pid: clientId,
    })
    router.push(`/undercover/${roomId}?${params.toString()}`)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-black/70"
      style={{
        backgroundImage: "url('/undercover-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-[0_22px_70px_rgba(0,0,0,0.85)] p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-100 border border-slate-600/80"
          >
            ← 返回遊戲大廳
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/undercover/rules')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800/90 hover:bg-slate-700/90 rounded-lg transition-colors text-[11px] sm:text-xs font-semibold text-slate-100 border border-slate-600/80"
            >
              遊戲規則
            </button>
            <button
              onClick={() => router.push('/undercover/rooms')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800/90 hover:bg-slate-700/90 rounded-lg transition-colors text-[11px] sm:text-xs font-semibold text-slate-100 border border-slate-600/80"
            >
              查看房間列表
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl sm:text-4xl drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]">
            🕶️
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent tracking-wide">
              誰是臥底
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              大家拿到相似的詞彙，只有臥底拿到有點不一樣的詞。透過描述與投票，找出那個裝懂的人！
            </p>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-100 mb-1.5 tracking-wide">
              你的名字
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小明"
              maxLength={20}
              className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 sm:p-4 shadow-md">
              <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-2 tracking-wide">
                建立新房間
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mb-3">
                你將成為房主，分享房間代碼給朋友，他們輸入代碼即可加入。
              </p>
              <button
                onClick={handleCreateRoom}
                disabled={!clientId}
                className="w-full px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-b from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-slate-500 disabled:to-slate-500 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm sm:text-base shadow-[0_10px_26px_rgba(0,0,0,0.8)] border border-yellow-300/80"
              >
                建立新房間
              </button>
            </div>

            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 sm:p-4 shadow-md">
              <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-2 tracking-wide">
                加入現有房間
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mb-2">
                請輸入房主分享給你的 6 碼房間代碼。
              </p>
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="例如：AB12CD"
                  className="flex-1 bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono shadow-inner"
                />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={!clientId}
                className="w-full px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-b from-slate-800 via-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 disabled:from-slate-500 disabled:to-slate-500 disabled:cursor-not-allowed text-slate-50 font-semibold text-sm sm:text-base border border-slate-500/80 shadow-md"
              >
                加入房間
              </button>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            建議 3–10 人一起遊玩，可搭配語音通話（Discord / Google Meet / Line）使用。
          </p>
        </div>
      </div>
    </div>
  )
}


