'use client'

import type { BoardCellDef } from '@/lib/monopoly/types'
import { cellStripColor } from './cellColors'

type Props = {
  cell: BoardCellDef
}

/** 旅遊大亨風：每格上方的小型程式化地標 */
export function TileLandmark({ cell }: Props) {
  const accent =
    cell.kind === 'property' || cell.kind === 'railroad' || cell.kind === 'tax'
      ? cellStripColor(cell)
      : '#cbd5e1'

  const goBoost = cell.kind === 'go'
  return (
    <group position={[0, 0.26, 0.36]} scale={goBoost ? 0.52 : 0.44}>
      <LandmarkMesh cell={cell} accent={accent} />
    </group>
  )
}

function LandmarkMesh({ cell, accent }: { cell: BoardCellDef; accent: string }) {
  const m = { roughness: 0.42, metalness: 0.12 }

  switch (cell.id) {
    case 'go':
      return (
        <group>
          {/* 起點高台：亮黃 + 強發光 */}
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.05, 0.1, 0.75]} />
            <meshStandardMaterial
              color="#fde047"
              roughness={0.28}
              metalness={0.18}
              emissive="#facc15"
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[0, 0.2, 0.08]} castShadow>
            <boxGeometry args={[0.95, 0.14, 0.58]} />
            <meshStandardMaterial
              color="#fef08a"
              roughness={0.3}
              metalness={0.15}
              emissive="#fde047"
              emissiveIntensity={0.28}
            />
          </mesh>
          <mesh position={[0, 0.36, -0.12]} rotation={[0.55, 0, 0]} castShadow>
            <coneGeometry args={[0.22, 0.42, 4]} />
            <meshStandardMaterial color="#16a34a" {...m} emissive="#22c55e" emissiveIntensity={0.12} />
          </mesh>
          <mesh position={[-0.32, 0.18, 0.05]} castShadow>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshStandardMaterial color="#ea580c" {...m} emissive="#fb923c" emissiveIntensity={0.1} />
          </mesh>
          {/* 終點線感：兩條小白線 */}
          {[-0.28, 0.28].map((x) => (
            <mesh key={x} position={[x, 0.17, 0.35]} castShadow>
              <boxGeometry args={[0.06, 0.04, 0.45]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} emissive="#ffffff" emissiveIntensity={0.08} />
            </mesh>
          ))}
        </group>
      )

    case 'jail':
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.55, 0.7, 0.45]} />
            <meshStandardMaterial color="#e7e5e4" {...m} />
          </mesh>
          {[-0.22, 0, 0.22].map((x) => (
            <mesh key={x} position={[x, 0.55, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
              <meshStandardMaterial color="#57534e" metalness={0.4} roughness={0.35} />
            </mesh>
          ))}
        </group>
      )

    case 'goto':
      return (
        <group rotation={[0, Math.PI / 4, 0]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.7, 0.08, 0.7]} />
            <meshStandardMaterial color="#64748b" {...m} />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.15, 0.45, 0.15]} />
            <meshStandardMaterial color="#1e293b" {...m} />
          </mesh>
        </group>
      )

    case 'park':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, 0.35, 8]} />
            <meshStandardMaterial color="#78350f" {...m} />
          </mesh>
          <mesh position={[0, 0.45, 0]} castShadow>
            <coneGeometry args={[0.45, 0.55, 8]} />
            <meshStandardMaterial color="#16a34a" {...m} emissive="#22c55e" emissiveIntensity={0.08} />
          </mesh>
        </group>
      )

    case 'ch1':
    case 'ch2':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.45, 0.55, 0.12]} />
            <meshStandardMaterial color="#eab308" {...m} emissive="#facc15" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, 0.55, 0.08]} castShadow>
            <torusGeometry args={[0.22, 0.06, 8, 16]} />
            <meshStandardMaterial color="#a855f7" {...m} />
          </mesh>
        </group>
      )

    case 'chest1':
    case 'chest2':
      return (
        <group>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.55, 0.35, 0.4]} />
            <meshStandardMaterial color="#92400e" {...m} />
          </mesh>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.5, 0.12, 0.35]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.35} roughness={0.4} />
          </mesh>
        </group>
      )

    case 'tax1':
    case 'tax2':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.12 + i * 0.14, 0]} castShadow>
              <boxGeometry args={[0.5 - i * 0.06, 0.1, 0.45 - i * 0.05]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#fecaca' : '#ffffff'} {...m} />
            </mesh>
          ))}
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.15, 0.2, 0.15]} />
            <meshStandardMaterial color="#dc2626" {...m} />
          </mesh>
        </group>
      )

    case 'r1':
    case 'r2':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[1.1, 0.28, 0.38]} />
            <meshStandardMaterial color="#e2e8f0" {...m} />
          </mesh>
          {[-0.35, 0.35].map((x) => (
            <mesh key={x} position={[x, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
              <meshStandardMaterial color="#1e293b" {...m} />
            </mesh>
          ))}
          <mesh position={[0.45, 0.32, 0]} castShadow>
            <boxGeometry args={[0.12, 0.18, 0.28]} />
            <meshStandardMaterial color="#38bdf8" {...m} />
          </mesh>
        </group>
      )

    case 'p12':
      return (
        <group scale={0.85}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.35, 0.32, 0.35]} />
            <meshStandardMaterial color="#cbd5e1" {...m} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.28, 0.4, 0.28]} />
            <meshStandardMaterial color="#86efac" {...m} emissive="#4ade80" emissiveIntensity={0.12} />
          </mesh>
          <mesh position={[0, 0.82, 0]} castShadow>
            <boxGeometry args={[0.2, 0.45, 0.2]} />
            <meshStandardMaterial color="#4ade80" {...m} emissive="#22c55e" emissiveIntensity={0.1} />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[0.14, 0.35, 0.14]} />
            <meshStandardMaterial color="#22c55e" {...m} />
          </mesh>
        </group>
      )

    case 'p9':
      return (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow>
            <coneGeometry args={[0.5, 0.45, 6]} />
            <meshStandardMaterial color="#78716c" {...m} />
          </mesh>
          {[-0.22, 0.22].map((x) => (
            <mesh key={x} position={[x, 0.55, 0.1]} castShadow>
              <coneGeometry args={[0.2, 0.5, 6]} />
              <meshStandardMaterial color="#15803d" {...m} />
            </mesh>
          ))}
        </group>
      )

    case 'p7':
      return (
        <group>
          <mesh position={[0, 0.08, 0]} castShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.45, 24]} />
            <meshStandardMaterial color="#38bdf8" {...m} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.65, 0.08, 0.15]} />
            <meshStandardMaterial color="#a16207" {...m} />
          </mesh>
        </group>
      )

    default:
      if (cell.kind === 'property') {
        return <PropertyMini accent={accent} seed={cell.name.length + cell.price} />
      }
      return (
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.35, 0.4]} />
          <meshStandardMaterial color={accent} {...m} />
        </mesh>
      )
  }
}

function PropertyMini({ accent, seed }: { accent: string; seed: number }) {
  const r = (seed % 5) / 10
  return (
    <group rotation={[0, seed * 0.4, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.45 + r, 0.3, 0.4 + r]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <coneGeometry args={[0.35 + r * 0.5, 0.25, 4]} />
        <meshStandardMaterial color={accent} roughness={0.45} metalness={0.1} />
      </mesh>
    </group>
  )
}
