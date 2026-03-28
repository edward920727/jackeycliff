'use client'

import type { Dispatch } from 'react'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BOARD } from '@/lib/monopoly/board'
import type { GameAction } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'
import { GO_BONUS, MONOPOLY_RENT_MULTIPLIER } from '@/lib/monopoly/types'
import { GameButton } from './GameButton'
import { MonopolyScene } from './isometric/MonopolyScene'
import type { MapTouchMode } from './isometric/MapViewControls'

const PLAYER_ACCENTS = ['#f472b6', '#60a5fa', '#4ade80', '#fbbf24']

const CORNER = {
  tl: 'left-3 top-[4.5rem] sm:left-4 sm:top-[4.25rem]',
  tr: 'right-3 top-[4.5rem] sm:right-4 sm:top-[4.25rem]',
  bl: 'bottom-28 left-3 sm:bottom-36 sm:left-4',
  br: 'bottom-28 right-3 sm:bottom-36 sm:right-4',
} as const

const CORNER_ORDER = ['tl', 'tr', 'bl', 'br'] as const

type Props = {
  names: string[]
  setNames: (n: string[]) => void
  playerCount: number
  setPlayerCount: (n: number) => void
  state: GameState
  dispatch: Dispatch<GameAction>
  startGame: () => void
}

function moneyBarPct(money: number) {
  return Math.min(100, Math.max(4, (money / 3000) * 100))
}

export function IsometricMonopolyBoard({
  names,
  setNames,
  playerCount,
  setPlayerCount,
  state,
  dispatch,
  startGame,
}: Props) {
  const [resetSeq, setResetSeq] = useState(0)
  const [diceSpin, setDiceSpin] = useState(false)
  const [diceFxSeq, setDiceFxSeq] = useState(0)
  const [setupOpen, setSetupOpen] = useState(false)
  const [coarsePointer, setCoarsePointer] = useState(false)
  const [mapTouchMode, setMapTouchMode] = useState<MapTouchMode>('rotate')
  /** 僅在 dice 從 null → 有值時觸發（每次新擲骰），避免相同點數不重播 */
  const hadDiceRef = useRef(!!state.dice)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarsePointer(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const emitMapTouchMode = (m: MapTouchMode) => {
    setMapTouchMode(m)
    window.dispatchEvent(new CustomEvent<MapTouchMode>('monopoly-touch-mode', { detail: m }))
  }

  useEffect(() => {
    if (state.dice) {
      if (!hadDiceRef.current) {
        hadDiceRef.current = true
        setDiceFxSeq((n) => n + 1)
        setDiceSpin(true)
        const t = window.setTimeout(() => setDiceSpin(false), 1600)
        return () => window.clearTimeout(t)
      }
    } else {
      hadDiceRef.current = false
    }
  }, [state.dice])

  const onRestart = () => {
    startGame()
    setResetSeq((s) => s + 1)
  }

  const current = state.players[state.currentPlayer]

  return (
    <div className="relative z-0 h-full min-h-[220px] w-full min-w-0 overflow-hidden rounded-xl border-2 border-white/85 bg-gradient-to-b from-violet-200/50 to-violet-400/30 shadow-[0_20px_60px_rgba(109,40,217,0.25)] max-md:min-h-0 max-md:flex-1 sm:rounded-[1.5rem] md:min-h-[460px] md:rounded-[1.75rem]">
      {/*
        Canvas 預設會吃掉全區點擊；改為 pointer-events-none 讓底部按鈕／設定可點。
        若之後要在場景內互動，再在子元件用 pointer-events-auto。
      */}
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{
          position: [26, 26, 26],
          zoom: 30,
          near: 0.1,
          far: 600,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#bfe3ff', 1)
        }}
        className="pointer-events-auto absolute inset-0 z-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
      >
        <Suspense fallback={null}>
          <MonopolyScene state={state} resetSeq={resetSeq} diceSpinning={diceSpin} />
        </Suspense>
      </Canvas>

      <AnimatePresence>
        {diceSpin && (
          <motion.div
            key={diceFxSeq}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-0 z-[25] overflow-hidden rounded-[inherit]"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-amber-300/35 via-fuchsia-400/12 to-violet-400/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.35, 0] }}
              transition={{ duration: 1.55, times: [0, 0.12, 0.45, 1], ease: 'easeOut' }}
            />
            <motion.div
              className="absolute left-1/2 top-[38%] h-[min(55%,420px)] w-[min(85%,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/30 blur-3xl"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.15, 1], opacity: [0, 0.9, 0] }}
              transition={{ duration: 1.45, times: [0, 0.2, 1], ease: 'easeOut' }}
            />
            {[...Array(14)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-lg leading-none text-amber-200 drop-shadow-md"
                style={{
                  left: `${8 + ((i * 17) % 84)}%`,
                  top: `${12 + ((i * 23) % 70)}%`,
                }}
                initial={{ opacity: 0, scale: 0, y: 12 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.2, 1.1, 0.6],
                  y: [18, -28 - (i % 5) * 8, -52 - (i % 3) * 12],
                  rotate: [0, (i % 2 ? 1 : -1) * 25],
                }}
                transition={{
                  duration: 1.35,
                  delay: i * 0.035,
                  ease: 'easeOut',
                }}
              >
                ✦
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {coarsePointer && (
        <div className="pointer-events-auto absolute right-2 top-[3.75rem] z-[45] flex gap-0.5 rounded-xl border-2 border-white/85 bg-white/95 p-0.5 shadow-lg sm:top-16">
          <button
            type="button"
            onClick={() => emitMapTouchMode('rotate')}
            className={`rounded-lg px-2 py-1 text-[10px] font-extrabold transition-colors ${
              mapTouchMode === 'rotate' ? 'bg-violet-600 text-white shadow-inner' : 'text-violet-700 hover:bg-violet-50'
            }`}
          >
            旋轉
          </button>
          <button
            type="button"
            onClick={() => emitMapTouchMode('pan')}
            className={`rounded-lg px-2 py-1 text-[10px] font-extrabold transition-colors ${
              mapTouchMode === 'pan' ? 'bg-violet-600 text-white shadow-inner' : 'text-violet-700 hover:bg-violet-50'
            }`}
          >
            平移
          </button>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-[7.25rem] left-1/2 z-[35] max-w-[min(100%,20rem)] -translate-x-1/2 px-1 text-center text-[9px] leading-snug text-slate-600/90 drop-shadow-sm sm:bottom-[7.5rem] md:bottom-32 md:text-[10px]">
        左鍵旋轉 · 右鍵平移 · 滾輪縮放
        <span className="max-md:block md:inline">｜手機先選「旋轉／平移」再單指拖曳</span>
      </p>

      {/* 手機：橫向玩家列（避免四角大卡片擠滿畫面） */}
      <div
        className="pointer-events-none absolute left-1.5 right-1.5 top-11 z-[40] flex min-w-0 gap-1 overflow-x-auto pb-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {Array.from({ length: playerCount }).map((_, i) => {
          const p = state.players[i]
          if (!p) return null
          const isTurn = state.currentPlayer === i && !p.bankrupt && state.phase !== 'gameover'
          const accent = PLAYER_ACCENTS[i % PLAYER_ACCENTS.length]
          return (
            <motion.div
              key={`m-${p.id}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-[clamp(3rem,18.5vw,4.75rem)] max-w-[4.75rem] shrink-0 rounded-lg border bg-white/92 px-1 py-1.5 shadow-md backdrop-blur-sm ${
                isTurn ? 'border-amber-400 ring-1 ring-amber-300/70' : 'border-white/80'
              }`}
            >
              <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white shadow-inner ring-1 ring-white/50"
                  style={{
                    background: `linear-gradient(145deg, ${accent}, ${accent}99)`,
                    boxShadow: `0 0 10px ${accent}55`,
                  }}
                >
                  {(names[i] || `P${i + 1}`).slice(0, 1)}
                </div>
                <p className="w-full max-w-full truncate px-0.5 text-[8px] font-extrabold leading-tight text-slate-800 sm:text-[9px]">
                  {names[i] || `玩家${i + 1}`}
                </p>
                <p className="max-w-full truncate font-mono text-[9px] font-bold tabular-nums leading-none text-violet-700">
                  ${p.money}
                </p>
                <div className="h-1 w-full overflow-hidden rounded-full bg-violet-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${moneyBarPct(p.money)}%`,
                      background: `linear-gradient(90deg, ${accent}, #fff)`,
                    }}
                  />
                </div>
                {p.bankrupt && <span className="text-[8px] font-bold text-rose-500">破產</span>}
                {p.inJail && !p.bankrupt && <span className="text-[8px] font-bold text-orange-600">🔒</span>}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 桌面：四角玩家狀態 */}
      {Array.from({ length: playerCount }).map((_, i) => {
        const p = state.players[i]
        if (!p) return null
        const corner = CORNER_ORDER[i]
        const isTurn = state.currentPlayer === i && !p.bankrupt && state.phase !== 'gameover'
        const accent = PLAYER_ACCENTS[i % PLAYER_ACCENTS.length]
        return (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`pointer-events-none absolute z-[40] hidden w-[min(42vw,200px)] sm:w-[200px] md:block ${CORNER[corner]}`}
          >
            <div
              className={`rounded-2xl border-2 bg-white/90 p-2.5 shadow-xl backdrop-blur-md ${
                isTurn ? 'border-amber-400 ring-2 ring-amber-300/60' : 'border-white/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-white shadow-inner ring-2 ring-white/50"
                  style={{
                    background: `linear-gradient(145deg, ${accent}, ${accent}99)`,
                    boxShadow: `0 0 18px ${accent}66`,
                  }}
                >
                  {(names[i] || `P${i + 1}`).slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-800">{names[i] || `玩家${i + 1}`}</p>
                  <p className="font-mono text-sm font-bold text-violet-700">${p.money}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-violet-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${moneyBarPct(p.money)}%`,
                        background: `linear-gradient(90deg, ${accent}, #fff)`,
                        boxShadow: `0 0 12px ${accent}88`,
                      }}
                    />
                  </div>
                  {p.bankrupt && <p className="mt-1 text-[10px] font-bold text-rose-500">破產</p>}
                  {p.inJail && !p.bankrupt && (
                    <p className="mt-0.5 text-[10px] font-bold text-orange-500">🔒 監獄</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}

      {/* 底部操作列 */}
      <div className="pointer-events-auto absolute bottom-2 left-1/2 z-[50] w-[min(96%,420px)] max-w-[calc(100%-0.5rem)] -translate-x-1/2 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] sm:bottom-3 sm:px-0 sm:pb-0">
        <AnimatePresence mode="wait">
          {state.phase === 'gameover' && state.winnerId != null ? (
            <motion.div
              key="win"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3 text-center shadow-xl backdrop-blur-md"
            >
              <p className="break-words px-1 text-center text-sm font-extrabold leading-snug text-amber-900 [overflow-wrap:anywhere]">
                🏆 {state.players[state.winnerId]?.name} 獲勝！
              </p>
              <GameButton type="button" variant="primary" onClick={onRestart} className="mt-2">
                再開一局
              </GameButton>
            </motion.div>
          ) : (
            current &&
            !current.bankrupt && (
              <motion.div
                key="actions"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-1.5 rounded-xl border-2 border-white/80 bg-white/90 p-2 shadow-2xl backdrop-blur-md sm:space-y-2 sm:rounded-2xl sm:p-3"
              >
                {state.phase === 'roll' && (
                  <>
                    {current.inJail ? (
                      <>
                        <GameButton
                          type="button"
                          variant="orange"
                          disabled={current.money < 50}
                          onClick={() => dispatch({ type: 'JAIL_PAY' })}
                        >
                          付 $50 出獄並擲骰
                        </GameButton>
                        <GameButton type="button" variant="primary" onClick={() => dispatch({ type: 'ROLL' })}>
                          擲骰（雙數出獄）
                        </GameButton>
                      </>
                    ) : (
                      <GameButton type="button" variant="primary" onClick={() => dispatch({ type: 'ROLL' })}>
                        🎲 擲骰
                      </GameButton>
                    )}
                  </>
                )}
                {state.phase === 'buy_prompt' && (() => {
                  const cell = BOARD[current.position]
                  const price = cell.kind === 'property' || cell.kind === 'railroad' ? cell.price : 0
                  return (
                    <>
                      <p className="break-words px-0.5 text-center text-[11px] font-semibold leading-snug text-slate-600 sm:text-xs">
                        購買「{cell.name}」？ ${price}
                      </p>
                      <GameButton
                        type="button"
                        variant="emerald"
                        disabled={current.money < price}
                        onClick={() => dispatch({ type: 'BUY' })}
                      >
                        購買
                      </GameButton>
                      <GameButton type="button" variant="ghost" onClick={() => dispatch({ type: 'SKIP_BUY' })}>
                        放棄
                      </GameButton>
                    </>
                  )
                })()}
                <p className="break-words px-0.5 text-center text-[9px] leading-snug text-slate-500 [overflow-wrap:anywhere] sm:text-[10px]">
                  {state.lastMessage}
                </p>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* 設定鈕 + 面板（置頂中央） */}
      <div className="pointer-events-auto absolute left-1/2 top-2 z-[50] max-w-[calc(100%-1rem)] -translate-x-1/2 sm:top-3">
        <button
          type="button"
          onClick={() => setSetupOpen((o) => !o)}
          className="rounded-xl border-2 border-white/80 bg-white/90 px-3 py-1.5 text-xs font-extrabold text-violet-700 shadow-lg backdrop-blur-md hover:bg-white sm:rounded-2xl sm:px-4 sm:py-2 sm:text-sm"
        >
          ⚙ 開局設定
        </button>
        <AnimatePresence>
          {setupOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2 w-[min(88vw,280px)] rounded-2xl border-2 border-violet-200 bg-white/95 p-3 shadow-2xl backdrop-blur-md"
            >
              <label className="block text-[10px] font-bold uppercase tracking-wider text-violet-500">人數</label>
              <select
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                className="mb-2 mt-1 w-full rounded-xl border-2 border-violet-100 bg-violet-50/80 px-2 py-1.5 text-sm font-semibold text-slate-800"
              >
                <option value={2}>2 人</option>
                <option value={3}>3 人</option>
                <option value={4}>4 人</option>
              </select>
              {Array.from({ length: playerCount }).map((_, i) => (
                <input
                  key={i}
                  value={names[i] ?? ''}
                  onChange={(e) => {
                    const next = [...names]
                    next[i] = e.target.value
                    setNames(next)
                  }}
                  className="mb-1.5 w-full rounded-xl border border-violet-100 bg-white px-2 py-1 text-sm"
                  placeholder={`玩家 ${i + 1}`}
                />
              ))}
              <GameButton type="button" variant="secondary" onClick={onRestart} className="mt-1">
                重新開始
              </GameButton>
              <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                規則：經過起點 +{GO_BONUS}；同色一組買齊租金×{MONOPOLY_RENT_MULTIPLIER}；破產資產充公。
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
