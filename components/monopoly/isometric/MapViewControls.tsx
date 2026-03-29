'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { INITIAL_ORBIT_CAMERA } from './boardCamera'

/** 環顧中心高度（格心／棋子附近） */
const TARGET_Y = INITIAL_ORBIT_CAMERA.targetY

/**
 * 第三人稱：軌道相機環繞當前回合玩家所在格；拖曳旋轉、滾輪縮放、右鍵／中鍵平移（依裝置）。
 * 焦點與相機一併平滑平移，保留使用者調好的方位與距離。
 */
type Props = {
  focusWorld?: [number, number] | null
}

export function MapViewControls({ focusWorld = null }: Props) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    camera.near = 0.06
    camera.far = 900
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = INITIAL_ORBIT_CAMERA.fov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  useFrame((_, delta) => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const tx = focusWorld?.[0] ?? 0
    const tz = focusWorld?.[1] ?? 0
    const next = new THREE.Vector3(tx, TARGET_Y, tz)
    const k = 1 - Math.exp(-delta * 3.2)
    const before = ctrl.target.clone()
    ctrl.target.lerp(next, k)
    camera.position.add(ctrl.target.clone().sub(before))
    ctrl.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minDistance={5.8}
      maxDistance={50}
      minPolarAngle={0.28}
      maxPolarAngle={Math.PI / 2 - 0.06}
      rotateSpeed={0.65}
      zoomSpeed={0.75}
      panSpeed={0.65}
      target={[0, TARGET_Y, 0]}
    />
  )
}
