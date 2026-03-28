'use client'

import { RoundedBox } from '@react-three/drei'
import { TILE_SPACING } from '@/lib/monopoly/gridCoords'

const COLS = 6
const ROWS = 8
const HALF_TILE = 0.93

/** 棋盤外緣（格心 ± 最外格半寬） */
function boardOuterExtents() {
  const cx = (COLS - 1) / 2
  const cz = (ROWS - 1) / 2
  const ox = cx * TILE_SPACING + HALF_TILE
  const oz = cz * TILE_SPACING + HALF_TILE
  return { ox, oz }
}

/** 中央空洞（命運格區域）水面大小 */
function pondSize() {
  const ci0 = 1
  const ci1 = 4
  const ri0 = 1
  const ri1 = 6
  const x0 = (ci0 - (COLS - 1) / 2) * TILE_SPACING
  const x1 = (ci1 - (COLS - 1) / 2) * TILE_SPACING
  const z0 = (ri0 - (ROWS - 1) / 2) * TILE_SPACING
  const z1 = (ri1 - (ROWS - 1) / 2) * TILE_SPACING
  const w = Math.abs(x1 - x0) + TILE_SPACING - 0.35
  const d = Math.abs(z1 - z0) + TILE_SPACING - 0.35
  return { w, d }
}

export function BoardEnvironment() {
  const { ox, oz } = boardOuterExtents()
  const { w: pondW, d: pondD } = pondSize()
  const grassW = ox * 2 + 5
  const grassD = oz * 2 + 5
  const frameT = 0.42
  const frameH = 0.38

  return (
    <group>
      {/* 草地 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
        <planeGeometry args={[grassW, grassD]} />
        <meshStandardMaterial color="#4f9d5c" roughness={0.88} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.135, 0]} receiveShadow>
        <planeGeometry args={[grassW * 0.98, grassD * 0.98]} />
        <meshStandardMaterial color="#6abe78" roughness={0.9} metalness={0} />
      </mesh>

      {/* 中央水池 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[pondW, pondD]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.28}
          metalness={0.35}
          emissive="#0ea5e9"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, 0]}>
        <ringGeometry args={[pondW * 0.38, pondW * 0.42, 48]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.4} transparent opacity={0.45} />
      </mesh>

      {/* 木質外框（四邊） */}
      <RoundedBox
        args={[ox * 2 + frameT * 2, frameH, frameT]}
        radius={0.06}
        position={[0, frameH / 2 - 0.08, oz + frameT / 2 + HALF_TILE * 0.1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#7c4a2f" roughness={0.75} metalness={0.05} />
      </RoundedBox>
      <RoundedBox
        args={[ox * 2 + frameT * 2, frameH, frameT]}
        radius={0.06}
        position={[0, frameH / 2 - 0.08, -oz - frameT / 2 - HALF_TILE * 0.1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#6b3f28" roughness={0.75} metalness={0.05} />
      </RoundedBox>
      <RoundedBox
        args={[frameT, frameH, oz * 2 + frameT * 2]}
        radius={0.06}
        position={[ox + frameT / 2 + HALF_TILE * 0.1, frameH / 2 - 0.08, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#7c4a2f" roughness={0.75} metalness={0.05} />
      </RoundedBox>
      <RoundedBox
        args={[frameT, frameH, oz * 2 + frameT * 2]}
        radius={0.06}
        position={[-ox - frameT / 2 - HALF_TILE * 0.1, frameH / 2 - 0.08, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#6b3f28" roughness={0.75} metalness={0.05} />
      </RoundedBox>
    </group>
  )
}
