'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'muffinTimeClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `mt_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function MuffinTimeLobby() {
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
    router.push(`/muffin-time/${newRoomId}?${params.toString()}`)
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
    router.push(`/muffin-time/${roomId}?${params.toString()}`)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-black/70"
      style={{
        backgroundImage: "url('/lobby-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-2xl bg-amber-950/90 border border-amber-700/50 rounded-3xl shadow-[0_22px_70px_rgba(0,0,0,0.85)] p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-950 hover:bg-amber-900 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-amber-100 border border-amber-800"
          >
            ← 返回遊戲大廳
          </button>
          <button
            onClick={() => router.push('/muffin-time/rules')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-950/90 hover:bg-amber-900/90 rounded-lg transition-colors text-[11px] sm:text-xs font-semibold text-amber-100 border border-amber-800"
          >
            遊戲規則
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl sm:text-4xl">🥞</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 bg-clip-text text-transparent tracking-wide">
              吸爆鬆餅
            </h1>
            <p className="text-xs sm:text-sm text-amber-200/80 mt-1">
              簡化線上版｜派對卡牌風格（牌面為自創，非官方）
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-amber-200/90 mb-1">你的暱稱</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-amber-800/80 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="輸入名字"
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCreateRoom}
              className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-3 px-4 text-sm shadow-lg shadow-amber-900/40"
            >
              建立房間
            </button>
            <div className="flex flex-col gap-1">
              <input
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                className="rounded-xl bg-black/40 border border-amber-800/80 px-3 py-2 text-sm text-amber-50 placeholder:text-amber-200/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono"
                placeholder="房間代碼"
                maxLength={8}
              />
              <button
                onClick={handleJoinRoom}
                className="rounded-xl bg-amber-900/80 hover:bg-amber-800 border border-amber-700 text-amber-100 font-semibold py-2.5 px-4 text-sm"
              >
                加入房間
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
