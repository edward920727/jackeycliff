'use client'

import type { Dispatch } from 'react'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { BOARD } from '@/lib/monopoly/board'
import type { GameAction } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'
import { GO_BONUS, MONOPOLY_RENT_MULTIPLIER } from '@/lib/monopoly/types'
import { mascotLabelForPlayerId, mascotLegendLine } from '@/lib/monopoly/mascots'
import { GameButton } from './GameButton'
import { MonopolyScene } from './isometric/MonopolyScene'
import { INITIAL_ORBIT_CAMERA } from './isometric/boardCamera'
import { useFullScreenDiceRoll } from './useFullScreenDiceRoll'

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
  const [setupOpen, setSetupOpen] = useState(false)
  /** 擲骰後鏡頭跟隨走棋玩家，點「結束」後改跟隨當前回合玩家 */
  const [cameraFollowPlayerId, setCameraFollowPlayerId] = useState<number | null>(null)

  const { begin: beginFullScreenDice, overlayNode: fullScreenDiceOverlay, sceneDiceSpinning, isRolling } =
    useFullScreenDiceRoll(dispatch)

  useEffect(() => {
    setCameraFollowPlayerId(null)
  }, [resetSeq])

  useEffect(() => {
    if (state.phase === 'gameover') setCameraFollowPlayerId(null)
  }, [state.phase])

  const onRestart = () => {
    startGame()
    setResetSeq((s) => s + 1)
  }

  const lockCameraOnRoller = () => setCameraFollowPlayerId(state.currentPlayer)

  const current = state.players[state.currentPlayer]

  return (
    <div className="relative z-0 h-full min-h-[220px] w-full min-w-0 overflow-hidden rounded-xl border border-white/60 bg-[url('/monopoly/backgrounds/plane-window.jpg')] bg-cover bg-center shadow-[0_28px_90px_rgba(2,6,23,0.35),0_10px_30px_rgba(2,6,23,0.18)] max-md:min-h-0 max-md:flex-1 sm:rounded-[1.5rem] md:min-h-[460px] md:rounded-[1.75rem]">
      <div className="pointer-events-none absolute inset-0 z-[1] bg-white/30 backdrop-blur-[2px]" aria-hidden />
      {/*
        Canvas 預設會吃掉全區點擊；改為 pointer-events-none 讓底部按鈕／設定可點。
        若之後要在場景內互動，再在子元件用 pointer-events-auto。
      */}
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{
          fov: INITIAL_ORBIT_CAMERA.fov,
          near: 0.06,
          far: 900,
          position: [...INITIAL_ORBIT_CAMERA.position],
        }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor('#000000', 0)
          if (camera instanceof THREE.PerspectiveCamera) {
            const el = gl.domElement
            camera.aspect = el.clientWidth / Math.max(1, el.clientHeight)
            camera.updateProjectionMatrix()
          }
        }}
        className="pointer-events-auto absolute inset-0 z-[2] h-full w-full cursor-grab touch-none active:cursor-grabbing"
      >
        <Suspense fallback={null}>
          <MonopolyScene
            state={state}
            resetSeq={resetSeq}
            diceSpinning={sceneDiceSpinning}
            cameraFollowPlayerId={cameraFollowPlayerId}
          />
        </Suspense>
      </Canvas>

      {fullScreenDiceOverlay}

      <AnimatePresence>
        {cameraFollowPlayerId != null && state.phase !== 'gameover' && (
          <div
            key="camera-follow-done"
            className="pointer-events-auto absolute bottom-[9.25rem] left-0 right-0 z-[52] flex justify-center px-3 sm:bottom-[9.75rem] md:bottom-[12.5rem]"
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="flex justify-center"
            >
              <GameButton
                type="button"
                variant="secondary"
                onClick={() => setCameraFollowPlayerId(null)}
                className="!inline-flex !w-auto min-w-[5.75rem] flex-row items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs !shadow-[0_6px_0_#c4b5fd,0_8px_20px_rgba(109,40,217,0.16)] ring-2 ring-amber-300/70 ring-offset-1 ring-offset-violet-100/90 sm:min-w-[7rem] sm:gap-2 sm:rounded-2xl sm:px-6 sm:py-2.5 sm:text-sm sm:!shadow-[0_8px_0_#c4b5fd,0_10px_28px_rgba(109,40,217,0.18)] sm:ring-offset-2 md:min-w-[7.75rem] md:rounded-[1.125rem] md:py-3 md:text-base"
              >
                <span className="text-[1.1em] leading-none drop-shadow-sm" aria-hidden>
                  ◎
                </span>
                結束
              </GameButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <p className="w-full max-w-full truncate text-[7px] font-bold leading-tight text-violet-600 sm:text-[8px]">
                  棋子：{mascotLabelForPlayerId(p.id)}
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
                  <p className="truncate text-[10px] font-semibold text-violet-600">棋子：{mascotLabelForPlayerId(p.id)}</p>
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
                className="space-y-1 rounded-xl border-2 border-white/80 bg-white/90 p-1.5 shadow-2xl backdrop-blur-md sm:space-y-2 sm:p-2 md:rounded-2xl md:p-3"
              >
                {state.phase === 'roll' && (
                  <>
                    {current.inJail ? (
                      <>
                        <GameButton
                          type="button"
                          variant="orange"
                          disabled={current.money < 50 || isRolling}
                          onClick={() => {
                            lockCameraOnRoller()
                            beginFullScreenDice('jail_pay', current.name)
                          }}
                        >
                          付 $50 出獄並擲骰
                        </GameButton>
                        <GameButton
                          type="button"
                          variant="primary"
                          disabled={isRolling}
                          onClick={() => {
                            lockCameraOnRoller()
                            beginFullScreenDice('roll', current.name)
                          }}
                        >
                          擲骰（雙數出獄）
                        </GameButton>
                      </>
                    ) : (
                      <GameButton
                        type="button"
                        variant="primary"
                        disabled={isRolling}
                        onClick={() => {
                          lockCameraOnRoller()
                          beginFullScreenDice('roll', current.name)
                        }}
                      >
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
          className="rounded-lg border-2 border-white/80 bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-violet-700 shadow-lg backdrop-blur-md hover:bg-white sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs md:rounded-2xl md:px-4 md:py-2 md:text-sm"
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
                  placeholder={`玩家 ${i + 1}（${mascotLabelForPlayerId(i)}）`}
                />
              ))}
              <p className="mb-1 text-[9px] leading-snug text-violet-600/95">棋子對應：{mascotLegendLine(playerCount)}</p>
              <GameButton type="button" variant="secondary" onClick={onRestart} className="mt-1">
                重新開始
              </GameButton>
              <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                規則：40 格；經過起點 +{GO_BONUS}；同色一組買齊租金×{MONOPOLY_RENT_MULTIPLIER}；鐵路／公共事業依持有數計租；破產資產充公。
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
