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
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-black/70"
      style={{
        backgroundImage: "url('/avalon-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-2xl bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-yellow-900/80 rounded-[1.75rem] shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-20 -top-24 w-56 h-56 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.35),_transparent_70%)]" />
          <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(148,91,40,0.4),_transparent_70%)]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-4">
            <button
              onClick={() => router.push('/')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-amber-100 border border-yellow-900/60 shadow-md"
            >
              ← 返回遊戲大廳
            </button>
            <button
              onClick={() => router.push('/avalon/rooms')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-b from-slate-900/90 to-slate-800/90 hover:from-slate-800 hover:to-slate-700 rounded-lg transition-colors text-[11px] sm:text-xs font-semibold text-amber-100/90 border border-yellow-900/60 shadow-md"
            >
              查看阿瓦隆房間列表
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl sm:text-4xl drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]">🏰</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-900 via-amber-800 to-amber-600 bg-clip-text text-transparent tracking-wide">
                阿瓦隆
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                建立或加入房間，等待房主按下開始後，所有人會一起進入遊戲畫面。
              </p>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-yellow-900 mb-1.5 tracking-wide">
                你的名字
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：小明"
                maxLength={20}
                className="w-full bg-amber-50/40 border border-amber-400/70 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-700 shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gradient-to-b from-amber-50/95 via-amber-100/95 to-amber-200/90 border border-yellow-900/60 rounded-xl p-3 sm:p-4 shadow-md">
                <h2 className="text-sm sm:text-base font-semibold text-yellow-900 mb-2 tracking-wide">
                  建立新房間
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-600 mb-3">
                  你將成為房主，分享房間代碼給朋友，他們輸入代碼即可加入。
                </p>
                <button
                  onClick={handleCreateRoom}
                  disabled={!clientId}
                  className="w-full px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-b from-sky-900 via-sky-800 to-sky-700 hover:from-sky-800 hover:to-sky-600 disabled:from-stone-400 disabled:via-stone-400 disabled:to-stone-400 disabled:cursor-not-allowed text-amber-50 font-semibold text-sm sm:text-base shadow-[0_10px_26px_rgba(15,23,42,0.9)] border border-yellow-500/70"
                >
                  建立新房間
                </button>
              </div>

              <div className="bg-gradient-to-b from-amber-50/95 via-amber-100/95 to-amber-200/90 border border-yellow-900/60 rounded-xl p-3 sm:p-4 shadow-md">
                <h2 className="text-sm sm:text-base font-semibold text-yellow-900 mb-2 tracking-wide">
                  加入現有房間
                </h2>
                <p className="text-[11px] sm:text-xs text-stone-600 mb-2">
                  請輸入房主分享給你的 6 碼房間代碼。
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="例如：AB12CD"
                    className="flex-1 bg-amber-50/40 border border-amber-400/70 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 font-mono shadow-inner"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!clientId}
                  className="w-full px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-amber-50 font-semibold text-sm sm:text-base transition-all border border-yellow-900/60 shadow-md"
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
