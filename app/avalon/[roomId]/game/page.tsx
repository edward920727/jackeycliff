'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { AvalonGameData, AvalonPlayer } from '@/types/avalon'
import { AVALON_ROLES } from '@/lib/avalon/constants'
import { getAvalonGame, subscribeToAvalonGame } from '@/lib/avalon/firestore'

export default function AvalonGamePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string

  const [game, setGame] = useState<AvalonGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pid = searchParams.get('pid') || ''

  // 載入遊戲
  useEffect(() => {
    async function init() {
      try {
        const existing = await getAvalonGame(roomId)
        if (!existing) {
          setError('找不到這個房間，請確認房間代碼是否正確。')
        } else {
          setGame(existing)
        }
      } catch (err: any) {
        console.error(err)
        setError(err.message || '載入遊戲失敗')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [roomId])

  // 訂閱即時更新
  useEffect(() => {
    if (!roomId) return

    const unsubscribe = subscribeToAvalonGame(roomId, (data) => {
      setGame(data)
    })

    return () => {
      unsubscribe()
    }
  }, [roomId])

  const renderVisibleForPlayer = (player: AvalonPlayer, allPlayers: AvalonPlayer[]) => {
    const roleDef = AVALON_ROLES[player.roleId]
    const visibleRoles = roleDef.sees

    if (!visibleRoles || visibleRoles.length === 0) {
      return <span className="text-slate-500 text-xs sm:text-sm">（此角色開局看不到任何人）</span>
    }

    const visiblePlayers = allPlayers.filter(
      (p) => p.seat !== player.seat && visibleRoles.includes(p.roleId)
    )

    if (visiblePlayers.length === 0) {
      return (
        <span className="text-slate-500 text-xs sm:text-sm">
          （此局沒有在你視野內的角色，或該角色沒被選進此局）
        </span>
      )
    }

    // 只顯示「你看到哪些玩家」，不顯示他們的具體角色名稱
    return (
      <div className="space-y-1">
        {visiblePlayers.map((vp) => (
          <div
            key={vp.seat}
            className="text-xs sm:text-sm text-slate-100 flex items-center gap-2"
          >
            <span className="px-2 py-0.5 rounded-full bg-slate-700 text-[10px] sm:text-xs">
              玩家 {vp.seat}
            </span>
            <span className="text-slate-300">你知道他是「邪惡陣營」的一員</span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">載入阿瓦隆遊戲中...</p>
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

  const myPlayer: AvalonPlayer | undefined = useMemo(() => {
    if (!pid) return undefined
    return game.players.find((p) => p.participantId === pid)
  }, [game.players, pid])

  if (game.status !== 'started') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">遊戲尚未開始</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-4">
            請等待房主在大廳按下「開始遊戲」，所有人會自動同步進入這個畫面。
          </p>
          <button
            onClick={() => router.push(`/avalon/${roomId}`)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold"
          >
            返回大廳
          </button>
        </div>
      </div>
    )
  }

  if (!pid || !myPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">尚未綁定玩家身分</h2>
          <p className="text-xs sm:text-sm text-slate-400 mb-4">
            請從阿瓦隆大廳重新加入房間，或確認網址中是否帶有正確的玩家識別參數。
          </p>
          <button
            onClick={() => router.push('/avalon')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold"
          >
            返回阿瓦隆大廳
          </button>
        </div>
      </div>
    )
  }

  const role = AVALON_ROLES[myPlayer.roleId]
  const isGood = role.faction === 'good'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push(`/avalon/${roomId}`)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-200"
          >
            ← 返回大廳
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
                你的身分
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                這個畫面只會顯示你的角色與你在規則上可以看到的資訊，請不要讓其他玩家看到螢幕。
              </p>
            </div>

            <div className="text-right text-xs sm:text-sm text-slate-300">
              <div>
                玩家人數：
                <span className="font-semibold text-emerald-300 ml-1">
                  {game.player_count} 人
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 max-w-xl mx-auto">
          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] sm:text-xs text-slate-200">
                  玩家 {myPlayer.seat}
                </span>
                <span
                  className={
                    isGood
                      ? 'text-xs sm:text-sm font-semibold text-emerald-300'
                      : 'text-xs sm:text-sm font-semibold text-rose-300'
                  }
                >
                  {isGood ? '好人陣營' : '壞人陣營'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs sm:text-sm text-slate-400">你的角色</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-100 mt-1">
                {role.name}
              </div>
            </div>

            <div>
              <div className="text-xs sm:text-sm text-slate-400 mb-1">
                你在開局時「理論上」可以看到：
              </div>
              {renderVisibleForPlayer(myPlayer, game.players)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

