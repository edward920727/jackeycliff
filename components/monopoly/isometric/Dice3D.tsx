'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  buildDiceFaceTextures,
  buildStandardDieMaterials,
  disposeDieMaterials,
} from './diceFaceTextures'

type Props = {
  a: number
  b: number
  spinning: boolean
}

function clampPip(n: number) {
  return Math.min(6, Math.max(1, Math.round(n)))
}

/** 標準骰子：材質貼在 Box 的 +X,-X,+Y,-Y,+Z,-Z；各面點數與面法向對應（相對面合 7） */
const FACE_NORMAL: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  2: new THREE.Vector3(0, 0, 1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  5: new THREE.Vector3(0, 0, -1),
  6: new THREE.Vector3(0, -1, 0),
}

/** 六面貼圖骰子（共用材質）；停骰時將「v 點」那一面朝上（+Y） */
function TexturedDie({
  materials,
  value,
}: {
  materials: THREE.MeshStandardMaterial[]
  value: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const v = clampPip(value)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const from = FACE_NORMAL[v].clone()
    const up = new THREE.Vector3(0, 1, 0)
    mesh.quaternion.setFromUnitVectors(from, up)
  }, [v])

  return (
    <mesh ref={meshRef} castShadow receiveShadow material={materials}>
      <boxGeometry args={[0.78, 0.78, 0.78]} />
    </mesh>
  )
}

/** 棋盤中央上方 */
const CENTER_POS: [number, number, number] = [0, 3.05, 0]
const DIE_GAP = 0.58

export function Dice3D({ a, b, spinning }: Props) {
  const rootRef = useRef<THREE.Group>(null)
  const dieARef = useRef<THREE.Group>(null)
  const dieBRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const tRef = useRef(0)

  const [dieMaterials, setDieMaterials] = useState<THREE.MeshStandardMaterial[] | null>(null)

  useEffect(() => {
    const textures = buildDiceFaceTextures()
    const mats = buildStandardDieMaterials(textures)
    setDieMaterials(mats)
    return () => disposeDieMaterials(mats)
  }, [])

  const va = useMemo(() => clampPip(a), [a])
  const vb = useMemo(() => clampPip(b), [b])

  useFrame((_, dt) => {
    const t = (tRef.current += dt)

    if (!rootRef.current || !dieARef.current || !dieBRef.current) return

    if (spinning) {
      const bob = Math.sin(t * 11) * 0.14 + Math.sin(t * 19) * 0.06
      const sway = Math.sin(t * 7.5) * 0.06
      rootRef.current.position.set(CENTER_POS[0] + sway, CENTER_POS[1] + bob, CENTER_POS[2] + Math.cos(t * 6.2) * 0.05)

      dieARef.current.rotation.x += dt * (11 + Math.sin(t * 3) * 2)
      dieARef.current.rotation.y += dt * (13 + Math.cos(t * 2.5) * 1.5)
      dieARef.current.rotation.z += dt * (9 + Math.sin(t * 4) * 2)

      dieBRef.current.rotation.x += dt * (10 + Math.cos(t * 3.2) * 2)
      dieBRef.current.rotation.y += dt * (12 + Math.sin(t * 2.8) * 1.5)
      dieBRef.current.rotation.z += dt * (10.5 + Math.cos(t * 3.5) * 2)

      const orbit = 0.12
      dieARef.current.position.x = -DIE_GAP * 0.5 + Math.sin(t * 8) * orbit
      dieARef.current.position.z = Math.cos(t * 8) * orbit * 0.6
      dieBRef.current.position.x = DIE_GAP * 0.5 + Math.sin(t * 8 + 1.7) * orbit
      dieBRef.current.position.z = Math.cos(t * 8 + 1.7) * orbit * 0.6

      if (lightRef.current) {
        lightRef.current.intensity = 1.25 + Math.sin(t * 20) * 0.55
      }
    } else {
      rootRef.current.position.lerp(new THREE.Vector3(...CENTER_POS), 0.14)
      dieARef.current.position.lerp(new THREE.Vector3(-DIE_GAP * 0.5, 0, 0), 0.18)
      dieBRef.current.position.lerp(new THREE.Vector3(DIE_GAP * 0.5, 0, 0), 0.18)

      dieARef.current.rotation.x = THREE.MathUtils.lerp(dieARef.current.rotation.x, 0, 0.14)
      dieARef.current.rotation.y = THREE.MathUtils.lerp(dieARef.current.rotation.y, 0, 0.14)
      dieARef.current.rotation.z = THREE.MathUtils.lerp(dieARef.current.rotation.z, 0, 0.14)
      dieBRef.current.rotation.x = THREE.MathUtils.lerp(dieBRef.current.rotation.x, 0, 0.14)
      dieBRef.current.rotation.y = THREE.MathUtils.lerp(dieBRef.current.rotation.y, 0, 0.14)
      dieBRef.current.rotation.z = THREE.MathUtils.lerp(dieBRef.current.rotation.z, 0, 0.14)

      if (lightRef.current) {
        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 0, 0.12)
      }
    }
  })

  const fallback = (
    <mesh castShadow>
      <boxGeometry args={[0.78, 0.78, 0.78]} />
      <meshStandardMaterial color="#faf6f0" roughness={0.5} metalness={0.02} />
    </mesh>
  )

  return (
    <group ref={rootRef} position={CENTER_POS}>
      <pointLight
        ref={lightRef}
        position={[0, 0.85, 0.2]}
        color="#fefce8"
        intensity={0}
        distance={8}
        decay={2}
      />
      <group ref={dieARef} position={[-DIE_GAP * 0.5, 0, 0]}>
        {dieMaterials ? <TexturedDie materials={dieMaterials} value={va} /> : fallback}
      </group>
      <group ref={dieBRef} position={[DIE_GAP * 0.5, 0, 0]}>
        {dieMaterials ? <TexturedDie materials={dieMaterials} value={vb} /> : fallback}
      </group>
    </group>
  )
}
