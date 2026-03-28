'use client'

import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const INITIAL_POS: [number, number, number] = [26, 26, 26]

const TOUCH = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 } as const
const MOUSE = { ROTATE: 0, DOLLY: 1, PAN: 2 } as const

export type MapTouchMode = 'rotate' | 'pan'

declare global {
  interface WindowEventMap {
    'monopoly-touch-mode': CustomEvent<MapTouchMode>
  }
}

/**
 * 旋轉 + 平移 + 縮放（正交相機）
 * - 滑鼠：左鍵旋轉、右鍵平移、滾輪／中鍵縮放
 * - 粗指標：單指在「旋轉／平移」間切換（見棋盤上按鈕），避免雙指 dolly 崩潰
 * - 精細指標：預設觸控（含觸控板捏合）
 */
export function MapViewControls() {
  const { camera } = useThree()
  const [coarsePointer, setCoarsePointer] = useState(false)
  const [touchMode, setTouchMode] = useState<MapTouchMode>('rotate')

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarsePointer(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onMode = (e: CustomEvent<MapTouchMode>) => {
      if (e.detail === 'rotate' || e.detail === 'pan') setTouchMode(e.detail)
    }
    window.addEventListener('monopoly-touch-mode', onMode as EventListener)
    return () => window.removeEventListener('monopoly-touch-mode', onMode as EventListener)
  }, [])

  useEffect(() => {
    camera.position.set(...INITIAL_POS)
    camera.lookAt(0, 0, 0)
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = 30
      camera.updateProjectionMatrix()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <OrbitControls
      makeDefault
      target={[0, 0, 0]}
      enableDamping
      dampingFactor={0.08}
      enableRotate
      enablePan
      enableZoom
      minZoom={12}
      maxZoom={72}
      minPolarAngle={0.28}
      maxPolarAngle={1.42}
      screenSpacePanning
      rotateSpeed={0.55}
      panSpeed={0.9}
      zoomSpeed={0.85}
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      {...(coarsePointer
        ? {
            touches: {
              ONE: touchMode === 'rotate' ? TOUCH.ROTATE : TOUCH.PAN,
              TWO: TOUCH.PAN,
            },
          }
        : {})}
    />
  )
}
