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
import { GameLayout, PlayerOrb } from '@/components/muffin-time/GameLayout'
import { HandOfCards } from '@/components/muffin-time/HandOfCards'
import { PlayZone } from '@/components/muffin-time/PlayZone'
import { getCardFlyDirection, getOpponentSlots } from '@/lib/muffin-time/tableView'

function floatingBtnClass(disabled?: boolean) {
  return [
    'rounded-xl border border-white/15 bg-black/45 px-2.5 py-1.5 text-[10px] font-semibold text-amber-50 shadow-lg backdrop-blur-md transition hover:bg-black/55',
    disabled ? 'opacity-40' : '',
  ].join(' ')
}

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
  const [hoveredHandIndex, setHoveredHandIndex] = useState<number | null>(null)

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

  const opponentSlots = useMemo(() => {
    if (!game) return { left: undefined, top: undefined, right: undefined, rest: [] as typeof sorted }
    return getOpponentSlots(game, pid)
  }, [game, pid])

  const flyDirection = useMemo(() => {
    if (!game?.last_card_play) return 'bottom' as const
    return getCardFlyDirection(game, pid, game.last_card_play.actorSeat)
  }, [game, pid, game?.last_card_play?.seq])

  const logLast3 = useMemo(() => (game?.log || []).slice(-3), [game?.log])

  if (loading && !game) {
    return (
      <div className="flex h-screen items-center justify-center bg-amber-950">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-amber-400" />
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex h-screen items-center justify-center bg-amber-950 p-4">
        <p className="text-sm text-rose-200">{error || '無法載入遊戲'}</p>
        <button type="button" onClick={() => router.push('/muffin-time')} className="ml-4 text-sm text-amber-300 underline">
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
    game.winner_seat != null ? game.players.find((p) => p.seat === game.winner_seat)?.name : null

  const currentName = game.players.find((p) => p.seat === game.current_seat)?.name
  const pending = game.pending_effect
  const iAmDiscardTarget = pending?.kind === 'discard' && pending.targetParticipantId === pid
  const needsShout = game.muffin_needs_shout_seat === mySeat

  const renderOrb = (p: (typeof sorted)[0] | undefined) => {
    if (!p) return null
    return (
      <PlayerOrb
        name={p.name}
        cardCount={(game.hands[p.participantId] || []).length}
        isCurrentTurn={p.seat === game.current_seat}
      />
    )
  }

  const showTurnControls = isMyTurn && game.status === 'playing' && !needsShout && !iAmDiscardTarget

  return (
    <>
      <GameLayout
        header={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="rounded-lg border border-amber-800/80 bg-amber-950/80 px-2 py-1 text-[10px] font-semibold text-amber-100"
            >
              ← 大廳
            </button>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-amber-200/90">
              <span className="font-mono text-amber-100">{roomId}</span>
              {game.status === 'finished' ? (
                <span className="rounded-full bg-amber-600/40 px-2 py-0.5 text-amber-100">結束</span>
              ) : (
                <>
                  <span className="text-amber-400/90">
                    {currentName}
                    {game.turn_phase === 'trap' ? ' · 陷阱' : ' · 行動'}
                  </span>
                  <span className="tabular-nums opacity-80">
                    庫{game.deck?.length ?? 0} 棄{game.discard?.length ?? 0}
                  </span>
                </>
              )}
            </div>
          </div>
        }
        topExtra={
          opponentSlots.rest.length > 0 ? (
            <div className="flex max-w-[90vw] flex-wrap justify-center gap-1">
              {opponentSlots.rest.map((p) => (
                <PlayerOrb
                  key={p.participantId}
                  name={p.name}
                  cardCount={(game.hands[p.participantId] || []).length}
                  isCurrentTurn={p.seat === game.current_seat}
                  size="sm"
                />
              ))}
            </div>
          ) : null
        }
        avatarLeft={renderOrb(opponentSlots.left)}
        avatarTop={renderOrb(opponentSlots.top)}
        avatarRight={renderOrb(opponentSlots.right)}
        playZone={<PlayZone lastCardPlay={game.last_card_play ?? null} flyFrom={flyDirection} />}
        logPanel={
          <div className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 shadow-lg backdrop-blur-md">
            <div className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-500/90">紀錄</div>
            <div className="max-h-[3.25rem] overflow-y-auto pr-1 text-[8px] leading-tight text-amber-100/90 [scrollbar-width:thin]">
              {logLast3.length === 0 ? (
                <p className="text-amber-500/80">—</p>
              ) : (
                logLast3.map((line, i) => (
                  <p key={`${line.slice(0, 12)}-${i}`} className="border-b border-white/5 py-0.5 last:border-0">
                    {line}
                  </p>
                ))
              )}
            </div>
          </div>
        }
        floatingActions={
          <>
            {game.status === 'playing' && showTurnControls && game.turn_phase === 'trap' ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => muffinSkipTrap(roomId, pid))}
                  className={floatingBtnClass(busy)}
                >
                  略過陷阱階段
                </button>
                {trapPick ? (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await muffinPlaceTrap(roomId, pid, trapPick, slot)
                            setTrapPick(null)
                          })
                        }
                        className={floatingBtnClass(busy)}
                      >
                        格{slot + 1}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {game.status === 'playing' && showTurnControls && game.turn_phase === 'main' ? (
              <>
                <button type="button" disabled={busy} onClick={() => run(() => muffinDraw(roomId, pid))} className={floatingBtnClass(busy)}>
                  抽牌
                </button>
                <div className="max-h-[min(22vh,180px)] w-[min(42vw,11rem)] overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-md [scrollbar-width:thin]">
                  <div className="flex flex-col gap-1">
                    {hand.map((cid) => {
                      const def = getCardDef(cid)
                      if (!def || def.kind !== 'action') return null
                      return (
                        <button
                          key={cid}
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => muffinPlayAction(roomId, pid, cid))}
                          className="w-full rounded-lg border border-blue-600/50 bg-blue-950/70 px-2 py-1 text-left text-[9px] text-blue-100 hover:bg-blue-900/80"
                        >
                          {def.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </>
        }
      />

      {/* 底部區：fixed + z-50，避免被 GameLayout overflow／PlayZone 層級遮住；扇形向上展開不裁切 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center overflow-visible bg-gradient-to-t from-black/75 via-black/30 to-transparent pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="pointer-events-auto flex w-full max-w-4xl flex-col items-center gap-1 overflow-visible px-2">
          {game.status === 'finished' && (
            <div className="mb-0.5 rounded-lg border border-amber-500/40 bg-amber-950/90 px-2 py-1 text-center text-[10px] text-amber-100 shadow-lg">
              🎉 {winnerName ? `${winnerName} 獲勝` : `座位 ${game.winner_seat}`}
              {game.win_reason ? ` · ${game.win_reason}` : ''}
            </div>
          )}

          <div className="flex flex-col items-center gap-0.5">
            <PlayerOrb name={name} cardCount={hand.length} isCurrentTurn={!!isMyTurn && game.status === 'playing'} size="lg" />
            {!isMyTurn && game.status === 'playing' ? (
              <span className="text-[8px] text-amber-500/80">等待回合…</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((slot) => {
              const tid = myTraps[slot]
              const label = tid ? getCardDef(tid)?.name?.slice(0, 2) ?? '✓' : `${slot + 1}`
              return (
                <div
                  key={slot}
                  title={tid ? getCardDef(tid)?.name : `陷阱格 ${slot + 1}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-amber-700/60 bg-black/50 text-[9px] font-semibold text-amber-200/90 shadow-inner"
                >
                  {tid ? label : '·'}
                </div>
              )
            })}
          </div>

          {showTurnControls && game.turn_phase === 'trap' ? (
            <div className="flex max-w-full flex-wrap justify-center gap-1 px-1">
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
                      className={[
                        'rounded-full border px-2 py-0.5 text-[9px]',
                        trapPick === cid
                          ? 'border-violet-400 bg-violet-800/90 text-white'
                          : 'border-violet-800/60 bg-violet-950/60 text-violet-100',
                      ].join(' ')}
                    >
                      {def?.name}
                    </button>
                  )
                })}
            </div>
          ) : null}

          <HandOfCards
            cardIds={hand}
            hoveredIndex={hoveredHandIndex}
            onHoverIndex={setHoveredHandIndex}
            highlight={!!isMyTurn && game.status === 'playing'}
          />
        </div>
      </div>

      {/* 反擊：緊湊條（桌面下緣上方） */}
      {iAmDiscardTarget && game.status === 'playing' ? (
        <div className="fixed bottom-[min(32vh,260px)] left-1/2 z-[80] w-[min(94vw,22rem)] -translate-x-1/2 rounded-xl border border-rose-500/50 bg-rose-950/90 p-2 shadow-xl backdrop-blur-md">
          <p className="text-center text-[10px] font-semibold text-rose-100">被指定棄 {pending?.amount} 張</p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-1">
            <button type="button" disabled={busy} onClick={() => run(() => muffinResolveDiscard(roomId))} className="rounded-lg bg-rose-900 px-2 py-1 text-[10px] text-rose-50">
              承受
            </button>
            {hand
              .filter((c) => getCardDef(c)?.kind === 'counter')
              .map((cid) => {
                const def = getCardDef(cid)
                return (
                  <button
                    key={cid}
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => muffinPlayCounter(roomId, pid, cid))}
                    className="rounded-lg border border-slate-500 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                  >
                    {def?.name}
                  </button>
                )
              })}
          </div>
        </div>
      ) : null}

      {/* 吸爆鬆餅：全螢幕中央 */}
      {needsShout && game.status === 'playing' ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-900 to-orange-950 p-5 text-center shadow-2xl">
            <p className="text-base font-bold text-amber-50">手牌 10 張！</p>
            <p className="mt-1 text-xs text-amber-200/90">按下以宣告</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => muffinDeclare(roomId, pid))}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-lg font-black tracking-widest text-amber-950 disabled:opacity-50"
            >
              吸爆鬆餅！
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
