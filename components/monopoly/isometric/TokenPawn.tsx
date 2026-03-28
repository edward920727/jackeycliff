'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { cellIndexToXZ, tokenSlotOffset } from '@/lib/monopoly/gridCoords'

type Props = {
  cellIndex: number
  color: string
  slot: number
  totalOnCell: number
}

/** 棋子直接跟隨邏輯格子；僅在換格時做跳躍（避免逐步動畫與狀態不同導致異常） */
export function TokenPawn({ cellIndex, color, slot, totalOnCell }: Props) {
  const jumpRef = useRef(0)
  const prevCell = useRef(cellIndex)
  const groupRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()

  useEffect(() => {
    if (prevCell.current !== cellIndex) {
      prevCell.current = cellIndex
      jumpRef.current = 1
      invalidate()
    }
  }, [cellIndex, invalidate])

  useFrame(() => {
    if (!groupRef.current) return
    const pos = cellIndexToXZ(cellIndex)
    if (!pos) return
    const [ox, oz] = tokenSlotOffset(slot, totalOnCell)
    const [x, z] = pos
    const baseY = 0.48
    const y = baseY + Math.sin(Math.min(jumpRef.current, 1) * Math.PI) * 0.55
    groupRef.current.position.set(x + ox, y, z + oz)
    if (jumpRef.current > 0.02) {
      jumpRef.current *= 0.82
      invalidate()
    }
  })

  const pos = cellIndexToXZ(cellIndex)
  if (!pos) return null

  return (
    <group ref={groupRef}>
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.62, 22]} />
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.2}
          emissive={color}
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.4, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.38} />
      </mesh>
    </group>
  )
}
