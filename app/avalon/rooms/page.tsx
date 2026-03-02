'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AvalonGameData } from '@/types/avalon'
import { subscribeToAllAvalonRooms, deleteAvalonRoom } from '@/lib/avalon/firestore'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'avalonClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `cli_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function AvalonRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<AvalonGameData[]>([])
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')

  useEffect(() => {
    setClientId(getOrCreateClientId())
  }, [])

  useEffect(() => {
    const unsub = subscribeToAllAvalonRooms((updated) => {
      setRooms(updated)
      setLoading(false)
    })

    return () => {
      unsub()
    }
  }, [])

  const handleJoinRoom = (roomId: string) => {
    if (!name.trim()) {
      alert('請先輸入你的名字（下方輸入框）')
      return
    }
    if (!clientId) {
      alert('初始化中，請稍後再試一次')
      return
    }

    const params = new URLSearchParams({
      role: 'player',
      name: name.trim(),
      pid: clientId,
    })

    router.push(`/avalon/${roomId}?${params.toString()}`)
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(`確定要刪除房間 ${roomId} 嗎？此操作無法復原。`)) return

    setIsDeleting(roomId)
    try {
      await deleteAvalonRoom(roomId)
    } catch (err: any) {
      console.error(err)
      alert(err.message || '刪除房間失敗')
    } finally {
      setIsDeleting(null)
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '未知時間'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleString()
    } catch {
      return '未知時間'
    }
  }

  return (
    <div
      className="min-h-screen bg-black/70 p-4 sm:p-6"
      style={{
        backgroundImage: "url('/avalon-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/avalon')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-amber-100 border border-yellow-900/60 shadow-md"
          >
            ← 返回阿瓦隆大廳
          </button>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
              maxLength={20}
              className="w-32 sm:w-40 bg-amber-50/40 border border-amber-400/70 rounded-lg px-2 py-1.5 text-[11px] sm:text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 shadow-inner"
            />
          </div>
        </div>

        <div className="bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-yellow-900/80 rounded-[1.75rem] shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-900 via-amber-800 to-amber-600 bg-clip-text text-transparent tracking-wide mb-1">
            阿瓦隆房間列表
          </h1>
          <p className="text-xs sm:text-sm text-stone-700">
            這裡會列出目前存在的所有阿瓦隆房間，你可以從這裡快速查看房間狀態、或刪除不用的房間。
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-amber-100">
            載入房間列表中...
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-gradient-to-b from-amber-50/95 via-amber-100/95 to-amber-200/90 border border-yellow-900/70 rounded-2xl p-6 text-center shadow-md">
            <div className="text-4xl mb-3">🏰</div>
            <div className="text-lg sm:text-xl font-semibold text-yellow-900 mb-1">
              目前沒有任何阿瓦隆房間
            </div>
            <p className="text-sm text-stone-600">
              請先在阿瓦隆大廳建立一個新房間，這裡就會出現房間記錄。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.room_id}
                className="bg-gradient-to-b from-[#1e1309] via-[#23140a] to-[#120908] border-[3px] border-yellow-900/80 rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.85)] text-amber-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[11px] sm:text-xs text-amber-200/80">房間代碼</div>
                    <div className="font-mono text-lg sm:text-xl tracking-[0.18em]">
                      {room.room_id}
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-200/70">
                    建立時間：{formatTime(room.created_at)}
                  </div>
                </div>

                <div className="mt-2 mb-3 text-xs sm:text-sm text-amber-100/90">
                  狀態：
                  <span className="ml-1 font-semibold">
                    {room.status === 'lobby'
                      ? '等待開始'
                      : room.status === 'started'
                      ? '遊戲進行中'
                      : room.status === 'finished'
                      ? '遊戲已結束'
                      : '未知'}
                  </span>
                </div>

                <div className="mb-3 text-xs sm:text-sm text-amber-100/90">
                  玩家人數：
                  <span className="ml-1 font-semibold text-emerald-300">
                    {room.participants?.length ?? room.player_count ?? 0} 人
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinRoom(room.room_id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-b from-sky-900 via-sky-800 to-sky-700 hover:from-sky-800 hover:to-sky-600 text-amber-50 text-xs sm:text-sm font-semibold border border-yellow-500/70 shadow-md"
                  >
                    從大廳加入此房間
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.room_id)}
                    disabled={isDeleting === room.room_id}
                    className="px-3 py-2 rounded-lg bg-gradient-to-b from-red-900 via-red-800 to-red-700 hover:from-red-800 hover:to-red-600 text-amber-50 text-xs sm:text-sm font-semibold border border-red-500/70 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeleting === room.room_id ? '刪除中...' : '刪除房間'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

