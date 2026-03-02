'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { AvalonGameData } from '@/types/avalon'
import {
  createAvalonRoom,
  getAvalonGame,
  joinAvalonRoom,
  leaveAvalonRoom,
  startAvalonGame,
  subscribeToAvalonGame,
} from '@/lib/avalon/firestore'

export default function AvalonRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string

  const [game, setGame] = useState<AvalonGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const role = (searchParams.get('role') || 'player') as 'host' | 'player'
  const name = searchParams.get('name') || '玩家'
  const pid = searchParams.get('pid') || ''

  const isHost = role === 'host'

  // 初始化房間與加入大廳
  useEffect(() => {
    if (!pid) {
      setError('缺少玩家識別資訊，請從阿瓦隆大廳重新進入房間。')
      setLoading(false)
      return
    }

    let unsub: (() => void) | null = null

    async function init() {
      try {
        const existing = await getAvalonGame(roomId)

        if (!existing) {
          if (isHost) {
            // 建立新房間
            const created = await createAvalonRoom(roomId, {
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
          // 加入現有房間
          await joinAvalonRoom(roomId, {
            id: pid,
            name,
            isHost,
          })
        }

        // 訂閱房間變化
        unsub = subscribeToAvalonGame(roomId, (data) => {
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
      // 嘗試從房間移除自己（不阻塞離開）
      if (pid) {
        leaveAvalonRoom(roomId, pid).catch(() => {})
      }
    }
  }, [roomId, pid, name, isHost])

  // 狀態變更：當遊戲開始時，自動導向遊戲畫面
  useEffect(() => {
    if (!game) return
    if (game.status === 'started') {
      router.push(`/avalon/${roomId}/game?pid=${encodeURIComponent(pid)}`)
    }
  }, [game, roomId, router, pid])

  const handleStartGame = async () => {
    if (!game) return
    if (!isHost) {
      alert('只有房主可以開始遊戲')
      return
    }
    if (!game.participants || game.participants.length < 5) {
      alert('阿瓦隆至少需要 5 位玩家')
      return
    }

    try {
      setIsStarting(true)
      await startAvalonGame(roomId)
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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">載入阿瓦隆房間中...</p>
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
            onClick={() => router.push('/avalon')}
            className="mt-1 w-full px-3 sm:px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold"
          >
            返回阿瓦隆大廳
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push('/avalon')}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-200"
          >
            ← 返回阿瓦隆大廳
          </button>

          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-slate-400">房間代碼</div>
            <div className="font-mono text-sm sm:text-lg text-slate-100">{roomId}</div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-7 mb-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                阿瓦隆房間大廳
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                等待所有玩家加入後，由房主按下「開始遊戲」，大家會自動進入身分畫面。
              </p>
            </div>

            <div className="text-right text-xs sm:text-sm text-slate-300">
              <div className="mb-1">
                目前人數：
                <span className="font-semibold text-emerald-300 ml-1">
                  {participants.length} 人
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500">
                需要 5–10 人才能開始遊戲
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-900/80 border border-slate-700 rounded-2xl p-4 sm:p-5">
            <h2 className="text-sm sm:text-base font-semibold text-slate-100 mb-3">
              玩家列表
            </h2>
            {participants.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500">尚無玩家加入。</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 border ${
                      p.id === pid ? 'border-emerald-500/60' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-slate-100 truncate">{p.name}</span>
                      {p.id === pid && (
                        <span className="text-[10px] sm:text-xs text-emerald-300 flex-shrink-0">
                          （你）
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-400 flex-shrink-0">
                      {p.isHost ? '房主' : '玩家'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="mb-3">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 mb-2">
                房間資訊
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mb-2">
                請將房間代碼分享給所有玩家，讓他們在「阿瓦隆大廳」輸入代碼加入。
              </p>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2">
                <div className="text-[11px] sm:text-xs text-slate-400 mb-1">房間代碼</div>
                <div className="font-mono text-sm sm:text-base text-slate-100">{roomId}</div>
              </div>
            </div>

            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={isStarting || participants.length < 5 || participants.length > 10}
                className="mt-2 w-full px-3 sm:px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base shadow-lg transition-all"
              >
                {isStarting
                  ? '開始中...'
                  : participants.length < 5 || participants.length > 10
                  ? '需要 5–10 位玩家才能開始'
                  : '開始遊戲'}
              </button>
            ) : (
              <div className="mt-2 text-[11px] sm:text-xs text-slate-400">
                等待房主開始遊戲，開始後會自動進入身分畫面。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
