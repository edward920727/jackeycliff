'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { PictionaryGameData } from '@/types/pictionary'
import {
  createPictionaryRoom,
  formatPictionaryFirestoreError,
  getPictionaryGame,
  joinPictionaryRoom,
  startPictionaryGame,
  subscribeToPictionaryGame,
} from '@/lib/pictionary/firestore'

function PictionaryRoomContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || '玩家'
  const pid = searchParams.get('pid') || ''
  const isHost = role === 'host'

  const [game, setGame] = useState<PictionaryGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (!pid) {
      setError('缺少玩家資訊，請從大廳重新加入。')
      setLoading(false)
      return
    }
    let unsub: (() => void) | null = null

    async function init() {
      try {
        const existing = await getPictionaryGame(roomId)
        if (!existing) {
          if (!isHost) {
            setError('房間不存在')
            return
          }
          const created = await createPictionaryRoom(roomId, {
            id: pid,
            name,
            isHost: true,
          })
          setGame(created)
        } else {
          setGame(existing)
          await joinPictionaryRoom(roomId, { id: pid, name, isHost })
        }

        unsub = subscribeToPictionaryGame(roomId, setGame, (err) => {
          setError(formatPictionaryFirestoreError(err))
        })
      } catch (err: unknown) {
        setError(formatPictionaryFirestoreError(err))
      } finally {
        setLoading(false)
      }
    }
    init()

    return () => {
      if (unsub) unsub()
    }
  }, [roomId, pid, name, isHost])

  useEffect(() => {
    if (!game || !pid) return
    if (game.status === 'playing' || game.status === 'finished') {
      const params = new URLSearchParams({
        role: isHost ? 'host' : 'player',
        name,
        pid,
      })
      router.push(`/pictionary/${roomId}/game?${params.toString()}`)
    }
  }, [game?.status, roomId, pid, isHost, name, router])

  const handleStart = async () => {
    if (!isHost) return
    try {
      setIsStarting(true)
      await startPictionaryGame(roomId)
    } catch (err: any) {
      alert(err.message || '開始失敗')
      setIsStarting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">載入中...</div>
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 p-4">
        <div className="max-w-lg rounded-xl border border-rose-600 bg-rose-950/40 p-4 text-sm">{error}</div>
        <button
          type="button"
          onClick={() => router.push('/pictionary')}
          className="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm hover:bg-gray-800"
        >
          返回你畫我猜大廳
        </button>
      </div>
    )
  }
  if (!game) return null

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/pictionary')}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs sm:text-sm"
          >
            ← 返回大廳
          </button>
          <div className="font-mono text-sm tracking-widest">{roomId}</div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h1 className="text-2xl font-bold mb-2">你畫我猜房間</h1>
          <p className="text-sm text-gray-300 mb-4">等待玩家加入，房主按下開始後會進入遊戲。</p>
          <div className="space-y-2 mb-5">
            {game.participants.map((p) => (
              <div
                key={p.id}
                className={`px-3 py-2 rounded-lg border ${
                  p.id === pid ? 'border-rose-500 bg-gray-800' : 'border-gray-700 bg-gray-950'
                }`}
              >
                <span className="text-sm">{p.name}</span>
                <span className="ml-2 text-xs text-gray-400">{p.isHost ? '房主' : '玩家'}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={isStarting || game.participants.length < 2}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 px-4 py-2 font-semibold"
            >
              {game.participants.length < 2 ? '至少需要 2 位玩家' : isStarting ? '開始中...' : '開始遊戲'}
            </button>
          ) : (
            <p className="text-sm text-gray-300">等待房主開始...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PictionaryRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          載入中...
        </div>
      }
    >
      <PictionaryRoomContent />
    </Suspense>
  )
}

