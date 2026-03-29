'use client'

import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { TILE_SPACING } from '@/lib/monopoly/gridCoords'

type GrassTex = {
  map: THREE.Texture
  normalMap: THREE.Texture
}

const COLS = 11
const ROWS = 11
const HALF_TILE = 0.93

function boardOuterExtents() {
  const cx = (COLS - 1) / 2
  const cz = (ROWS - 1) / 2
  const ox = cx * TILE_SPACING + HALF_TILE
  const oz = cz * TILE_SPACING + HALF_TILE
  return { ox, oz }
}

function pondSize() {
  const ci0 = 1
  const ci1 = 9
  const ri0 = 1
  const ri1 = 9
  const x0 = (ci0 - (COLS - 1) / 2) * TILE_SPACING
  const x1 = (ci1 - (COLS - 1) / 2) * TILE_SPACING
  const z0 = (ri0 - (ROWS - 1) / 2) * TILE_SPACING
  const z1 = (ri1 - (ROWS - 1) / 2) * TILE_SPACING
  const w = Math.abs(x1 - x0) + TILE_SPACING - 0.35
  const d = Math.abs(z1 - z0) + TILE_SPACING - 0.35
  return { w, d }
}

type Props = {
  grass?: GrassTex | null
}

export function BoardEnvironment({ grass = null }: Props) {
  const { ox, oz } = boardOuterExtents()
  const { w: pondW, d: pondD } = pondSize()
  const grassW = ox * 2 + 5
  const grassD = oz * 2 + 5
  const frameT = 0.42
  const frameH = 0.38

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[grassW, grassD]} />
        {grass ? (
          <meshStandardMaterial
            map={grass.map}
            normalMap={grass.normalMap}
            color="#ffffff"
            roughness={0.92}
            metalness={0}
            envMapIntensity={0.35}
          />
        ) : (
          <meshStandardMaterial color="#4f9d5c" roughness={0.88} metalness={0.02} />
        )}
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[pondW, pondD]} />
        <meshPhysicalMaterial
          color="#0ea5e9"
          roughness={0.12}
          metalness={0.05}
          transmission={0.72}
          thickness={0.85}
          ior={1.33}
          attenuationColor="#0369a1"
          attenuationDistance={2}
          emissive="#38bdf8"
          emissiveIntensity={0.06}
          transparent
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, 0]}>
        <ringGeometry args={[pondW * 0.38, pondW * 0.42, 48]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.4} transparent opacity={0.45} />
      </mesh>

      <RoundedBox
        args={[ox * 2 + frameT * 2, frameH, frameT]}
        radius={0.06}
        position={[0, frameH / 2 - 0.08, oz + frameT / 2 + HALF_TILE * 0.1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#5c3d2e" roughness={0.62} metalness={0.08} envMapIntensity={0.4} />
      </RoundedBox>
      <RoundedBox
        args={[ox * 2 + frameT * 2, frameH, frameT]}
        radius={0.06}
        position={[0, frameH / 2 - 0.08, -oz - frameT / 2 - HALF_TILE * 0.1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#4a3020" roughness={0.64} metalness={0.06} envMapIntensity={0.4} />
      </RoundedBox>
      <RoundedBox
        args={[frameT, frameH, oz * 2 + frameT * 2]}
        radius={0.06}
        position={[ox + frameT / 2 + HALF_TILE * 0.1, frameH / 2 - 0.08, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#5c3d2e" roughness={0.62} metalness={0.08} envMapIntensity={0.4} />
      </RoundedBox>
      <RoundedBox
        args={[frameT, frameH, oz * 2 + frameT * 2]}
        radius={0.06}
        position={[-ox - frameT / 2 - HALF_TILE * 0.1, frameH / 2 - 0.08, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#4a3020" roughness={0.64} metalness={0.06} envMapIntensity={0.4} />
      </RoundedBox>
    </group>
  )
}
