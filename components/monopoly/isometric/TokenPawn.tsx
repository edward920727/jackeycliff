'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { cellIndexToXZ, cellsAlongPath, tokenSlotOffset } from '@/lib/monopoly/gridCoords'
import { MODEL_URLS } from '@/lib/monopoly/mascots'

/** glTF 授權見 public/monopoly/ATTRIBUTION.txt */
MODEL_URLS.forEach((u) => useGLTF.preload(u))

/** 單次骰子最多 12 步；超過則改為直線飛入（長距離跳格／非步行） */
const MAX_WALK_SEGMENTS = 12
/** 每格步行秒數（越大走得越慢） */
const SECONDS_PER_CELL = 0.28
/** 長距離飛入整段動畫長度 */
const FLY_DURATION = 0.75

function smoothStep01(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

type WalkAnim = { kind: 'walk'; path: number[]; t: number }
type FlyAnim = { kind: 'fly'; from: [number, number]; to: [number, number]; t: number }
type AnimState = WalkAnim | FlyAnim | null

type Props = {
  cellIndex: number
  /** 保留供 UI 對應色；棋子模型使用 glTF 原色 */
  color?: string
  playerId: number
  slot: number
  totalOnCell: number
}

function GltfMascot({ playerId }: { playerId: number }) {
  const url = MODEL_URLS[playerId % 4]!
  const { scene } = useGLTF(url)
  const root = useMemo(() => {
    const r = cloneSkeleton(scene)
    r.rotation.y = Math.PI
    r.updateMatrixWorld(true)
    const fit0 = new THREE.Box3().setFromObject(r)
    const size0 = fit0.getSize(new THREE.Vector3())
    const max = Math.max(size0.x, size0.y, size0.z, 1e-4)
    const s = 0.52 / max
    r.scale.setScalar(s)
    r.position.set(0, 0, 0)
    r.updateMatrixWorld(true)
    const fit = new THREE.Box3().setFromObject(r)
    const cx = (fit.min.x + fit.max.x) / 2
    const cz = (fit.min.z + fit.max.z) / 2
    r.position.set(-cx, -fit.min.y, -cz)
    return r
  }, [scene, url])

  return <primitive object={root} />
}

export function TokenPawn({ cellIndex, playerId, slot, totalOnCell }: Props) {
  const jumpRef = useRef(0)
  const groupRef = useRef<THREE.Group>(null)
  const { invalidate } = useThree()
  const yawRef = useRef(0)

  /** 動畫結束後與 state.position 一致；動畫中為起點格 */
  const stableCellRef = useRef(cellIndex)
  const animRef = useRef<AnimState>(null)
  const targetCellRef = useRef(cellIndex)

  const applyPosition = (x: number, z: number, yExtra: number) => {
    if (!groupRef.current) return
    const [ox, oz] = tokenSlotOffset(slot, totalOnCell)
    const baseY = 0.48
    const hop = Math.sin(Math.min(jumpRef.current, 1) * Math.PI) * 0.55
    groupRef.current.position.set(x + ox, baseY + hop + yExtra, z + oz)
  }

  const syncStatic = () => {
    const pos = cellIndexToXZ(cellIndex)
    if (!pos) return
    applyPosition(pos[0], pos[1], 0)
  }

  useLayoutEffect(() => {
    targetCellRef.current = cellIndex
    if (stableCellRef.current !== cellIndex) {
      const from = stableCellRef.current
      const path = cellsAlongPath(from, cellIndex)
      const segments = path.length - 1
      if (segments <= 0) {
        stableCellRef.current = cellIndex
        animRef.current = null
      } else if (segments > MAX_WALK_SEGMENTS) {
        const a = cellIndexToXZ(from)
        const b = cellIndexToXZ(cellIndex)
        if (a && b) {
          animRef.current = { kind: 'fly', from: a, to: b, t: 0 }
        } else {
          stableCellRef.current = cellIndex
          animRef.current = null
        }
      } else {
        animRef.current = { kind: 'walk', path, t: 0 }
      }
    }
    if (!animRef.current) {
      syncStatic()
    }
  }, [cellIndex, slot, totalOnCell])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (jumpRef.current > 0.02) {
      jumpRef.current *= 0.82
      invalidate()
    }

    const anim = animRef.current
    const target = targetCellRef.current

    if (!anim) {
      syncStatic()
      return
    }

    if (anim.kind === 'walk') {
      const { path } = anim
      const numSeg = path.length - 1
      anim.t += delta
      const maxT = numSeg * SECONDS_PER_CELL
      if (anim.t >= maxT) {
        stableCellRef.current = target
        animRef.current = null
        jumpRef.current = 1
        syncStatic()
        invalidate()
        return
      }
      const segF = anim.t / SECONDS_PER_CELL
      const i = Math.min(Math.floor(segF), numSeg - 1)
      const alpha = smoothStep01(segF - i)
      const c0 = cellIndexToXZ(path[i]!)
      const c1 = cellIndexToXZ(path[i + 1]!)
      if (!c0 || !c1) {
        stableCellRef.current = target
        animRef.current = null
        syncStatic()
        return
      }
      const x = c0[0] + (c1[0] - c0[0]) * alpha
      const z = c0[1] + (c1[1] - c0[1]) * alpha
      // 轉向：朝向下一格方向（平滑）
      const dx = c1[0] - c0[0]
      const dz = c1[1] - c0[1]
      if (Math.abs(dx) + Math.abs(dz) > 1e-6) {
        const targetYaw = Math.atan2(dx, dz) // y 軸：z 向前、x 向右
        const a = THREE.MathUtils.euclideanModulo(targetYaw - yawRef.current + Math.PI, Math.PI * 2) - Math.PI
        const turnK = 1 - Math.exp(-delta * 9.5)
        yawRef.current = yawRef.current + a * turnK
        groupRef.current.rotation.y = yawRef.current
      }
      const prevSeg = Math.floor((anim.t - delta) / SECONDS_PER_CELL)
      if (i > prevSeg) {
        jumpRef.current = 1
      }
      applyPosition(x, z, 0)
      invalidate()
      return
    }

    if (anim.kind === 'fly') {
      anim.t += delta
      const a = smoothStep01(anim.t / FLY_DURATION)
      const x = anim.from[0] + (anim.to[0] - anim.from[0]) * a
      const z = anim.from[1] + (anim.to[1] - anim.from[1]) * a
      const dx = anim.to[0] - anim.from[0]
      const dz = anim.to[1] - anim.from[1]
      if (Math.abs(dx) + Math.abs(dz) > 1e-6) {
        const targetYaw = Math.atan2(dx, dz)
        const diff = THREE.MathUtils.euclideanModulo(targetYaw - yawRef.current + Math.PI, Math.PI * 2) - Math.PI
        const turnK = 1 - Math.exp(-delta * 7.5)
        yawRef.current = yawRef.current + diff * turnK
        groupRef.current.rotation.y = yawRef.current
      }
      if (anim.t >= FLY_DURATION) {
        stableCellRef.current = target
        animRef.current = null
        jumpRef.current = 1
        syncStatic()
        invalidate()
        return
      }
      applyPosition(x, z, Math.sin(a * Math.PI) * 0.35)
      invalidate()
    }
  })

  const pos = cellIndexToXZ(cellIndex)
  if (!pos) return null

  return (
    <group ref={groupRef}>
      <group position={[0, -0.06, 0]}>
        <GltfMascot playerId={playerId} />
      </group>
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.4, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.38} />
      </mesh>
    </group>
  )
}
