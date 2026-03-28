'use client'

import * as THREE from 'three'
import type { BoardCellDef } from '@/lib/monopoly/types'
import { cellStripColor, inwardEdgeFromBoardPosition, type InwardEdge } from './cellColors'
import { TileLandmark } from './TileLandmark'
import { RoundedBox } from '@react-three/drei'

const W = 1.85
const H = 0.45
const D = 1.85
const TOP = 0.92
const STRIP = 0.26

const BODY = '#e8e8ea'
const FACE = '#fafafa'

type Props = {
  cell: BoardCellDef
  showBuilding: boolean
  buildingHeight: number
  ownerColor?: string | null
  /** 格心在棋盤上的 world (x,z)，用來決定色條貼在朝向中心的那一邊 */
  worldXZ: [number, number]
}

function TopStrip({
  edge,
  color,
  y,
  isGo,
}: {
  edge: InwardEdge
  color: string
  y: number
  isGo?: boolean
}) {
  const halfW = (W * TOP) / 2
  const halfD = (D * TOP) / 2
  const stripW = isGo ? STRIP * 1.35 : STRIP
  const mat = (
    <meshStandardMaterial
      color={color}
      roughness={isGo ? 0.28 : 0.38}
      metalness={isGo ? 0.22 : 0.12}
      emissive={color}
      emissiveIntensity={isGo ? 0.22 : 0.06}
    />
  )

  switch (edge) {
    case 'posX':
      return (
        <mesh position={[halfW - stripW / 2, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <planeGeometry args={[stripW, D * TOP]} />
          {mat}
        </mesh>
      )
    case 'negX':
      return (
        <mesh position={[-halfW + stripW / 2, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <planeGeometry args={[stripW, D * TOP]} />
          {mat}
        </mesh>
      )
    case 'posZ':
      return (
        <mesh position={[0, y, halfD - stripW / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <planeGeometry args={[W * TOP, stripW]} />
          {mat}
        </mesh>
      )
    case 'negZ':
      return (
        <mesh position={[0, y, -halfD + stripW / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <planeGeometry args={[W * TOP, stripW]} />
          {mat}
        </mesh>
      )
  }
}

export function TileCube({ cell, showBuilding, buildingHeight, ownerColor, worldXZ }: Props) {
  const strip = cellStripColor(cell)
  const edge = inwardEdgeFromBoardPosition(worldXZ[0], worldXZ[1])
  const yTop = H / 2 + 0.021
  const isGo = cell.kind === 'go'

  return (
    <group>
      <RoundedBox args={[W, H, D]} radius={0.06} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          color={isGo ? '#f0ebe3' : BODY}
          roughness={isGo ? 0.42 : 0.48}
          metalness={isGo ? 0.1 : 0.08}
        />
      </RoundedBox>
      <mesh position={[0, H / 2 + 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W * TOP, D * TOP]} />
        {isGo ? (
          <meshStandardMaterial
            color="#fffbeb"
            roughness={0.35}
            metalness={0.08}
            emissive="#fef08a"
            emissiveIntensity={0.12}
          />
        ) : (
          <meshStandardMaterial color={FACE} roughness={0.42} metalness={0.06} />
        )}
      </mesh>
      {isGo && (
        <mesh position={[0, H / 2 + 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <ringGeometry args={[0.58, 0.86, 48]} />
          <meshStandardMaterial
            color="#f59e0b"
            roughness={0.32}
            metalness={0.35}
            emissive="#fbbf24"
            emissiveIntensity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <TopStrip edge={edge} color={strip} y={yTop} isGo={isGo} />
      {ownerColor && (
        <mesh position={[0, H / 2 + 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <ringGeometry args={[0.62, 0.8, 40]} />
          <meshStandardMaterial
            color={ownerColor}
            roughness={0.35}
            metalness={0.22}
            emissive={ownerColor}
            emissiveIntensity={0.14}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <TileLandmark cell={cell} />
      {showBuilding && buildingHeight > 0.05 && (
        <mesh position={[0, H / 2 + buildingHeight / 2 + 0.02, -0.14]} castShadow>
          <boxGeometry args={[0.5, buildingHeight, 0.5]} />
          <meshStandardMaterial
            color="#fbbf24"
            roughness={0.4}
            metalness={0.25}
            emissive="#f59e0b"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}
    </group>
  )
}
