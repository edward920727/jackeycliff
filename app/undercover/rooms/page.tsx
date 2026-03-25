'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UndercoverGameData } from '@/types/undercover'
import { deleteUndercoverRoom, subscribeToAllUndercoverRooms } from '@/lib/undercover/firestore'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'undercoverClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `uc_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function UndercoverRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<UndercoverGameData[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    setClientId(getOrCreateClientId())
  }, [])

  useEffect(() => {
    const unsub = subscribeToAllUndercoverRooms((updated) => {
      setRooms(updated)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleJoinRoom = (roomId: string) => {
    if (!name.trim()) {
      alert('請先輸入你的名字（右上方輸入框）')
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
    router.push(`/undercover/${roomId}?${params.toString()}`)
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(`確定要刪除房間 ${roomId} 嗎？此操作無法復原。`)) return
    setIsDeleting(roomId)
    try {
      await deleteUndercoverRoom(roomId)
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

  const getRoomStatusText = (status: UndercoverGameData['status']) => {
    if (status === 'lobby') return '等待開始'
    if (status === 'playing') return '遊戲進行中'
    if (status === 'finished') return '遊戲已結束'
    return '未知'
  }

  return (
    <div
      className="min-h-screen bg-black/70 p-4 sm:p-6"
      style={{
        backgroundImage: "url('/undercover-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/undercover')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-100 border border-slate-600/80"
          >
            ← 返回「誰是臥底」大廳
          </button>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字"
            maxLength={20}
            className="w-32 sm:w-40 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1.5 text-[11px] sm:text-xs text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner"
          />
        </div>

        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-[0_22px_70px_rgba(0,0,0,0.85)] p-5 sm:p-7 mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent tracking-wide mb-1">
            誰是臥底房間列表
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            這裡會列出目前存在的房間，輸入名字後即可快速加入。
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-100">載入房間列表中...</div>
        ) : rooms.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 text-center shadow-md">
            <div className="text-4xl mb-3">🕶️</div>
            <div className="text-lg sm:text-xl font-semibold text-yellow-200 mb-1">
              目前沒有任何「誰是臥底」房間
            </div>
            <p className="text-sm text-slate-400">請先回到大廳建立新房間。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.room_id}
                className="bg-slate-900/90 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-lg text-slate-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[11px] sm:text-xs text-slate-400">房間代碼</div>
                    <div className="font-mono text-lg sm:text-xl tracking-[0.18em]">
                      {room.room_id}
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400">
                    建立時間：{formatTime(room.created_at)}
                  </div>
                </div>

                <div className="mb-2 text-xs sm:text-sm">
                  狀態：<span className="font-semibold text-yellow-300">{getRoomStatusText(room.status)}</span>
                </div>

                <div className="mb-4 text-xs sm:text-sm">
                  目前人數：
                  <span className="ml-1 font-semibold text-emerald-300">
                    {room.participants?.length ?? room.players?.length ?? 0} 人
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinRoom(room.room_id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-b from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-semibold border border-yellow-300/80 shadow-md"
                  >
                    加入房間
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room.room_id)}
                    disabled={isDeleting === room.room_id}
                    className="px-3 py-2 rounded-lg bg-gradient-to-b from-red-900 via-red-800 to-red-700 hover:from-red-800 hover:to-red-600 text-slate-50 text-xs sm:text-sm font-semibold border border-red-500/70 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDeleting === room.room_id ? '刪除中...' : '刪除'}
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
