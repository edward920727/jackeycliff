'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { UndercoverGameData, UndercoverPlayer } from '@/types/undercover'
import {
  getUndercoverGame,
  subscribeToUndercoverGame,
  eliminateUndercoverPlayer,
  submitUndercoverVote,
  resetUndercoverGameToLobby,
} from '@/lib/undercover/firestore'

export default function UndercoverGamePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string

  const [game, setGame] = useState<UndercoverGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEliminationSeat, setSelectedEliminationSeat] = useState<number | null>(null)
  const [myVoteSeat, setMyVoteSeat] = useState<number | null>(null)

  const pid = searchParams.get('pid') || ''
  const urlRole = (searchParams.get('role') || 'player') as 'host' | 'player'
  const urlName = searchParams.get('name') || ''

  useEffect(() => {
    async function init() {
      try {
        const existing = await getUndercoverGame(roomId)
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

  useEffect(() => {
    if (!roomId) return

    const unsubscribe = subscribeToUndercoverGame(roomId, (data) => {
      setGame(data)
    })

    return () => {
      unsubscribe()
    }
  }, [roomId])

  // 若遊戲被重置回大廳，所有玩家直接回到房間大廳
  useEffect(() => {
    if (!game || !pid) return
    if (game.status === 'lobby') {
      const participants = game.participants || []
      const me = participants.find((p) => p.id === pid)
      const isHost = me?.isHost ?? false
      const name = me?.name || '玩家'

      const params = new URLSearchParams({
        role: isHost ? 'host' : 'player',
        name,
        pid,
      })
      router.push(`/undercover/${roomId}?${params.toString()}`)
    }
  }, [game?.status, game?.participants, roomId, pid, router])

  const myParticipant = useMemo(
    () => game?.participants?.find((p) => p.id === pid),
    [game?.participants, pid]
  )

  const myPlayer: UndercoverPlayer | undefined = useMemo(() => {
    if (!game || !pid) return undefined
    return game.players.find((p) => p.participantId === pid)
  }, [game, pid])

  const isHostParticipant =
    myParticipant?.isHost ?? (game && urlRole === 'host' ? true : false)

  // ---- Derived data (hooks must be declared before any early returns) ----
  const playersSafe = game?.players ?? []
  const mySeatSafe = myPlayer?.seat ?? -1
  const votes = game?.votes ?? []

  const playerBySeat = useMemo(() => {
    const map = new Map<number, UndercoverPlayer>()
    for (const p of playersSafe) map.set(p.seat, p)
    return map
  }, [playersSafe])

  const formatPlayer = (seat: number) => {
    const p = playerBySeat.get(seat)
    const name = p?.name?.trim()
    return name ? `${name}（${seat}）` : `玩家 ${seat}`
  }

  const aliveSeatsSet = useMemo(
    () => new Set(playersSafe.filter((p) => p.alive).map((p) => p.seat)),
    [playersSafe]
  )

  const myExistingVote = useMemo(
    () => votes.find((v) => v.voterSeat === mySeatSafe)?.targetSeat ?? null,
    [votes, mySeatSafe]
  )

  useEffect(() => {
    setMyVoteSeat(myExistingVote)
  }, [myExistingVote])

  const voteCountsByTargetSeat = useMemo(() => {
    const map = new Map<number, number>()
    for (const v of votes) {
      if (!aliveSeatsSet.has(v.voterSeat)) continue
      if (!aliveSeatsSet.has(v.targetSeat)) continue
      map.set(v.targetSeat, (map.get(v.targetSeat) ?? 0) + 1)
    }
    return map
  }, [votes, aliveSeatsSet])

  const leadingVote = useMemo(() => {
    let maxSeat: number | null = null
    let maxCount = 0
    let tie = false
    for (const [seat, count] of voteCountsByTargetSeat.entries()) {
      if (count > maxCount) {
        maxSeat = seat
        maxCount = count
        tie = false
      } else if (count === maxCount && count > 0) {
        tie = true
      }
    }
    return { seat: tie ? null : maxSeat, count: maxCount, tie }
  }, [voteCountsByTargetSeat])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto mb-4" />
          <p className="text-yellow-100/80 text-sm">載入「誰是臥底」遊戲中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4">
        <div className="bg-slate-900/90 border border-rose-500/70 text-rose-100 text-sm rounded-2xl px-4 py-4 max-w-md w-full shadow-[0_22px_70px_rgba(0,0,0,0.9)]">
          <p className="mb-3">{error}</p>
          <button
            onClick={() => router.push('/undercover')}
            className="mt-3 w-full px-3 sm:px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold border border-slate-600/80 shadow-md"
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

  if (game.status !== 'playing' && game.status !== 'finished') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-yellow-200 mb-2 tracking-wide">
            遊戲尚未開始
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-4">
            請等待房主在房間大廳按下「開始遊戲」，所有人會自動同步進入這個畫面。
          </p>
          <button
            onClick={() => router.push(`/undercover/${roomId}`)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold border border-slate-600/80 shadow-md"
          >
            返回房間大廳
          </button>
        </div>
      </div>
    )
  }

  if (!pid || !myPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-yellow-200 mb-2 tracking-wide">
            尚未綁定玩家身分
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mb-4">
            請從「誰是臥底」大廳重新加入房間，或確認網址中是否帶有正確的玩家識別參數。
          </p>
          <button
            onClick={() => router.push('/undercover')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold border border-slate-600/80 shadow-md"
          >
            返回「誰是臥底」大廳
          </button>
        </div>
      </div>
    )
  }

  const displayName = myParticipant?.name || urlName || myPlayer.name

  const words = game.words
  const myWord = words ? (myPlayer.role === 'undercover' ? words.undercover : words.civilian) : ''

  const alivePlayers = game.players.filter((p) => p.alive)
  const eliminatedPlayers = game.players.filter((p) => !p.alive)
  const totalUndercoverCount =
    game.undercoverCount ?? game.players.filter((p) => p.role === 'undercover').length
  const totalBlankCount = game.blankCount ?? game.players.filter((p) => p.role === 'blank').length

  const handleConfirmElimination = async () => {
    if (selectedEliminationSeat == null) {
      alert('請先選擇要淘汰的玩家')
      return
    }
    if (!confirm(`確定要淘汰「${formatPlayer(selectedEliminationSeat)}」嗎？`)) {
      return
    }
    try {
      await eliminateUndercoverPlayer(roomId, pid, selectedEliminationSeat)
      setSelectedEliminationSeat(null)
    } catch (err: any) {
      console.error(err)
      alert(err.message || '淘汰玩家失敗')
    }
  }

  const handleSubmitVote = async (targetSeat: number) => {
    try {
      await submitUndercoverVote(roomId, pid, targetSeat)
      setMyVoteSeat(targetSeat)
    } catch (err: any) {
      console.error(err)
      alert(err.message || '投票失敗')
    }
  }

  const handleResetToLobby = async () => {
    if (!confirm('確定要結束本局並回到房間大廳嗎？')) return
    try {
      await resetUndercoverGameToLobby(roomId)
    } catch (err: any) {
      console.error(err)
      alert(err.message || '重置房間失敗')
    }
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push(`/undercover/${roomId}`)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-slate-100 border border-slate-700 shadow-md"
          >
            ← 返回房間大廳
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

        <div className="bg-slate-900/95 border border-slate-700/80 rounded-[1.75rem] shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 mb-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.5),_transparent_70%)]" />
            <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.55),_transparent_70%)]" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 bg-clip-text text-transparent tracking-wide">
                你的詞卡
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                這個畫面只會顯示你的詞卡內容，請不要讓其他玩家看到你的螢幕。
              </p>
            </div>

            <div className="text-right text-xs sm:text-sm text-slate-200">
              <div>
                目前玩家：
                <span className="font-semibold text-yellow-300 ml-1">
                  {game.players.length} 人
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 max-w-xl mx-auto">
          <div className="bg-slate-950/90 border border-yellow-500/60 rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] sm:text-xs text-yellow-100 border border-yellow-500/70">
                  玩家 {myPlayer.seat}・{displayName}
                </span>
              </div>
            </div>

            {myPlayer.role === 'blank' ? (
              <div className="mt-3">
                <div className="inline-block bg-slate-800/90 text-[11px] sm:text-xs text-yellow-100 tracking-[0.18em] uppercase px-3 py-1 rounded-full border border-yellow-600/70 shadow-md">
                  Blank Player
                </div>
                <p className="mt-3 text-sm sm:text-base text-slate-100 leading-relaxed">
                  你的詞卡是
                  <span className="font-semibold text-yellow-200">「白板」</span>，沒有固定詞彙，
                  請自由想一個與主題接近、但不會太突兀的詞，再照樣參與描述與討論。
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <div className="inline-block bg-gradient-to-r from-yellow-500/90 via-amber-400/90 to-yellow-500/90 text-[11px] sm:text-xs text-slate-900 tracking-[0.18em] uppercase px-3 py-1 rounded-full border border-yellow-600/80 shadow-md">
                  Your Word
                </div>
                <div className="mt-3 text-2xl sm:text-3xl font-bold text-yellow-100 tracking-wide drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                  {myWord}
                </div>
                <p className="mt-3 text-[11px] sm:text-xs text-slate-300">
                  每一輪請輪流用一句話描述這個詞，但不要直接講出來，也不要太明顯。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-md">
            <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-3 tracking-wide">
              玩家狀態
            </h2>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] sm:text-xs text-slate-300 mb-1">存活玩家</div>
                {alivePlayers.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500">目前沒有存活玩家。</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {alivePlayers.map((p) => (
                      <span
                        key={p.seat}
                        className={`px-3 py-1 rounded-full text-xs sm:text-sm border ${
                          p.seat === myPlayer.seat
                            ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200'
                            : 'bg-slate-800/80 border-slate-600 text-slate-100'
                        }`}
                      >
                        {p.name || `玩家 ${p.seat}`}
                        {p.seat === myPlayer.seat && '（你）'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] sm:text-xs text-slate-300 mb-1">已淘汰玩家</div>
                {eliminatedPlayers.length === 0 ? (
                  <p className="text-xs sm:text-sm text-slate-500">目前還沒有玩家被淘汰。</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {eliminatedPlayers.map((p) => (
                      <span
                        key={p.seat}
                        className="px-3 py-1 rounded-full text-xs sm:text-sm border bg-slate-800/80 border-slate-700 text-slate-400 line-through"
                      >
                        {p.name || `玩家 ${p.seat}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-yellow-200 mb-2 tracking-wide">
                遊戲進度
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 mb-1">
                透過語音或現場討論，輪流描述、發問、投票，並由房主在這裡標記被淘汰的玩家。
              </p>
              <p className="text-[11px] sm:text-xs text-slate-200">
                本局配置：
                <span className="ml-1 font-semibold text-rose-300">臥底 {totalUndercoverCount} 位</span>
                <span className="mx-1 text-slate-500">/</span>
                <span className="font-semibold text-yellow-200">白板 {totalBlankCount} 位</span>
              </p>
            </div>

            {isHostParticipant && game.status === 'playing' && (
              <div className="mt-1">
                <div className="text-[11px] sm:text-xs text-slate-300 mb-1.5">
                  房主操作：選擇本輪被投票淘汰的玩家（建議依下方票數領先者）。
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {alivePlayers.map((p) => (
                    <button
                      key={p.seat}
                      type="button"
                      onClick={() => setSelectedEliminationSeat(p.seat)}
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
                        selectedEliminationSeat === p.seat
                          ? 'bg-rose-700/90 border-rose-400 text-rose-50 shadow-[0_0_12px_rgba(248,113,113,0.7)]'
                          : 'bg-slate-800/80 border-slate-600 text-slate-100 hover:border-rose-400'
                      }`}
                    >
                      {p.name || `玩家 ${p.seat}`}
                      {p.seat === myPlayer.seat && '（你）'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleConfirmElimination}
                  disabled={selectedEliminationSeat == null}
                  className="w-full mt-1 px-3 sm:px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-[11px] sm:text-xs font-semibold text-amber-50 shadow-md"
                >
                  確認淘汰選中的玩家
                </button>
              </div>
            )}

            {game.status === 'playing' && (
              <div className="mt-1 border-t border-slate-700/80 pt-3">
                <div className="text-[11px] sm:text-xs text-slate-300 mb-1.5">
                  本輪投票：所有存活玩家都可以投票（每人一票，可改票）。
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {alivePlayers
                    .filter((p) => p.seat !== myPlayer.seat)
                    .map((p) => {
                      const selected = myVoteSeat === p.seat
                      return (
                        <button
                          key={p.seat}
                          type="button"
                          onClick={() => handleSubmitVote(p.seat)}
                          className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
                            selected
                              ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                              : 'bg-slate-800/80 border-slate-600 text-slate-100 hover:border-yellow-400'
                          }`}
                        >
                          投 {p.name || `玩家 ${p.seat}`}
                        </button>
                      )
                    })}
                </div>

                <div className="text-[11px] sm:text-xs text-slate-300 mb-1">目前票數：</div>
                <div className="space-y-1">
                  {alivePlayers
                    .slice()
                    .sort((a, b) => a.seat - b.seat)
                    .map((p) => {
                      const count = voteCountsByTargetSeat.get(p.seat) ?? 0
                      return (
                        <div key={p.seat} className="flex items-center justify-between gap-2">
                          <div className="text-[11px] sm:text-xs text-slate-200 truncate">
                            {p.name || `玩家 ${p.seat}`}
                          </div>
                          <div className="text-[11px] sm:text-xs text-yellow-200 font-semibold">
                            {count} 票
                          </div>
                        </div>
                      )
                    })}
                </div>

                {leadingVote.count > 0 && (
                  <div className="mt-2 text-[11px] sm:text-xs text-slate-200">
                    目前領先：
                    <span className="ml-1 font-semibold text-yellow-200">
                      {leadingVote.tie || leadingVote.seat == null
                        ? '同票（尚未領先）'
                        : formatPlayer(leadingVote.seat)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {game.status === 'finished' && (
              <div className="mt-2 text-[11px] sm:text-xs text-center text-slate-200">
                遊戲結束：
                <span
                  className={
                    game.winnerRole === 'undercover'
                      ? 'text-rose-300 font-semibold'
                      : 'text-emerald-300 font-semibold'
                  }
                >
                  {game.winnerRole === 'undercover' ? '臥底陣營獲勝' : '平民陣營獲勝'}
                </span>
              </div>
            )}

            {isHostParticipant && game.status === 'finished' && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleResetToLobby}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] sm:text-xs font-semibold border border-slate-600/80 shadow-md"
                >
                  回到房間大廳重新開始一局
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

