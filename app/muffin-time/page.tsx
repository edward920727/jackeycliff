'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeToRecentMuffinRooms, type MuffinRoomSummary } from '@/lib/muffin-time/firestore'

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
  const [rooms, setRooms] = useState<MuffinRoomSummary[]>([])

  useEffect(() => {
    setClientId(getOrCreateClientId())
  }, [])

  useEffect(() => {
    const unsub = subscribeToRecentMuffinRooms((data) => setRooms(data), { limit: 30 })
    return () => unsub()
  }, [])

  const lobbyRooms = useMemo(() => rooms.filter((r) => r.status === 'lobby'), [rooms])

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

          <div className="mt-6 rounded-2xl border border-amber-800/50 bg-black/25 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-amber-100">公開房間列表</h2>
              <div className="text-[10px] text-amber-300/70">點一下直接加入（僅顯示等待室）</div>
            </div>

            {lobbyRooms.length === 0 ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-xs text-amber-200/70">
                目前沒有可加入的房間。
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {lobbyRooms.slice(0, 12).map((r) => {
                  const count = r.participants?.length ?? 0
                  const canJoin = count < 8
                  return (
                    <button
                      key={r.room_id}
                      type="button"
                      onClick={() => {
                        if (!name.trim()) {
                          alert('請先輸入你的名字')
                          return
                        }
                        if (!canJoin) {
                          alert('房間已滿（最多 8 人）')
                          return
                        }
                        const params = new URLSearchParams({
                          role: 'player',
                          name: name.trim(),
                          pid: clientId,
                        })
                        router.push(`/muffin-time/${r.room_id}?${params.toString()}`)
                      }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-amber-800/50 bg-amber-950/70 px-3 py-2 text-left hover:bg-amber-900/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-amber-100">{r.room_id}</span>
                          <span className="rounded-full border border-amber-700/60 bg-black/30 px-2 py-0.5 text-[10px] text-amber-200/90 tabular-nums">
                            {count}/8
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-amber-200/70">等待室</div>
                      </div>
                      <div className="shrink-0 rounded-lg bg-amber-700/30 px-2.5 py-1 text-[10px] font-semibold text-amber-100">
                        加入
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
