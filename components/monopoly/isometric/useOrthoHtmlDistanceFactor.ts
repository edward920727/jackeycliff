'use client'

import { useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** drei Html：正交相機用 1/zoom；透視相機用固定比例（第一人稱） */
export function useOrthoHtmlDistanceFactor() {
  const { camera } = useThree()
  const [zoom, setZoom] = useState(22)
  useFrame(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      const z = camera.zoom
      setZoom((prev) => (Math.abs(prev - z) > 0.04 ? z : prev))
    }
  })
  return useMemo(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      return 1 / zoom
    }
    return 10
  }, [camera, zoom])
}
