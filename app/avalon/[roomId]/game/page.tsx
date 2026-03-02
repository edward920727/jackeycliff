'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { AvalonGameData, AvalonPlayer } from '@/types/avalon'
import { AVALON_ROLES } from '@/lib/avalon/constants'
import {
  getAvalonGame,
  subscribeToAvalonGame,
  getMissionTeamSize,
  selectMissionTeam,
  submitMissionVote,
  submitTeamVote,
} from '@/lib/avalon/firestore'

export default function AvalonGamePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = params.roomId as string

  const [game, setGame] = useState<AvalonGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localTeamSeats, setLocalTeamSeats] = useState<number[]>([])

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

  const myPlayer: AvalonPlayer | undefined = useMemo(() => {
    if (!game || !pid) return undefined
    return game.players.find((p) => p.participantId === pid)
  }, [game, pid])

  const serverTeamSeats = game?.proposedTeamSeats || []

  // 當進入隊長選人階段時，將本地選人狀態同步為目前伺服器上的隊伍（或清空）
  useEffect(() => {
    if (game?.phase === 'leader_select') {
      setLocalTeamSeats(serverTeamSeats)
    } else {
      setLocalTeamSeats([])
    }
  }, [game?.phase, serverTeamSeats.join(',')])

  const handleSelectTeam = async (seat: number) => {
    if (!isLeader || game?.phase !== 'leader_select') return

    let next: number[]
    if (localTeamSeats.includes(seat)) {
      next = localTeamSeats.filter((s) => s !== seat)
    } else {
      next = [...localTeamSeats, seat]
    }

    // 前端先限制最多 teamSize 個人
    if (next.length > teamSize) return

    setLocalTeamSeats(next)
  }

  const handleConfirmTeam = async () => {
    if (!isLeader || game?.phase !== 'leader_select') return

    if (localTeamSeats.length !== teamSize) {
      alert(`本輪需要選擇 ${teamSize} 人出任務`)
      return
    }

    try {
      await selectMissionTeam(roomId, pid, localTeamSeats)
    } catch (err) {
      console.error(err)
      alert((err as Error).message)
    }
  }

  const handleTeamVote = async (approve: boolean) => {
    try {
      await submitTeamVote(roomId, pid, approve)
    } catch (err) {
      console.error(err)
      alert((err as Error).message)
    }
  }

  const handleMissionVote = async (success: boolean) => {
    try {
      await submitMissionVote(roomId, pid, success)
    } catch (err) {
      console.error(err)
      alert((err as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0f07] via-[#26140b] to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-4" />
          <p className="text-amber-100/80 text-sm">載入阿瓦隆遊戲中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0f07] via-[#26140b] to-black p-4">
        <div className="bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-red-900/70 text-red-950 text-sm rounded-2xl px-4 py-4 max-w-md w-full shadow-[0_22px_70px_rgba(0,0,0,0.9)]">
          <p className="mb-3">{error}</p>
          <button
            onClick={() => router.push('/avalon')}
            className="mt-3 w-full px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-amber-100 text-xs sm:text-sm font-semibold border border-yellow-900/60 shadow-md"
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

  if (game.status !== 'started') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0f07] via-[#26140b] to-black p-4">
        <div className="bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-yellow-900/80 rounded-2xl shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-yellow-900 mb-2 tracking-wide">
            遊戲尚未開始
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 mb-4">
            請等待房主在大廳按下「開始遊戲」，所有人會自動同步進入這個畫面。
          </p>
          <button
            onClick={() => router.push(`/avalon/${roomId}`)}
            className="px-4 py-2 rounded-lg bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-amber-100 text-xs sm:text-sm font-semibold border border-yellow-900/60 shadow-md"
          >
            返回大廳
          </button>
        </div>
      </div>
    )
  }

  if (!pid || !myPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a0f07] via-[#26140b] to-black p-4">
        <div className="bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-yellow-900/80 rounded-2xl shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 max-w-md w-full text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-yellow-900 mb-2 tracking-wide">
            尚未綁定玩家身分
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 mb-4">
            請從阿瓦隆大廳重新加入房間，或確認網址中是否帶有正確的玩家識別參數。
          </p>
          <button
            onClick={() => router.push('/avalon')}
            className="px-4 py-2 rounded-lg bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-amber-100 text-xs sm:text-sm font-semibold border border-yellow-900/60 shadow-md"
          >
            返回阿瓦隆大廳
          </button>
        </div>
      </div>
    )
  }

  const role = AVALON_ROLES[myPlayer.roleId]
  const isGood = role.faction === 'good'

  const currentRound = game.currentRound ?? 1
  const teamSize = getMissionTeamSize(game.player_count, currentRound)
  const isLeader = game.leaderSeat === myPlayer.seat
  const isOnProposedTeam = serverTeamSeats.includes(myPlayer.seat)

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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={() => router.push(`/avalon/${roomId}`)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-b from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 rounded-lg transition-colors text-xs sm:text-sm font-semibold text-amber-100 border border-yellow-900/60 shadow-md"
          >
            ← 返回大廳
          </button>

          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-amber-300/80 tracking-wide">
              房間代碼
            </div>
            <div className="font-mono text-sm sm:text-lg text-amber-100 drop-shadow-[0_0_10px_rgba(0,0,0,0.7)]">
              {roomId}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-amber-100/95 via-amber-50/95 to-amber-100/90 border-[3px] border-yellow-900/80 rounded-[1.75rem] shadow-[0_22px_70px_rgba(0,0,0,0.9)] p-5 sm:p-7 mb-5 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-24 -top-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.5),_transparent_70%)]" />
            <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-[radial-gradient(circle_at_center,_rgba(148,91,40,0.5),_transparent_70%)]" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-900 via-amber-800 to-amber-600 bg-clip-text text-transparent tracking-wide">
                你的身分
              </h1>
              <p className="text-xs sm:text-sm text-stone-700 mt-1">
                這個畫面只會顯示你的角色與你在規則上可以看到的資訊，請不要讓其他玩家看到螢幕。
              </p>
            </div>

            <div className="text-right text-xs sm:text-sm text-stone-700">
              <div>
                玩家人數：
                <span className="font-semibold text-emerald-700 ml-1">
                  {game.player_count} 人
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 max-w-xl mx-auto">
          <div className="bg-gradient-to-b from-[#1e1309] via-[#23140a] to-[#120908] border-[3px] border-yellow-900/80 rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-slate-900/90 text-[11px] sm:text-xs text-amber-100 border border-yellow-900/70">
                  玩家 {myPlayer.seat}
                </span>
                <span
                  className={
                    isGood
                      ? 'text-xs sm:text-sm font-semibold text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : 'text-xs sm:text-sm font-semibold text-rose-300 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]'
                  }
                >
                  {isGood ? '好人陣營' : '壞人陣營'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <div className="inline-block bg-gradient-to-r from-yellow-900/90 via-amber-800/90 to-yellow-900/90 text-[11px] sm:text-xs text-amber-100 tracking-[0.18em] uppercase px-3 py-1 rounded-full border border-yellow-700/80 shadow-md">
                Your Role
              </div>
              <div className="mt-3 text-2xl sm:text-3xl font-bold text-amber-100 tracking-wide drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]">
                {role.name}
              </div>
            </div>

            <div>
              <div className="text-xs sm:text-sm text-amber-100/80 mb-1">
                你在開局時「理論上」可以看到：
              </div>
              {renderVisibleForPlayer(myPlayer, game.players)}
            </div>
          </div>
        </div>

        {/* 遊戲流程區塊：隊長選人 / 全體投票 / 任務執行 / 結果 */}
        <div className="mt-6 max-w-3xl mx-auto space-y-4">
          {/* 任務進度條 */}
          <div className="bg-gradient-to-b from-[#1e1309] via-[#23140a] to-[#120908] border-[3px] border-yellow-900/80 rounded-2xl p-4 shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs sm:text-sm text-amber-100/90">
                第{' '}
                <span className="font-semibold text-emerald-300">{currentRound}</span> 輪任務
                （{teamSize} 人）
              </div>
              <div className="text-[10px] sm:text-xs text-amber-200/80">
                階段：
                <span className="ml-1 font-semibold text-amber-100">
                  {game.phase === 'leader_select' && '隊長選人'}
                  {game.phase === 'team_vote' && '全體投票'}
                  {game.phase === 'mission' && '任務執行'}
                  {game.phase === 'round_result' && '回合結果'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, idx) => {
                const result = game.missionResults?.find((r) => r.round === idx + 1)
                const isCurrent = currentRound === idx + 1

                let bg = 'bg-slate-900/80 border-slate-700'
                if (result) {
                  bg = result.success
                    ? 'bg-emerald-600/80 border-emerald-400/80'
                    : 'bg-rose-700/80 border-rose-400/80'
                } else if (isCurrent) {
                  bg = 'bg-slate-800/80 border-emerald-400/60'
                }

                return (
                  <div
                    key={idx}
                    className={`flex-1 h-8 rounded-lg border text-[10px] sm:text-xs flex items-center justify-center text-amber-100 ${bg}`}
                  >
                    {result
                      ? result.success
                        ? '成功'
                        : '失敗'
                      : `第 ${idx + 1} 輪`}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 隊長 / 任務流程操作區 */}
          <div className="bg-gradient-to-b from-[#1e1309] via-[#23140a] to-[#120908] border-[3px] border-yellow-900/80 rounded-2xl p-4 space-y-3 shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="text-xs sm:text-sm text-amber-100/90">
                目前隊長：
                <span className="ml-1 font-semibold text-emerald-300">
                  玩家 {game.leaderSeat}
                  {isLeader && '（你）'}
                </span>
              </div>
            </div>

            {/* 隊長選人階段 */}
            {game.phase === 'leader_select' && (
              <div className="space-y-3">
                {isLeader ? (
                  <>
                    <div className="text-xs sm:text-sm text-amber-100/90">
                      請選擇{' '}
                      <span className="font-semibold text-emerald-300">{teamSize}</span> 位玩家出任務
                      ，再按下送出。
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {game.players.map((p) => {
                        const selected = localTeamSeats.includes(p.seat)
                        return (
                          <button
                            key={p.seat}
                            onClick={() => handleSelectTeam(p.seat)}
                            className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition-colors ${
                              selected
                                ? 'bg-emerald-600/90 border-emerald-300 text-amber-50 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                : 'bg-slate-900/80 border-slate-600 text-amber-100 hover:border-emerald-400'
                            }`}
                          >
                            玩家 {p.seat}
                            {p.seat === myPlayer.seat && '（你）'}
                          </button>
                        )
                      })}
                    </div>
                    <div className="text-[11px] sm:text-xs text-amber-200/80">
                      目前已選：{localTeamSeats.length} / {teamSize} 人。
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={handleConfirmTeam}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] sm:text-xs font-semibold text-amber-50 shadow-md"
                      >
                        送出本輪隊伍
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs sm:text-sm text-amber-100/90">
                    等待隊長（玩家 {game.leaderSeat}）選擇本輪出任務的隊伍…
                  </div>
                )}
              </div>
            )}

            {/* 全體投票階段 */}
            {game.phase === 'team_vote' && (
              <div className="space-y-3">
                <div className="text-xs sm:text-sm text-amber-100/90">
                  本輪隊長（玩家 {game.leaderSeat}）提案的隊伍：
                </div>
                <div className="flex flex-wrap gap-2">
                  {game.players.map((p) => {
                    if (!serverTeamSeats.includes(p.seat)) return null
                    return (
                      <span
                        key={p.seat}
                        className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-600 text-xs sm:text-sm text-amber-100"
                      >
                        玩家 {p.seat}
                        {p.seat === myPlayer.seat && '（你）'}
                      </span>
                    )
                  })}
                </div>
                <div className="text-xs sm:text-sm text-amber-100/90">
                  請決定是否同意這個隊伍出任務：
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTeamVote(true)}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-semibold text-amber-50 shadow-md"
                  >
                    贊成
                  </button>
                  <button
                    onClick={() => handleTeamVote(false)}
                    className="flex-1 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-xs sm:text-sm font-semibold text-amber-50 shadow-md"
                  >
                    反對
                  </button>
                </div>
                <div className="text-[11px] sm:text-xs text-amber-200/80">
                  目前已投票人數：{game.votes?.length ?? 0} / {game.player_count}。
                </div>
              </div>
            )}

            {/* 任務執行階段 */}
            {game.phase === 'mission' && (
              <div className="space-y-3">
                <div className="text-xs sm:text-sm text-amber-100/90">
                  本輪出任務的隊伍：
                </div>
                <div className="flex flex-wrap gap-2">
                  {game.players.map((p) => {
                    if (!serverTeamSeats.includes(p.seat)) return null
                    return (
                      <span
                        key={p.seat}
                        className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-600 text-xs sm:text-sm text-amber-100"
                      >
                        玩家 {p.seat}
                        {p.seat === myPlayer.seat && '（你）'}
                      </span>
                    )
                  })}
                </div>

                {isOnProposedTeam ? (
                  <div className="space-y-2">
                    <div className="text-xs sm:text-sm text-amber-100/90">
                      你在本輪任務中，請選擇你要投出的結果（其他人不會看到你的選擇）：
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMissionVote(true)}
                        className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-semibold text-amber-50 shadow-md"
                      >
                        任務成功
                      </button>
                      <button
                        onClick={() => handleMissionVote(false)}
                        className="flex-1 px-3 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-xs sm:text-sm font-semibold text-amber-50 shadow-md"
                      >
                        任務失敗
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-amber-100/90">
                    你沒有被選上出任務，請等待本輪任務結果。
                  </div>
                )}

                <div className="text-[11px] sm:text-xs text-amber-200/80">
                  目前已投出任務結果的玩家：{game.missionVotes?.length ?? 0} /{' '}
                  {serverTeamSeats.length}。
                </div>
              </div>
            )}

            {/* 遊戲結束 / 回合結果簡單提示 */}
            {game.winnerFaction && (
              <div className="mt-3 text-xs sm:text-sm text-center text-amber-100">
                遊戲結束：
                <span
                  className={
                    game.winnerFaction === 'good'
                      ? 'text-emerald-300 font-semibold'
                      : 'text-rose-300 font-semibold'
                  }
                >
                  {game.winnerFaction === 'good' ? '好人陣營獲勝' : '壞人陣營獲勝'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

