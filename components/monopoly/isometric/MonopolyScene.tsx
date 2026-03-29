'use client'

import { Suspense, useMemo } from 'react'
import { BOARD } from '@/lib/monopoly/board'
import { hasColorMonopoly } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'
import { cellIndexToXZ } from '@/lib/monopoly/gridCoords'
import { Environment, Html } from '@react-three/drei'
import { TileCube } from './TileCube'
import { TokenPawn } from './TokenPawn'
import { Dice3D } from './Dice3D'
import { BoardEnvironment } from './BoardEnvironment'
import { MapViewControls } from './MapViewControls'
import { playerColor } from '@/lib/monopoly/playerColors'
import { useOrthoHtmlDistanceFactor } from './useOrthoHtmlDistanceFactor'
import { useMonopolyBoardTextures } from './useMonopolyBoardTextures'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  state: GameState
  resetSeq: number
  diceSpinning: boolean
  /** 有值時鏡頭跟隨該玩家格（走棋），null 時跟隨 state.currentPlayer */
  cameraFollowPlayerId: number | null
}

function BuyPromptBubble({
  position,
  children,
}: {
  position: [number, number, number]
  children: React.ReactNode
}) {
  const distanceFactor = useOrthoHtmlDistanceFactor()
  return (
    <Html position={position} center distanceFactor={distanceFactor}>
      {children}
    </Html>
  )
}

function MoneyPop({
  playerId,
  amount,
  state,
}: {
  playerId: number
  amount: number
  state: GameState
}) {
  const p = state.players[playerId]
  if (!p || p.bankrupt) return null
  const xz = cellIndexToXZ(p.position)
  if (!xz) return null
  const distanceFactor = useOrthoHtmlDistanceFactor()
  const isPlus = amount > 0
  const txt = `${isPlus ? '+' : '-'}$${Math.abs(amount)}`
  return (
    <Html position={[xz[0], 1.9, xz[1]]} center distanceFactor={distanceFactor} occlude={false}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.92 }}
        animate={{ opacity: 1, y: -18, scale: 1 }}
        exit={{ opacity: 0, y: -26, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        className={[
          'pointer-events-none select-none rounded-full border-2 px-3 py-1 text-sm font-extrabold tracking-tight shadow-lg backdrop-blur-md',
          isPlus
            ? 'border-emerald-200/90 bg-emerald-50/85 text-emerald-800 shadow-[0_12px_30px_rgba(16,185,129,0.18)]'
            : 'border-rose-200/90 bg-rose-50/85 text-rose-700 shadow-[0_12px_30px_rgba(244,63,94,0.16)]',
        ].join(' ')}
      >
        {txt}
      </motion.div>
    </Html>
  )
}

function MonopolySceneContent({ state, resetSeq, diceSpinning, cameraFollowPlayerId }: Props) {
  const { woodDiff, woodNor, woodRough, grassDiff, grassNor } = useMonopolyBoardTextures()
  const boardTex = useMemo(
    () => ({ woodDiff, woodNor, woodRough }),
    [woodDiff, woodNor, woodRough]
  )
  const grass = useMemo(() => ({ map: grassDiff, normalMap: grassNor }), [grassDiff, grassNor])

  const focusPlayerIndex = (() => {
    if (state.phase === 'gameover') return state.currentPlayer
    if (
      cameraFollowPlayerId != null &&
      state.players[cameraFollowPlayerId] &&
      !state.players[cameraFollowPlayerId].bankrupt
    ) {
      return cameraFollowPlayerId
    }
    return state.currentPlayer
  })()
  const focusPlayer = state.players[focusPlayerIndex]
  const focusWorld: [number, number] = (() => {
    if (state.phase === 'gameover') return [0, 0]
    if (!focusPlayer || focusPlayer.bankrupt) return [0, 0]
    const xz = cellIndexToXZ(focusPlayer.position)
    return xz ? [xz[0], xz[1]] : [0, 0]
  })()

  return (
    <>
      <MapViewControls
        focusWorld={focusWorld}
        cinematicMode={diceSpinning ? 'roll' : cameraFollowPlayerId != null ? 'move' : 'idle'}
      />
      <Environment preset="city" environmentIntensity={0.55} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#e8f4fc', '#5a8f5e', 0.5]} />
      <directionalLight position={[14, 28, 12]} intensity={1.05} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-10, 16, -8]} intensity={0.42} color="#fef9c3" />

      <BoardEnvironment grass={grass} />

      <AnimatePresence>
        {state.moneyFx?.entries?.map((e) => (
          <MoneyPop key={`${state.moneyFx?.id}-${e.playerId}-${e.amount}`} playerId={e.playerId} amount={e.amount} state={state} />
        ))}
      </AnimatePresence>

      {BOARD.map((cell, i) => {
        const pos = cellIndexToXZ(i)
        if (!pos) return null
        const [x, z] = pos
        const owner = state.owners[i]
        const buildingLevel = cell.kind === 'property' ? state.buildings[i] ?? 0 : 0
        const ownerPlayerId =
          owner != null && (cell.kind === 'property' || cell.kind === 'railroad' || cell.kind === 'utility')
            ? owner
            : null
        const isFullSet = cell.kind === 'property' ? hasColorMonopoly(state, i) : false
        return (
          <group key={i} position={[x, 0, z]}>
            <TileCube
              cell={cell}
              buildingLevel={buildingLevel}
              ownerPlayerId={ownerPlayerId}
              isFullSet={isFullSet}
              worldXZ={[x, z]}
              boardTex={boardTex}
            />
          </group>
        )
      })}

      {state.players
        .filter((p) => !p.bankrupt)
        .map((p) => {
          const sameCell = state.players
            .filter((o) => !o.bankrupt && o.position === p.position)
            .sort((a, b) => a.id - b.id)
          const slot = sameCell.findIndex((x) => x.id === p.id)
          const totalOnCell = sameCell.length
          return (
            <TokenPawn
              key={`${p.id}-${resetSeq}`}
              cellIndex={p.position}
              color={playerColor(p.id)}
              playerId={p.id}
              slot={slot}
              totalOnCell={totalOnCell}
            />
          )
        })}

      {state.dice && (
        <Dice3D a={state.dice[0]} b={state.dice[1]} spinning={diceSpinning} />
      )}

      {state.phase === 'buy_prompt' &&
        (() => {
          const cur = state.players[state.currentPlayer]
          if (!cur || cur.bankrupt) return null
          const xz = cellIndexToXZ(cur.position)
          if (!xz) return null
          const cell = BOARD[cur.position]
          return (
            <BuyPromptBubble position={[xz[0], 2.5, xz[1]]}>
              <div className="max-w-[240px] rounded-2xl border-2 border-white/70 bg-white/85 px-5 py-3 text-center shadow-2xl backdrop-blur-md">
                <p className="text-sm font-bold uppercase tracking-wider text-violet-500">購買中</p>
                <p className="mt-1 text-base font-extrabold text-slate-800">{cell.name}</p>
                <p className="mt-1 text-sm font-semibold text-violet-600">
                  {(cell.kind === 'property' || cell.kind === 'railroad' || cell.kind === 'utility') && (
                    <>${cell.price}</>
                  )}
                </p>
              </div>
            </BuyPromptBubble>
          )
        })()}
    </>
  )
}

export function MonopolyScene(props: Props) {
  return (
    <Suspense fallback={null}>
      <MonopolySceneContent {...props} />
    </Suspense>
  )
}
