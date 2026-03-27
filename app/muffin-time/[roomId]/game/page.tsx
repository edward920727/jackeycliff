'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import type { MuffinTimeGameData } from '@/types/muffin-time'
import { getCardDef } from '@/lib/muffin-time/cards'
import {
  muffinDeclare,
  muffinDraw,
  muffinPlaceTrap,
  muffinPlayAction,
  muffinPlayCounter,
  muffinResolveDiscard,
  muffinSkipTrap,
  subscribeToMuffinGame,
} from '@/lib/muffin-time/firestore'
import { participantIdToSeat, sortedPlayersBySeat } from '@/lib/muffin-time/engine'

export default function MuffinTimeGamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const pid = searchParams.get('pid') || ''
  const name = searchParams.get('name') || '玩家'

  const [game, setGame] = useState<MuffinTimeGameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [trapPick, setTrapPick] = useState<string | null>(null)

  useEffect(() => {
    if (!pid) {
      setError('缺少玩家識別，請重新進入房間。')
      setLoading(false)
      return
    }
    const unsub = subscribeToMuffinGame(roomId, (data) => {
      setGame(data)
      setLoading(false)
    })
    return () => unsub()
  }, [roomId, pid])

  const mySeat = useMemo(() => {
    if (!game || !pid) return
    return participantIdToSeat(game, pid)
  }, [game, pid])

  const isMyTurn = game?.current_seat === mySeat

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失敗')
    } finally {
      setBusy(false)
    }
  }, [])

  const hand = game?.hands?.[pid] || []
  const myTraps = game?.traps?.[pid] || [null, null, null]

  const sorted = game ? sortedPlayersBySeat(game) : []

  if (loading && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-950 p-4">
        <p className="text-rose-200 text-sm">{error || '無法載入遊戲'}</p>
        <button
          type="button"
          onClick={() => router.push('/muffin-time')}
          className="ml-4 text-amber-300 underline text-sm"
        >
          回大廳
        </button>
      </div>
    )
  }

  if (game.status === 'lobby') {
    router.replace(`/muffin-time/${roomId}?${searchParams.toString()}`)
    return null
  }

  const winnerName =
    game.winner_seat != null
      ? game.players.find((p) => p.seat === game.winner_seat)?.name
      : null

  const currentName = game.players.find((p) => p.seat === game.current_seat)?.name
  const pending = game.pending_effect
  const iAmDiscardTarget = pending?.kind === 'discard' && pending.targetParticipantId === pid

  const needsShout = game.muffin_needs_shout_seat === mySeat

  return (
    <div
      className="min-h-screen p-3 sm:p-6 bg-black/80"
      style={{
        backgroundImage: "url('/lobby-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-3 py-1.5 rounded-lg bg-amber-950 border border-amber-800 text-amber-100 text-xs font-semibold"
          >
            ← 大廳
          </button>
          <div className="text-right text-xs text-amber-200/90">
            <div>
              房間 <span className="font-mono text-amber-100">{roomId}</span>
            </div>
            <div>
              你：<span className="text-amber-50">{name}</span>
            </div>
          </div>
        </div>

        {game.status === 'finished' && (
          <div className="mb-4 rounded-2xl border border-amber-500/50 bg-amber-900/40 px-4 py-3 text-center">
            <p className="text-lg font-bold text-amber-100">
              🎉 遊戲結束！{winnerName ? `${winnerName} 獲勝` : `座位 ${game.winner_seat} 獲勝`}
            </p>
            {game.win_reason ? (
              <p className="text-xs text-amber-200/80 mt-1">原因：{game.win_reason}</p>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-3">
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/80 p-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">玩家</h3>
              <ul className="space-y-1.5 text-sm">
                {sorted.map((p) => (
                  <li
                    key={p.participantId}
                    className={`flex justify-between rounded-lg px-2 py-1.5 ${
                      p.seat === game.current_seat ? 'bg-amber-700/40 ring-1 ring-amber-500/50' : 'bg-black/20'
                    }`}
                  >
                    <span className="text-amber-50">
                      {p.seat}. {p.name}
                      {p.participantId === pid ? (
                        <span className="text-amber-500 text-xs ml-1">（你）</span>
                      ) : null}
                    </span>
                    <span className="text-amber-200/70 text-xs">
                      {(game.hands[p.participantId] || []).length} 張
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-800/60 bg-amber-950/80 p-3 max-h-48 overflow-y-auto">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">紀錄</h3>
              <ul className="space-y-1 text-[11px] text-amber-200/85 leading-snug">
                {(game.log || []).slice(-12).map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
            </div>

            <div className="text-[11px] text-amber-300/70">
              牌庫 {game.deck?.length ?? 0}｜棄牌 {game.discard?.length ?? 0}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-amber-700/50 bg-amber-950/90 p-4">
              <p className="text-sm text-amber-100 mb-1">
                回合：<span className="font-semibold text-amber-50">{currentName}</span>
                {game.turn_phase === 'trap' ? (
                  <span className="text-amber-400 text-xs ml-2">陷阱階段</span>
                ) : (
                  <span className="text-amber-400 text-xs ml-2">行動階段</span>
                )}
              </p>
              {!isMyTurn && game.status === 'playing' ? (
                <p className="text-xs text-amber-300/80">等待其他玩家…</p>
              ) : null}
            </div>

            {iAmDiscardTarget && game.status === 'playing' ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-4">
                <p className="text-sm text-rose-100 font-semibold mb-2">
                  有人對你造成 {pending?.amount} 張隨機棄牌！
                </p>
                <p className="text-xs text-rose-200/80 mb-3">可打出反擊牌抵消，或承受效果。</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => muffinResolveDiscard(roomId))}
                    className="px-4 py-2 rounded-lg bg-rose-900 border border-rose-700 text-rose-100 text-sm"
                  >
                    不反擊，承受
                  </button>
                  {hand
                    .filter((cid) => getCardDef(cid)?.kind === 'counter')
                    .map((cid) => {
                      const def = getCardDef(cid)
                      return (
                        <button
                          key={cid}
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => muffinPlayCounter(roomId, pid, cid))}
                          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 text-xs"
                        >
                          反擊：{def?.name}
                        </button>
                      )
                    })}
                </div>
              </div>
            ) : null}

            {needsShout && game.status === 'playing' ? (
              <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-900/90 to-orange-950/90 p-6 text-center shadow-lg shadow-amber-900/40">
                <p className="text-amber-100 font-bold text-lg mb-2">你手上有 10 張牌！</p>
                <p className="text-amber-200/90 text-sm mb-4">大声喊出——</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => muffinDeclare(roomId, pid))}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 font-black text-xl tracking-widest shadow-xl hover:brightness-110 disabled:opacity-50"
                >
                  吸爆鬆餅！
                </button>
              </div>
            ) : null}

            <div className="rounded-xl border border-amber-800/60 bg-amber-950/80 p-4">
              <h3 className="text-xs font-bold text-amber-400 mb-2">你的陷阱</h3>
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 2].map((slot) => {
                  const tid = myTraps[slot]
                  const label = tid ? getCardDef(tid)?.name ?? tid : '空'
                  return (
                    <div
                      key={slot}
                      className="flex-1 min-w-[90px] rounded-lg border border-dashed border-amber-700/50 bg-black/30 px-2 py-2 text-center"
                    >
                      <div className="text-[10px] text-amber-500">格 {slot + 1}</div>
                      <div className="text-xs text-amber-100 truncate">{label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {isMyTurn && game.status === 'playing' && !needsShout && !iAmDiscardTarget ? (
              <div className="space-y-4">
                {game.turn_phase === 'trap' ? (
                  <div className="rounded-xl border border-amber-800/60 bg-amber-950/80 p-4">
                    <p className="text-sm text-amber-200 mb-3">放置陷阱（可選，最多 3 張；先點陷阱牌再選格子）</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {hand
                        .filter((cid) => getCardDef(cid)?.kind === 'trap')
                        .map((cid) => {
                          const def = getCardDef(cid)
                          return (
                            <button
                              key={cid}
                              type="button"
                              disabled={busy}
                              onClick={() => setTrapPick(trapPick === cid ? null : cid)}
                              className={`px-3 py-2 rounded-lg text-xs border ${
                                trapPick === cid
                                  ? 'bg-violet-700 border-violet-400 text-white'
                                  : 'bg-violet-950/80 border-violet-700 text-violet-100'
                              }`}
                            >
                              {def?.name}
                            </button>
                          )
                        })}
                    </div>
                    {trapPick ? (
                      <p className="text-xs text-amber-400 mb-2">已選：{getCardDef(trapPick)?.name} — 選格子</p>
                    ) : null}
                    <div className="flex gap-2 mb-3">
                      {[0, 1, 2].map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          disabled={busy || !trapPick}
                          onClick={() =>
                            run(async () => {
                              if (!trapPick) return
                              await muffinPlaceTrap(roomId, pid, trapPick, slot)
                              setTrapPick(null)
                            })
                          }
                          className="flex-1 py-2 rounded-lg bg-amber-900 border border-amber-700 text-amber-100 text-sm disabled:opacity-40"
                        >
                          格 {slot + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => muffinSkipTrap(roomId, pid))}
                      className="w-full py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm"
                    >
                      略過陷阱階段
                    </button>
                  </div>
                ) : null}

                {game.turn_phase === 'main' ? (
                  <div className="rounded-xl border border-amber-800/60 bg-amber-950/80 p-4">
                    <p className="text-sm text-amber-200 mb-3">抽 1 張牌，或打出一張行動牌（藍色）</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => muffinDraw(roomId, pid))}
                      className="mb-4 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold text-sm"
                    >
                      抽牌
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {hand.map((cid) => {
                        const def = getCardDef(cid)
                        if (!def) return null
                        if (def.kind === 'action') {
                          return (
                            <button
                              key={cid}
                              type="button"
                              disabled={busy}
                              onClick={() => run(() => muffinPlayAction(roomId, pid, cid))}
                              className="px-3 py-2 rounded-lg bg-blue-950/80 border border-blue-600 text-blue-100 text-xs hover:bg-blue-900/80"
                            >
                              {def.name}
                            </button>
                          )
                        }
                        return (
                          <div
                            key={cid}
                            className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-600 text-slate-400 text-xs"
                          >
                            {def.name}（陷阱／反擊須在對應時機打出）
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-amber-800/40 bg-black/30 p-4">
              <h3 className="text-xs font-bold text-amber-500 mb-2">你的手牌（{hand.length}）</h3>
              <div className="flex flex-wrap gap-2">
                {hand.map((cid, idx) => {
                  const def = getCardDef(cid)
                  return (
                    <div
                      key={`${cid}-${idx}`}
                      className="px-2 py-1.5 rounded-md bg-amber-950 border border-amber-800 text-[11px] text-amber-100 max-w-[140px]"
                    >
                      <div className="font-semibold truncate">{def?.name ?? cid}</div>
                      <div className="text-amber-400/80 truncate">{def?.desc}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
