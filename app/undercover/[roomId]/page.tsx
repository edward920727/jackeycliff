'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { UndercoverGameData } from '@/types/undercover'
import {
  createUndercoverRoom,
  getUndercoverGame,
  joinUndercoverRoom,
  leaveUndercoverRoom,
  startUndercoverGame,
  subscribeToUndercoverGame,
} from '@/lib/undercover/firestore'

export default function UndercoverRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [game, setGame] = useState<UndercoverGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || '玩家'
  const pid = searchParams.get('pid') || ''

  const isHost = role === 'host'

  useEffect(() => {
    if (!pid) {
      setError('缺少玩家識別資訊，請從「誰是臥底」大廳重新進入房間。')
      setLoading(false)
      return
    }

    let unsub: (() => void) | null = null

    async function init() {
      try {
        const existing = await getUndercoverGame(roomId)

        if (!existing) {
          if (isHost) {
            const created = await createUndercoverRoom(roomId, {
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
          await joinUndercoverRoom(roomId, {
            id: pid,
            name,
            isHost,
          })
        }

        unsub = subscribeToUndercoverGame(roomId, (data) => {
          setGame(data)
        })
      } catch (err: any) {
        console.error(err)
        setError(err.message || '載入房間失敗')
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (unsub) unsub()
      if (pid) {
        leaveUndercoverRoom(roomId, pid).catch(() => {})
      }
    }
  }, [roomId, pid, name, isHost])

  // 若遊戲已經開始，直接導向遊戲畫面
  useEffect(() => {
    if (!game || !pid) return
    if (game.status === 'playing') {
      router.push(`/undercover/${roomId}/game?pid=${encodeURIComponent(pid)}`)
    }
  }, [game?.status, roomId, pid, router])

  const handleStartGame = async () => {
    if (!game) return
    if (!isHost) {
      alert('只有房主可以開始遊戲')
      return
    }
    const count = game.participants?.length ?? 0
    if (count < 3) {
      alert('誰是臥底至少需要 3 位玩家')
      return
    }

    try {
      setIsStarting(true)
      await startUndercoverGame(roomId, 1)
    } catch (err: any) {
      console.error(err)
      alert(err.message || '開始遊戲失敗')
      setIsStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">載入房間中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-rose-900/20 border border-rose-500/60 text-rose-100 text-sm rounded-xl px-4 py-3 max-w-md w-full">
          <p className="mb-3">{error}</p>
          <button
            onClick={() => router.push('/undercover')}
            className="mt-1 w-full px-3 sm:px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold"
          >
            返回「誰是臥底」大廳
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
    <div className="min-h-screen bg-black/80 p-4 sm:p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/undercover')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-100 border border-slate-700 shadow-md"
          >
            ← 返回「誰是臥底」大廳
          </button>

          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-yellow-300/80 tracking-wide">
              房間代碼
            </div>
            <div className="font-mono text-sm sm:text-lg text-yellow-100 drop-shadow-[0_0_10px_rgba(0,0,0,0.7)]">
              {roomId}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 mb-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.45),_transparent_70%)]" />
            <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.5),_transparent_70%)]" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent tracking-wide">
                誰是臥底房間大廳
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                等待所有玩家加入後，由房主按下「開始遊戲」，大家會自動看到自己的詞與身分。
              </p>
            </div>

            <div className="text-right text-xs sm:text-sm text-slate-300">
              <div className="mb-1">
                目前人數：
                <span className="font-semibold text-yellow-300 ml-1">
                  {participants.length} 人
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400">
                建議 3–10 人一起遊玩
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-md">
            <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-3 tracking-wide">
              玩家列表
            </h2>
            {participants.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400">尚無玩家加入。</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 border ${
                      p.id === pid ? 'border-yellow-400/80 shadow-[0_0_0_1px_rgba(250,204,21,0.4)]' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-slate-50 truncate">{p.name}</span>
                      {p.id === pid && (
                        <span className="text-[10px] sm:text-xs text-yellow-300 flex-shrink-0">
                          （你）
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300 flex-shrink-0">
                      {p.isHost ? '房主' : '玩家'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-md">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-2 tracking-wide">
                房間資訊
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mb-2">
                請將房間代碼分享給所有玩家，讓他們在「誰是臥底」大廳輸入代碼加入。
              </p>
              <div className="bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2 shadow-inner">
                <div className="text-[11px] sm:text-xs text-slate-400 mb-1">房間代碼</div>
                <div className="font-mono text-sm sm:text-base text-slate-50 tracking-[0.18em]">
                  {roomId}
                </div>
              </div>
            </div>

            <div className="mt-auto">
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={isStarting || participants.length < 3}
                  className="mt-2 w-full px-3 sm:px-4 py-2.5 rounded-lg bg-gradient-to-b from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-slate-500 disabled:via-slate-500 disabled:to-slate-500 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm sm:text-base shadow-[0_10px_26px_rgba(0,0,0,0.9)] border border-yellow-300/80 transition-all"
                >
                  {isStarting
                    ? '開始中...'
                    : participants.length < 3
                    ? '至少需要 3 位玩家'
                    : '開始遊戲'}
                </button>
              ) : (
                <div className="mt-2 text-[11px] sm:text-xs text-slate-300">
                  等待房主按下「開始遊戲」，開始後會自動顯示你的詞與身分。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

