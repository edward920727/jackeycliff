'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

type Props = {
  a: number
  b: number
  spinning: boolean
}

/** 頂面朝下看：標準骰子點位 (x, z)，骰子中心在原點、y 朝上 */
const PIP: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.2, -0.2],
    [0.2, 0.2],
  ],
  3: [
    [-0.2, -0.2],
    [0, 0],
    [0.2, 0.2],
  ],
  4: [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2],
  ],
  5: [
    [-0.2, -0.2],
    [0.2, -0.2],
    [0, 0],
    [-0.2, 0.2],
    [0.2, 0.2],
  ],
  6: [
    [-0.22, -0.24],
    [-0.22, 0],
    [-0.22, 0.24],
    [0.22, -0.24],
    [0.22, 0],
    [0.22, 0.24],
  ],
}

function clampPip(n: number) {
  return Math.min(6, Math.max(1, Math.round(n)))
}

function SingleDie({ value }: { value: number }) {
  const v = clampPip(value)
  const pts = PIP[v] ?? PIP[1]
  const half = 0.42
  const pipY = half + 0.02

  return (
    <group>
      <RoundedBox args={[0.84, 0.84, 0.84]} radius={0.08} smoothness={3} castShadow>
        <meshStandardMaterial color="#fffef8" roughness={0.45} metalness={0.06} />
      </RoundedBox>
      {/* 頂面凹線感：淺邊框 */}
      <mesh position={[0, half - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.39, 32]} />
        <meshBasicMaterial color="#d6d3d1" transparent opacity={0.35} />
      </mesh>
      {pts.map(([px, pz], i) => (
        <mesh key={i} position={[px, pipY, pz]} castShadow>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#1c1917" roughness={0.35} metalness={0.15} />
        </mesh>
      ))}
    </group>
  )
}

const BASE_Y = 3.2

export function Dice3D({ a, b, spinning }: Props) {
  const ref = useRef<THREE.Group>(null)
  const dieA = useRef<THREE.Group>(null)
  const dieB = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const spinClock = useRef(0)

  const va = useMemo(() => clampPip(a), [a])
  const vb = useMemo(() => clampPip(b), [b])

  useFrame((_, dt) => {
    if (!ref.current) return
    if (spinning) {
      spinClock.current += dt
      const wobble = Math.sin(spinClock.current * 14) * 0.11 + Math.sin(spinClock.current * 23) * 0.05
      ref.current.position.y = BASE_Y + wobble
      const pulse = 1 + Math.sin(spinClock.current * 18) * 0.06
      ref.current.scale.setScalar(pulse)
      ref.current.rotation.x += dt * 9
      ref.current.rotation.y += dt * 7.5
      ref.current.rotation.z += dt * 5
      if (dieA.current) {
        dieA.current.rotation.x += dt * 12
        dieA.current.rotation.y += dt * 10
      }
      if (dieB.current) {
        dieB.current.rotation.x += dt * 11
        dieB.current.rotation.y += dt * 9
      }
      if (lightRef.current) {
        lightRef.current.intensity = 1.4 + Math.sin(spinClock.current * 22) * 0.85
      }
    } else {
      spinClock.current = 0
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, BASE_Y, 0.12)
      ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x, 1, 0.1)
      ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, 1, 0.1)
      ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z, 1, 0.1)
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0.25, 0.08)
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, 0.45, 0.08)
      ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, 0, 0.08)
      if (dieA.current) {
        dieA.current.rotation.x = THREE.MathUtils.lerp(dieA.current.rotation.x, 0, 0.12)
        dieA.current.rotation.y = THREE.MathUtils.lerp(dieA.current.rotation.y, 0, 0.12)
        dieA.current.rotation.z = THREE.MathUtils.lerp(dieA.current.rotation.z, 0, 0.12)
      }
      if (dieB.current) {
        dieB.current.rotation.x = THREE.MathUtils.lerp(dieB.current.rotation.x, 0, 0.12)
        dieB.current.rotation.y = THREE.MathUtils.lerp(dieB.current.rotation.y, 0, 0.12)
        dieB.current.rotation.z = THREE.MathUtils.lerp(dieB.current.rotation.z, 0, 0.12)
      }
      if (lightRef.current) {
        lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 0, 0.15)
      }
    }
  })

  return (
    <group ref={ref} position={[9, BASE_Y, -9]}>
      <pointLight
        ref={lightRef}
        position={[0, 0.6, 0]}
        color="#fef08a"
        intensity={0}
        distance={9}
        decay={2}
      />
      <group ref={dieA} position={[-0.55, 0, 0]}>
        <SingleDie value={va} />
      </group>
      <group ref={dieB} position={[0.55, 0, 0]}>
        <SingleDie value={vb} />
      </group>
    </group>
  )
}
