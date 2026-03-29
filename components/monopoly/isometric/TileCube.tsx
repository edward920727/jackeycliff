'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { BoardCellDef } from '@/lib/monopoly/types'
import { cellStripColor, inwardEdgeFromBoardPosition, type InwardEdge } from './cellColors'
import { TileLandmark } from './TileLandmark'
import { TileFaceLabel } from './TileFaceLabel'
import { RoundedBox } from '@react-three/drei'
import { ownershipRingColors } from '@/lib/monopoly/playerColors'

const W = 1.85
const H = 0.45
const D = 1.85
const TOP = 0.92
const STRIP = 0.26

const BODY = '#e8e8ea'
const FACE = '#fafafa'

function blendHex(base: string, mix: string, t: number) {
  const c = new THREE.Color(base)
  c.lerp(new THREE.Color(mix), t)
  return `#${c.getHexString()}`
}

/** Poly Haven 木地板 PBR（由場景層載入） */
export type BoardWoodTextures = {
  woodDiff: THREE.Texture
  woodNor: THREE.Texture
  woodRough: THREE.Texture
}

type Props = {
  cell: BoardCellDef
  /** 0 無建物；1～4 戶；5 旅館 */
  buildingLevel: number
  /** 有地主時傳玩家 id，用於與格線組別色區隔的佔領標記 */
  ownerPlayerId?: number | null
  /** 同色組已湊齊（租金加倍） */
  isFullSet?: boolean
  /** 格心在棋盤上的 world (x,z)，用來決定色條貼在朝向中心的那一邊 */
  worldXZ: [number, number]
  /** 木紋套圖；未傳則維持純色（全棋盤共用同一套 Texture，不重複 clone） */
  boardTex?: BoardWoodTextures | null
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

const HIDE_DELAY_MS = 220

export function TileCube({
  cell,
  buildingLevel,
  ownerPlayerId = null,
  isFullSet = false,
  worldXZ,
  boardTex = null,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const scheduleHide = () => {
    clearHideTimer()
    hideTimer.current = setTimeout(() => setHovered(false), HIDE_DELAY_MS)
  }

  useEffect(() => () => clearHideTimer(), [])

  const onTilePointerEnter = () => {
    clearHideTimer()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const onTilePointerLeave = () => {
    scheduleHide()
    document.body.style.cursor = 'auto'
  }

  const onCardPointerEnter = () => {
    clearHideTimer()
    setHovered(true)
  }

  const onCardPointerLeave = () => {
    document.body.style.cursor = 'auto'
    scheduleHide()
  }

  const strip = cellStripColor(cell)
  const owned = ownerPlayerId != null
  /** 已購買：色條略灰化，保留組別色相但與「佔領環」區隔 */
  const stripDisplay = useMemo(
    () => (owned ? blendHex(strip, '#e7e5e4', 0.42) : strip),
    [strip, owned]
  )
  const edge = inwardEdgeFromBoardPosition(worldXZ[0], worldXZ[1])
  const yTop = H / 2 + 0.021
  const isGo = cell.kind === 'go'
  const bodyColor = useMemo(() => {
    if (isGo) return '#f0ebe3'
    const mix = owned ? 0.085 : 0.14
    if (cell.kind === 'property') return blendHex(BODY, strip, mix)
    if (cell.kind === 'railroad') return blendHex(BODY, strip, owned ? 0.065 : 0.1)
    if (cell.kind === 'utility') return blendHex(BODY, strip, owned ? 0.07 : 0.11)
    if (cell.kind === 'chance') return blendHex(BODY, strip, 0.08)
    if (cell.kind === 'chest') return blendHex(BODY, strip, 0.08)
    if (cell.kind === 'tax') return blendHex(BODY, strip, 0.09)
    return BODY
  }, [cell, isGo, strip, owned])

  const topFaceColor = useMemo(() => {
    if (isGo) return '#fffbeb'
    const mix = owned ? 0.028 : 0.06
    if (cell.kind === 'property') return blendHex(FACE, strip, mix)
    if (cell.kind === 'railroad' || cell.kind === 'utility') return blendHex(FACE, strip, owned ? 0.03 : 0.05)
    return FACE
  }, [cell, isGo, strip, owned])

  const bodyTint = useMemo(() => new THREE.Color(bodyColor), [bodyColor])
  const topTint = useMemo(() => new THREE.Color(topFaceColor), [topFaceColor])

  return (
    <group>
      {/* 隱形碰撞盒：含格子本體與上方說明區，滑入才顯示介紹 */}
      <mesh
        position={[0, 0.42, 0]}
        onPointerEnter={onTilePointerEnter}
        onPointerOut={onTilePointerLeave}
      >
        <boxGeometry args={[W * 1.1, 1.2, D * 1.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <RoundedBox args={[W, H, D]} radius={0.06} smoothness={3} castShadow receiveShadow>
        {boardTex ? (
          <meshStandardMaterial
            map={boardTex.woodDiff}
            normalMap={boardTex.woodNor}
            roughnessMap={boardTex.woodRough}
            color={bodyTint}
            roughness={1}
            metalness={0.05}
            envMapIntensity={0.4}
          />
        ) : (
          <meshStandardMaterial
            color={bodyColor}
            roughness={isGo ? 0.42 : 0.48}
            metalness={isGo ? 0.1 : 0.08}
          />
        )}
      </RoundedBox>
      <mesh position={[0, H / 2 + 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W * TOP, D * TOP]} />
        {boardTex ? (
          isGo ? (
            <meshStandardMaterial
              map={boardTex.woodDiff}
              normalMap={boardTex.woodNor}
              roughnessMap={boardTex.woodRough}
              color="#fff8e8"
              roughness={1}
              metalness={0.06}
              emissive="#fde68a"
              emissiveIntensity={0.14}
              envMapIntensity={0.45}
            />
          ) : (
            <meshStandardMaterial
              map={boardTex.woodDiff}
              normalMap={boardTex.woodNor}
              roughnessMap={boardTex.woodRough}
              color={topTint}
              roughness={1}
              metalness={0.05}
              emissive={strip}
              emissiveIntensity={
                owned ? (cell.kind === 'property' ? 0.018 : 0.012) : cell.kind === 'property' ? 0.05 : 0.025
              }
              envMapIntensity={0.4}
            />
          )
        ) : isGo ? (
          <meshStandardMaterial
            color="#fffbeb"
            roughness={0.35}
            metalness={0.08}
            emissive="#fef08a"
            emissiveIntensity={0.12}
          />
        ) : (
          <meshStandardMaterial
            color={topFaceColor}
            roughness={0.4}
            metalness={0.06}
            emissive={strip}
            emissiveIntensity={
              owned ? (cell.kind === 'property' ? 0.015 : 0.01) : cell.kind === 'property' ? 0.04 : 0.02
            }
          />
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
      <TopStrip edge={edge} color={stripDisplay} y={yTop} isGo={isGo} />
      {ownerPlayerId != null && (() => {
        const { main, outline } = ownershipRingColors(ownerPlayerId)
        return (
          <group position={[0, H / 2 + 0.032, 0]}>
            {isFullSet && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
                <ringGeometry args={[0.88, 0.98, 56]} />
                <meshStandardMaterial
                  color={strip}
                  roughness={0.22}
                  metalness={0.35}
                  emissive={strip}
                  emissiveIntensity={0.35}
                  transparent
                  opacity={0.72}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
            {/* 外圈淺邊：與格線組別色、內圈玩家色都區隔 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <ringGeometry args={[0.71, 0.86, 52]} />
              <meshStandardMaterial
                color={outline}
                roughness={0.42}
                metalness={0.08}
                emissive={outline}
                emissiveIntensity={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* 內圈：加深玩家色，避免與淺色組別條（如 light_blue）混淆 */}
            <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <ringGeometry args={[0.56, 0.7, 44]} />
              <meshStandardMaterial
                color={main}
                roughness={0.32}
                metalness={0.28}
                emissive={main}
                emissiveIntensity={0.22}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })()}
      <TileLandmark cell={cell} />
      <TileFaceLabel
        cell={cell}
        y={0.56}
        visible={hovered}
        isFullSet={!!isFullSet && cell.kind === 'property'}
        onCardPointerEnter={onCardPointerEnter}
        onCardPointerLeave={onCardPointerLeave}
      />
      {cell.kind === 'property' && buildingLevel > 0 && buildingLevel < 5 && (
        <group position={[0, H / 2 + 0.06, -0.13]}>
          {Array.from({ length: buildingLevel }).map((_, i) => {
            const spread = 0.2
            const cx = (i - (buildingLevel - 1) / 2) * spread
            return (
              <mesh key={i} position={[cx, 0.07, 0]} castShadow>
                <boxGeometry args={[0.16, 0.12, 0.16]} />
                <meshStandardMaterial
                  color="#16a34a"
                  roughness={0.45}
                  metalness={0.12}
                  emissive="#14532d"
                  emissiveIntensity={0.08}
                />
              </mesh>
            )
          })}
        </group>
      )}
      {cell.kind === 'property' && buildingLevel >= 5 && (
        <mesh position={[0, H / 2 + 0.22, -0.13]} castShadow>
          <boxGeometry args={[0.48, 0.26, 0.42]} />
          <meshStandardMaterial
            color="#b91c1c"
            roughness={0.35}
            metalness={0.28}
            emissive="#7f1d1d"
            emissiveIntensity={0.12}
          />
        </mesh>
      )}
    </group>
  )
}
