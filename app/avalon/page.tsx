'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'avalonClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `cli_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function AvalonLobby() {
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
    router.push(`/avalon/${newRoomId}?${params.toString()}`)
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
    router.push(`/avalon/${roomId}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <button
            onClick={() => router.push('/')}
            className="mb-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-200"
          >
            ← 返回遊戲大廳
          </button>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl sm:text-4xl">🏰</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                阿瓦隆
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                建立或加入房間，等待房主按下開始後，所有人會一起進入遊戲畫面。
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-200 mb-1.5">
                你的名字
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小明"
                maxLength={20}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 sm:p-4">
                <h2 className="text-sm sm:text-base font-semibold text-slate-100 mb-2">
                  建立新房間
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mb-3">
                  你將成為房主，分享房間代碼給朋友，他們輸入代碼即可加入。
                </p>
                <button
                  onClick={handleCreateRoom}
                  disabled={!clientId}
                  className="w-full px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base shadow-lg transition-all"
                >
                  建立新房間
                </button>
              </div>

              <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 sm:p-4">
                <h2 className="text-sm sm:text-base font-semibold text-slate-100 mb-2">
                  加入現有房間
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mb-2">
                  請輸入房主分享給你的 6 碼房間代碼。
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="例如：AB12CD"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!clientId}
                  className="w-full px-3 sm:px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm sm:text-base transition-all"
                >
                  加入房間
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
