'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { createInitialState, gameReducer } from '@/lib/monopoly/engine'
import { IsometricMonopolyBoard } from './IsometricMonopolyBoard'
import { useRouter } from 'next/navigation'
import { ensureMonopolyRoom, submitMonopolyAction, subscribeMonopolyRoom } from '@/lib/monopoly/multiplayerFirestore'
import type { GameAction } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'

export default function MonopolyGame({ roomId = null }: { roomId?: string | null }) {
  const router = useRouter()
  const [names, setNames] = useState(['玩家1', '玩家2', '玩家3', '玩家4'])
  const [playerCount, setPlayerCount] = useState(4)
  const [state, dispatch] = useReducer(gameReducer, createInitialState(['玩家1', '玩家2', '玩家3', '玩家4']))
  const [netState, setNetState] = useState<GameState | null>(null)
  const [netErr, setNetErr] = useState<string | null>(null)
  const [netReady, setNetReady] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const unsubRef = useRef<null | (() => void)>(null)

  const isOnlineRoom = roomId != null && roomId.trim().length > 0
  const effectiveState = isOnlineRoom ? netState ?? state : state

  const startGame = useCallback(() => {
    const n = names.slice(0, playerCount).map((s, i) => s.trim() || `玩家${i + 1}`)
    if (isOnlineRoom && roomId) {
      submitMonopolyAction(roomId, { type: 'NEW_GAME', names: n })
      return
    }
    dispatch({ type: 'NEW_GAME', names: n })
  }, [names, playerCount])

  // Online room subscription
  useEffect(() => {
    if (!isOnlineRoom || !roomId) return
    setNetErr(null)
    setNetReady(false)
    ensureMonopolyRoom(roomId, names.slice(0, playerCount)).catch((e) =>
      setNetErr(e instanceof Error ? e.message : '連線房間失敗'),
    )
    if (unsubRef.current) unsubRef.current()
    unsubRef.current = subscribeMonopolyRoom(
      roomId,
      (s) => {
        setNetState(s)
        setNetReady(true)
      },
      (e) => setNetErr(e instanceof Error ? e.message : '訂閱房間失敗'),
    )
    return () => {
      if (unsubRef.current) unsubRef.current()
      unsubRef.current = null
    }
  }, [isOnlineRoom, roomId])

  const remoteDispatch = useCallback(
    (action: GameAction) => {
      if (!roomId) return
      setNetErr(null)
      submitMonopolyAction(roomId, action).catch((e) =>
        setNetErr(e instanceof Error ? e.message : '送出操作失敗'),
      )
    },
    [roomId],
  )

  const dispatchForBoard: React.Dispatch<GameAction> = isOnlineRoom ? remoteDispatch : dispatch

  const createAndGoRoom = useCallback(() => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    router.push(`/monopoly/${code}`)
  }, [router])

  const goJoin = useCallback(() => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    router.push(`/monopoly/${code}`)
  }, [joinCode, router])

  return (
    <div className="weplay-plane-window-bg relative flex min-h-[100dvh] flex-col overflow-x-hidden font-game text-slate-800 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.18)_45%,rgba(255,255,255,0.35)_100%)]"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col px-2 py-2 sm:px-2 sm:py-0">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto absolute left-2 right-2 top-2 z-[80] flex flex-row items-start justify-between gap-2 rounded-2xl border-2 border-white/90 bg-white/90 px-3 py-2 shadow-[0_12px_40px_rgba(109,40,217,0.2)] backdrop-blur-xl sm:static sm:mb-4 sm:items-center sm:rounded-3xl sm:bg-white/95 sm:px-4 sm:py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-500 sm:text-[10px] sm:tracking-[0.3em]">
              3D 大富翁
            </p>
            <h1 className="mt-0.5 min-w-0 break-words bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-base font-extrabold leading-tight tracking-wide text-transparent sm:text-2xl">
              <span className="sm:hidden">大富翁 · 3D</span>
              <span className="hidden sm:inline">大富翁</span>
            </h1>
          </div>
          {!isOnlineRoom && (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={createAndGoRoom}
                className="rounded-2xl border-2 border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 shadow-[0_4px_0_#a7f3d0]"
              >
                建立線上房間
              </button>
              <div className="flex items-center gap-1">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="房間碼"
                  className="w-[7.5rem] rounded-2xl border-2 border-violet-100 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                />
                <button
                  type="button"
                  onClick={goJoin}
                  className="rounded-2xl border-2 border-violet-200/80 bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-700 shadow-[0_4px_0_#ddd6fe]"
                >
                  加入
                </button>
              </div>
            </div>
          )}
          {isOnlineRoom && (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <div className="rounded-2xl border-2 border-white/70 bg-white/85 px-3 py-2 text-xs font-extrabold text-slate-700">
                房間：<span className="font-mono text-violet-700">{roomId}</span>
                <span className={`ml-2 font-bold ${netReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {netReady ? '已同步' : '連線中'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/monopoly/${roomId}`)}
                className="rounded-2xl border-2 border-white/70 bg-white/85 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-[0_4px_0_#e5e7eb]"
              >
                複製連結
              </button>
            </div>
          )}
          <motion.a
            href="/"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white to-violet-50 px-3 py-2 text-xs font-extrabold tracking-wide text-violet-600 shadow-[0_4px_0_#ddd6fe] ring-2 ring-violet-200/80 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
          >
            ← 大廳
          </motion.a>
        </motion.header>

        {!isOnlineRoom && (
          <div className="pointer-events-auto mb-2 flex items-center justify-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={createAndGoRoom}
              className="rounded-xl border-2 border-emerald-200/80 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700"
            >
              建立線上房間
            </button>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="房間碼"
              className="w-[6.5rem] rounded-xl border-2 border-violet-100 bg-white px-2 py-2 text-xs font-bold text-slate-700"
            />
            <button
              type="button"
              onClick={goJoin}
              className="rounded-xl border-2 border-violet-200/80 bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-700"
            >
              加入
            </button>
          </div>
        )}
        {isOnlineRoom && netErr && (
          <div className="pointer-events-auto mb-2 rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {netErr}
          </div>
        )}

        {/* 手機：flex-1 填滿剩餘視窗；桌面：固定高度，避免 h-full 鏈結失效導致地圖只剩一條線 */}
        <div className="monopoly-board-float flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-[4.25rem] sm:pt-0 md:h-[min(76vh,780px)] md:min-h-[460px] md:max-h-[780px] md:flex-none">
          <IsometricMonopolyBoard
            names={names}
            setNames={setNames}
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            state={effectiveState}
            dispatch={dispatchForBoard}
            startGame={startGame}
          />
        </div>
      </div>
    </div>
  )
}
