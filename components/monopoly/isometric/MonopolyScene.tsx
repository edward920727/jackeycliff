'use client'

import { useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BOARD } from '@/lib/monopoly/board'
import { computeRent } from '@/lib/monopoly/engine'
import type { GameState } from '@/lib/monopoly/types'
import { cellIndexToXZ } from '@/lib/monopoly/gridCoords'
import { Html } from '@react-three/drei'
import { TileCube } from './TileCube'
import { TokenPawn } from './TokenPawn'
import { Dice3D } from './Dice3D'
import { BoardEnvironment } from './BoardEnvironment'
import { MapViewControls } from './MapViewControls'
import { playerColor } from '@/lib/monopoly/playerColors'

type Props = {
  state: GameState
  resetSeq: number
  diceSpinning: boolean
}

/**
 * drei Html 在正交相機下會用 camera.zoom 當縮放係數；若仍用透視常用的 distanceFactor（如 11），
 * 實際 scale = zoom × distanceFactor（例如 30×11）會把氣泡放大成整片白屏。
 * 正交時改為 distanceFactor ≈ 1/zoom，使與畫面比例一致。
 */
function BuyPromptBubble({
  position,
  children,
}: {
  position: [number, number, number]
  children: React.ReactNode
}) {
  const { camera } = useThree()
  const [zoom, setZoom] = useState(30)
  useFrame(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const z = camera.zoom
      setZoom((prev) => (Math.abs(prev - z) > 0.04 ? z : prev))
    }
  })
  const distanceFactor = useMemo(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      return 1 / zoom
    }
    return 11
  }, [camera, zoom])

  return (
    <Html position={position} center distanceFactor={distanceFactor}>
      {children}
    </Html>
  )
}

export function MonopolyScene({ state, resetSeq, diceSpinning }: Props) {
  return (
    <>
      <MapViewControls />
      <color attach="background" args={['#bfe3ff']} />
      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#e0f2fe', '#4a7c59', 0.45]} />
      <directionalLight position={[14, 28, 12]} intensity={1.05} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-10, 16, -8]} intensity={0.38} color="#fef9c3" />

      <BoardEnvironment />

      {BOARD.map((cell, i) => {
        const pos = cellIndexToXZ(i)
        if (!pos) return null
        const [x, z] = pos
        const owner = state.owners[i]
        const canBuild = owner != null && (cell.kind === 'property' || cell.kind === 'railroad')
        const rent = canBuild ? computeRent(i, state) : 0
        const bh = canBuild ? Math.min(0.35 + rent / 95, 1.35) : 0
        const ownerMark =
          owner != null && (cell.kind === 'property' || cell.kind === 'railroad')
            ? playerColor(owner)
            : null
        return (
          <group key={i} position={[x, 0, z]}>
            <TileCube
              cell={cell}
              showBuilding={canBuild}
              buildingHeight={bh}
              ownerColor={ownerMark}
              worldXZ={[x, z]}
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
              <div className="max-w-[200px] rounded-2xl border-2 border-white/70 bg-white/85 px-4 py-2.5 text-center shadow-2xl backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-500">購買中</p>
                <p className="mt-1 text-sm font-extrabold text-slate-800">{cell.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-violet-600">
                  {(cell.kind === 'property' || cell.kind === 'railroad') && <>${cell.price}</>}
                </p>
              </div>
            </BuyPromptBubble>
          )
        })()}
    </>
  )
}
