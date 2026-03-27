'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { MuffinTimeGameData } from '@/types/muffin-time'
import {
  createMuffinRoom,
  getMuffinGame,
  joinMuffinRoom,
  startMuffinGame,
  subscribeToMuffinGame,
} from '@/lib/muffin-time/firestore'

export default function MuffinTimeRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [game, setGame] = useState<MuffinTimeGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || '玩家'
  const pid = searchParams.get('pid') || ''

  const isHost = role === 'host'
  const participantsCount = game?.participants?.length ?? 0

  useEffect(() => {
    if (!pid) {
      setError('缺少玩家識別資訊，請從吸爆鬆餅大廳重新進入房間。')
      setLoading(false)
      return
    }

    let unsub: (() => void) | null = null

    async function init() {
      try {
        const existing = await getMuffinGame(roomId)

        if (!existing) {
          if (isHost) {
            const created = await createMuffinRoom(roomId, {
              id: pid,
              name,
              isHost: true,
            })
            setGame(created)
          } else {
            setError('房間不存在，請確認房間代碼是否正確。')
            setLoading(false)
            return
          }
        } else {
          setGame(existing)
          await joinMuffinRoom(roomId, {
            id: pid,
            name,
            isHost,
          })
        }

        unsub = subscribeToMuffinGame(roomId, (data) => {
          setGame(data)
        })
      } catch (err: unknown) {
        console.error(err)
        setError(err instanceof Error ? err.message : '載入房間失敗')
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
    if (game.status === 'playing') {
      const params = new URLSearchParams({
        pid,
        role: isHost ? 'host' : 'player',
        name,
      })
      router.push(`/muffin-time/${roomId}/game?${params.toString()}`)
    }
  }, [game?.status, roomId, pid, router, isHost, name])

  const handleStartGame = async () => {
    if (!game) return
    if (!isHost) {
      alert('只有房主可以開始遊戲')
      return
    }
    const count = game.participants?.length ?? 0
    if (count < 2) {
      alert('至少需要 2 位玩家')
      return
    }

    try {
      setIsStarting(true)
      await startMuffinGame(roomId)
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : '開始遊戲失敗')
      setIsStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-4" />
          <p className="text-amber-200/80 text-sm">載入房間中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-950 p-4">
        <div className="bg-rose-900/20 border border-rose-500/60 text-rose-100 text-sm rounded-xl px-4 py-3 max-w-md w-full">
          <p className="mb-3">{error}</p>
          <button
            onClick={() => router.push('/muffin-time')}
            className="mt-1 w-full px-3 sm:px-4 py-2 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-100 text-xs sm:text-sm font-semibold"
          >
            返回吸爆鬆餅大廳
          </button>
        </div>
      </div>
    )
  }

  if (!game) {
    return null
  }

  const participants = game.participants || []

  return (
    <div
      className="min-h-screen bg-black/70 p-4 sm:p-6"
      style={{
        backgroundImage: "url('/lobby-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/muffin-time')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-950 hover:bg-amber-900 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-amber-100 border border-amber-800"
          >
            ← 返回大廳
          </button>
          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-amber-300/80">房間代碼</div>
            <div className="font-mono text-sm sm:text-lg text-amber-100">{roomId}</div>
          </div>
        </div>

        <div className="bg-amber-950/85 border border-amber-800/60 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-amber-100 mb-4">等待室（{participantsCount} 人）</h2>
          <ul className="space-y-2 mb-6">
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm text-amber-100"
              >
                <span>
                  {p.name}
                  {p.isHost ? (
                    <span className="ml-2 text-[10px] text-amber-400">房主</span>
                  ) : null}
                </span>
                {p.id === pid ? <span className="text-amber-500 text-xs">你</span> : null}
              </li>
            ))}
          </ul>

          {isHost ? (
            <button
              type="button"
              onClick={handleStartGame}
              disabled={isStarting || participantsCount < 2}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm"
            >
              {isStarting ? '開始中…' : '開始遊戲'}
            </button>
          ) : (
            <p className="text-sm text-amber-200/70">等待房主開始遊戲…</p>
          )}
        </div>
      </div>
    </div>
  )
}
