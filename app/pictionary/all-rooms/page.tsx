'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PictionaryGameData } from '@/types/pictionary'
import {
  deletePictionaryRoom,
  formatPictionaryFirestoreError,
  getAllPictionaryRooms,
  subscribeToAllPictionaryRooms,
} from '@/lib/pictionary/firestore'
import { pictionaryBackgroundStyle } from '@/lib/pictionary/constants'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'pictionaryClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `pt_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function PictionaryAllRoomsPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<PictionaryGameData[]>([])
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    setClientId(getOrCreateClientId())
    let cancelled = false

    async function loadInitial() {
      try {
        const initial = await getAllPictionaryRooms()
        if (!cancelled) {
          setRooms(initial)
          setListError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setListError(formatPictionaryFirestoreError(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadInitial()

    const unsub = subscribeToAllPictionaryRooms(
      (updated) => {
        if (!cancelled) {
          setRooms(updated)
          setListError(null)
        }
      },
      (err) => {
        if (!cancelled) {
          setListError(formatPictionaryFirestoreError(err))
        }
      }
    )

    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false)
    }, 12000)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      unsub()
    }
  }, [])

  const handleJoin = (roomId: string) => {
    if (!name.trim()) {
      alert('請先輸入你的名字')
      return
    }
    const params = new URLSearchParams({
      role: 'player',
      name: name.trim(),
      pid: clientId,
    })
    router.push(`/pictionary/${roomId}?${params.toString()}`)
  }

  const handleDelete = async (roomId: string) => {
    if (!confirm(`確定刪除房間 ${roomId}？`)) return
    try {
      await deletePictionaryRoom(roomId)
    } catch (err) {
      alert(formatPictionaryFirestoreError(err))
    }
  }

  return (
    <div
      className="min-h-screen text-white p-4 sm:p-6 bg-black/60"
      style={pictionaryBackgroundStyle}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-2">
          <Link
            href="/pictionary"
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm"
          >
            ← 返回你畫我猜大廳
          </Link>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="你的名字"
            className="w-36 sm:w-44 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs sm:text-sm"
          />
        </div>

        <h1 className="text-2xl font-bold mb-4">你畫我猜房間列表</h1>

        {listError && (
          <div className="mb-4 rounded-xl border border-rose-600 bg-rose-950/40 p-3 text-sm text-rose-100">
            {listError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-300">載入中...</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-gray-300">目前沒有房間。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div key={room.room_id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono tracking-widest">{room.room_id}</div>
                  <div className="text-xs text-gray-400">{room.status}</div>
                </div>
                <div className="text-sm text-gray-300 mb-3">
                  人數：{room.participants?.length ?? 0}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleJoin(room.room_id)}
                    className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-2 text-sm font-semibold"
                  >
                    加入
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(room.room_id)}
                    className="rounded-lg bg-gray-700 hover:bg-gray-600 px-3 py-2 text-sm"
                  >
                    刪除
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
