'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'pictionaryClientId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `pt_${Math.random().toString(36).slice(2)}_${Date.now()}`
  window.localStorage.setItem(key, id)
  return id
}

export default function PictionaryLobbyPage() {
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
    router.push(`/pictionary/${newRoomId}?${params.toString()}`)
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
    const params = new URLSearchParams({
      role: 'player',
      name: name.trim(),
      pid: clientId,
    })
    router.push(`/pictionary/${roomIdInput.trim().toUpperCase()}?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-700 bg-gray-900/90 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700"
          >
            ← 返回遊戲大廳
          </button>
          <button
            onClick={() => router.push('/pictionary/rooms')}
            className="px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700"
          >
            查看房間列表
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-1">你畫我猜（連線版）</h1>
        <p className="text-sm text-gray-300 mb-5">建立房間後，朋友輸入代碼即可加入並即時同步畫圖。</p>

        <div className="space-y-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="你的名字"
            maxLength={20}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCreateRoom}
              disabled={!clientId}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 px-4 py-2 font-semibold"
            >
              建立新房間
            </button>

            <button
              onClick={handleJoinRoom}
              disabled={!clientId}
              className="rounded-xl bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 px-4 py-2 font-semibold"
            >
              加入房間
            </button>
          </div>

          <input
            value={roomIdInput}
            onChange={(event) => setRoomIdInput(event.target.value.toUpperCase())}
            placeholder="輸入 6 碼房間代碼"
            maxLength={6}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  )
}
