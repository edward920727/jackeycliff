'use client'

import { useCallback, useReducer, useState } from 'react'
import { motion } from 'framer-motion'
import { createInitialState, gameReducer } from '@/lib/monopoly/engine'
import { IsometricMonopolyBoard } from './IsometricMonopolyBoard'

export default function MonopolyGame() {
  const [names, setNames] = useState(['玩家1', '玩家2', '玩家3', '玩家4'])
  const [playerCount, setPlayerCount] = useState(4)
  const [state, dispatch] = useReducer(gameReducer, createInitialState(['玩家1', '玩家2', '玩家3', '玩家4']))

  const startGame = useCallback(() => {
    const n = names.slice(0, playerCount).map((s, i) => s.trim() || `玩家${i + 1}`)
    dispatch({ type: 'NEW_GAME', names: n })
  }, [names, playerCount])

  return (
    <div className="weplay-plane-window-bg relative flex min-h-[100dvh] flex-col overflow-x-hidden font-game px-2 py-2 text-slate-800 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.18)_45%,rgba(255,255,255,0.35)_100%)]"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col px-0 sm:px-2">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex flex-row items-start justify-between gap-2 rounded-2xl border-2 border-white/90 bg-white/95 px-3 py-2 shadow-[0_12px_40px_rgba(109,40,217,0.2)] backdrop-blur-xl sm:mb-4 sm:items-center sm:rounded-3xl sm:px-4 sm:py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-500 sm:text-[10px] sm:tracking-[0.3em]">
              3D 大富翁
            </p>
            <h1 className="mt-0.5 min-w-0 break-words bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-base font-extrabold leading-tight tracking-wide text-transparent sm:text-2xl">
              <span className="sm:hidden">旅遊大亨 · 3D</span>
              <span className="hidden sm:inline">LINE 旅遊大亨風 · 等角棋盤</span>
            </h1>
            <p className="mt-0.5 hidden text-xs font-medium tracking-wide text-slate-500 sm:mt-1 sm:block">
              本機輪流｜擲骰、買地、收租｜邏輯不變
            </p>
          </div>
          <motion.a
            href="/"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white to-violet-50 px-3 py-2 text-xs font-extrabold tracking-wide text-violet-600 shadow-[0_4px_0_#ddd6fe] ring-2 ring-violet-200/80 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
          >
            ← 大廳
          </motion.a>
        </motion.header>

        {/* 手機：flex-1 填滿剩餘視窗；桌面：固定高度，避免 h-full 鏈結失效導致地圖只剩一條線 */}
      <div className="monopoly-board-float flex min-h-0 min-w-0 flex-1 flex-col pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] md:h-[min(76vh,780px)] md:min-h-[460px] md:max-h-[780px] md:flex-none">
          <IsometricMonopolyBoard
            names={names}
            setNames={setNames}
            playerCount={playerCount}
            setPlayerCount={setPlayerCount}
            state={state}
            dispatch={dispatch}
            startGame={startGame}
          />
        </div>
      </div>
    </div>
  )
}
