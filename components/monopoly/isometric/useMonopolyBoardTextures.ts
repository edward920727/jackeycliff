'use client'

import { useLayoutEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Poly Haven CC0：wood_floor、aerial_grass_rock（public/monopoly/textures）
 */
export function useMonopolyBoardTextures() {
  const [woodDiff, woodNor, woodRough, grassDiff, grassNor] = useTexture([
    '/monopoly/textures/wood_floor_diff_1k.jpg',
    '/monopoly/textures/wood_floor_nor_gl_1k.jpg',
    '/monopoly/textures/wood_floor_rough_1k.jpg',
    '/monopoly/textures/grass_diff_1k.jpg',
    '/monopoly/textures/grass_nor_gl_1k.jpg',
  ])

  useLayoutEffect(() => {
    woodDiff.colorSpace = THREE.SRGBColorSpace
    grassDiff.colorSpace = THREE.SRGBColorSpace
    for (const t of [woodNor, woodRough, grassNor]) {
      t.colorSpace = THREE.NoColorSpace
    }
    for (const t of [woodDiff, woodNor, woodRough, grassDiff, grassNor]) {
      t.anisotropy = 8
    }
    ;[woodDiff, woodNor, woodRough].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(2.4, 2.4)
    })
    grassDiff.wrapS = grassDiff.wrapT = THREE.RepeatWrapping
    grassNor.wrapS = grassNor.wrapT = THREE.RepeatWrapping
    grassDiff.repeat.set(14, 14)
    grassNor.repeat.set(14, 14)
  }, [woodDiff, woodNor, woodRough, grassDiff, grassNor])

  return { woodDiff, woodNor, woodRough, grassDiff, grassNor }
}
