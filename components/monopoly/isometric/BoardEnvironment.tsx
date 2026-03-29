'use client'

import { RoundedBox, Sparkles, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
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

/** 3D 水幕著色器：幾何起伏 + 流體條紋（不靠貼圖捲動冒充瀑布） */
const WF_VERTEX = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec3 pos = position;
  float t = uTime;
  float ny = uv.y * 48.0;
  float nx = uv.x * 14.0;
  pos.z += sin(nx * 2.2 + t * 2.8) * 0.07;
  pos.z += sin(ny - t * 9.0) * 0.055;
  pos.x += sin(ny * 0.65 + t * 5.5) * 0.035;
  pos.y += sin(nx * 1.4 + t * 3.2) * 0.018;
  vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const WF_FRAGMENT = `
uniform float uTime;
uniform float uLayerAlpha;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
void main() {
  float t = uTime;
  vec2 uv = vUv;
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormalW);
  // 多尺度噪聲：讓水不那麼「乾淨」
  float n1 = noise(uv * vec2(6.0, 18.0) + vec2(0.0, -t * 0.9));
  float n2 = noise(uv * vec2(22.0, 65.0) + vec2(4.0, -t * 2.2));
  float n3 = noise(uv * vec2(55.0, 120.0) + vec2(9.0, -t * 4.8));

  float flow = uv.y * 62.0 - t * 8.6;
  float chop = sin(uv.x * 92.0 + sin(flow * 0.32) * 4.5 + n2 * 1.8);
  float strands = abs(sin(flow + chop * 2.2 + n3 * 2.5));
  strands = pow(clamp(strands, 0.0, 1.0), 0.33);

  // 基底水色
  vec3 deep = vec3(0.03, 0.28, 0.72);
  vec3 mid = vec3(0.10, 0.55, 0.92);
  vec3 lit = vec3(0.92, 0.98, 1.0);
  float body = clamp(strands * 0.75 + n1 * 0.25, 0.0, 1.0);
  vec3 col = mix(deep, mid, body);
  col = mix(col, lit, pow(body, 2.1) * 0.55);

  // 底部泡沫更亂（湍流）
  float foamBand = smoothstep(0.78, 1.0, uv.y);
  float foamTurb = clamp(n2 * 0.65 + n3 * 0.35, 0.0, 1.0);
  float foam = foamBand * smoothstep(0.25, 0.95, foamTurb + strands * 0.35);
  col = mix(col, vec3(1.0), foam * 0.62);

  // 與場景主光方向一致（MonopolyScene 定向光約 [14,28,12]）
  vec3 L = normalize(vec3(14.0, 28.0, 12.0));
  vec3 H = normalize(V + L);
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float spec = pow(max(dot(N, H), 0.0), 48.0) * (0.35 + 0.65 * body);
  col += vec3(0.55, 0.72, 0.9) * spec;
  col += vec3(0.08, 0.12, 0.16) * ndl;

  // 視角相關菲涅爾（寫實水感）
  float NdotV = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - NdotV, 4.2);
  col += vec3(0.75, 0.88, 1.0) * fres * 0.35;
  col = mix(col, vec3(0.65, 0.82, 0.95), fres * 0.12);

  float a = (0.18 + 0.64 * body + 0.24 * foam + 0.08 * n2) * uLayerAlpha;
  a *= smoothstep(0.03, 0.14, uv.x) * smoothstep(0.97, 0.86, uv.x);
  // 上端稍薄、下端稍厚（更像落水）
  a *= mix(0.68, 1.0, smoothstep(0.0, 1.0, uv.y));

  gl_FragColor = vec4(col, a);
}
`

function createWaterfallShaderMaterial(layerAlpha: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLayerAlpha: { value: layerAlpha },
    },
    vertexShader: WF_VERTEX,
    fragmentShader: WF_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

function WaterfallCliff({ sheetW, topY, sheetH }: { sheetW: number; topY: number; sheetH: number }) {
  const [diffMap, norMap, roughMap] = useTexture(
    [
      '/monopoly/textures/rock_face_diff_1k.jpg',
      '/monopoly/textures/rock_face_nor_gl_1k.jpg',
      '/monopoly/textures/rock_face_rough_1k.jpg',
    ],
    (textures) => {
      textures.forEach((tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping
        tex.repeat.set(2.4, 3.6)
        tex.anisotropy = 8
      })
      textures[0].colorSpace = THREE.SRGBColorSpace
    },
  )

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: diffMap,
        normalMap: norMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        roughnessMap: roughMap,
        roughness: 1,
        metalness: 0.02,
        envMapIntensity: 0.62,
        color: '#ffffff',
      }),
    [diffMap, norMap, roughMap],
  )

  const darkRockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: diffMap,
        normalMap: norMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        roughnessMap: roughMap,
        roughness: 1,
        metalness: 0.02,
        envMapIntensity: 0.45,
        color: '#6e6860',
      }),
    [diffMap, norMap, roughMap],
  )

  const ledgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: diffMap,
        normalMap: norMap,
        normalScale: new THREE.Vector2(0.75, 0.75),
        roughnessMap: roughMap,
        roughness: 1,
        metalness: 0.02,
        envMapIntensity: 0.5,
        color: '#5c564e',
      }),
    [diffMap, norMap, roughMap],
  )

  useEffect(() => {
    return () => {
      wallMat.dispose()
      darkRockMat.dispose()
      ledgeMat.dispose()
    }
  }, [wallMat, darkRockMat, ledgeMat])

  const cliffH = sheetH * 0.95 + 1.2
  const wallW = sheetW * 1.35
  const wallZ = 0.9

  return (
    <group position={[0, topY - 0.05, -0.42]}>
      {/* 主崖壁（PBR 岩石貼圖） */}
      <RoundedBox args={[wallW, cliffH, wallZ]} radius={0.18} castShadow receiveShadow position={[0, -cliffH * 0.5, 0]}>
        <primitive object={wallMat} attach="material" />
      </RoundedBox>

      {/* 中央凹槽 */}
      <RoundedBox args={[sheetW * 0.72, cliffH * 0.82, wallZ * 0.65]} radius={0.14} position={[0, -cliffH * 0.52, 0.32]} castShadow>
        <primitive object={darkRockMat} attach="material" />
      </RoundedBox>

      {/* 左右岩柱 */}
      <RoundedBox
        args={[sheetW * 0.42, cliffH * 0.9, wallZ * 0.75]}
        radius={0.14}
        castShadow
        receiveShadow
        position={[-wallW * 0.32, -cliffH * 0.52, 0.25]}
      >
        <primitive object={darkRockMat} attach="material" />
      </RoundedBox>
      <RoundedBox
        args={[sheetW * 0.42, cliffH * 0.9, wallZ * 0.75]}
        radius={0.14}
        castShadow
        receiveShadow
        position={[wallW * 0.32, -cliffH * 0.52, 0.25]}
      >
        <primitive object={darkRockMat} attach="material" />
      </RoundedBox>

      {/* 崖口岩棚 */}
      <mesh position={[0, -0.14, 0.62]} rotation={[0.12, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[sheetW * 1.08, 0.28, 0.55]} />
        <primitive object={ledgeMat} attach="material" />
      </mesh>

      {/* 山頂亮面 */}
      <mesh position={[0, 0.2, -0.1]} castShadow>
        <boxGeometry args={[wallW * 0.92, 0.18, wallZ * 0.65]} />
        <meshStandardMaterial color="#e8eef2" roughness={0.82} metalness={0} transparent opacity={0.18} envMapIntensity={0.35} />
      </mesh>
    </group>
  )
}

function WaterfallDroplets({
  count,
  width,
  height,
  centerY,
}: {
  count: number
  width: number
  height: number
  centerY: number
}) {
  const geomRef = useRef<THREE.BufferGeometry>(null)
  const speeds = useMemo(() => {
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) s[i] = 1.1 + Math.random() * 2.4
    return s
  }, [count])
  const seeds = useMemo(() => {
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) s[i] = Math.random() * 1000
    return s
  }, [count])

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    const h2 = height * 0.48
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * width * 0.82
      p[i * 3 + 1] = (Math.random() - 0.5) * height * 0.92
      p[i * 3 + 2] = (Math.random() - 0.5) * 0.14
    }
    return p
  }, [count, width, height])

  useFrame((_, dt) => {
    const g = geomRef.current
    if (!g) return
    const pos = g.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const h2 = height * 0.52
    const t = performance.now() * 0.001
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * dt * 2.8
      arr[i * 3] += Math.sin(t * 2.2 + seeds[i]) * 0.012 * dt
      if (arr[i * 3 + 1] < -h2) {
        arr[i * 3 + 1] = h2 + Math.random() * 0.4
        arr[i * 3] = (Math.random() - 0.5) * width * 0.82
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points position={[0, centerY, 0.05]}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#f0f9ff"
        size={0.07}
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

function Waterfall({ pondW, pondD }: { pondW: number; pondD: number }) {
  const matFront = useMemo(() => createWaterfallShaderMaterial(1), [])
  const matBack = useMemo(() => createWaterfallShaderMaterial(0.42), [])
  const mistRef = useRef<THREE.MeshBasicMaterial>(null)

  useEffect(() => {
    return () => {
      matFront.dispose()
      matBack.dispose()
    }
  }, [matFront, matBack])

  useFrame((_, dt) => {
    matFront.uniforms.uTime.value += dt
    matBack.uniforms.uTime.value += dt
    const mist = mistRef.current
    if (mist) mist.opacity = 0.12 + Math.sin(performance.now() * 0.002) * 0.04
  })

  const sheetW = Math.min(pondW * 0.88, 8.2)
  const sheetH = Math.min(pondD * 0.9, 6.4)
  const faceYaw = -0.42
  const centerY = sheetH * 0.44 - 0.02
  const topY = centerY + sheetH * 0.5

  return (
    <group position={[0, 0, 0]} rotation={[0, faceYaw, 0]}>
      <WaterfallCliff sheetW={sheetW} topY={topY} sheetH={sheetH} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.045, 0]}>
        <circleGeometry args={[Math.min(pondW, pondD) * 0.38, 56]} />
        <meshBasicMaterial ref={mistRef} color="#dbeafe" transparent opacity={0.14} depthWrite={false} />
      </mesh>

      {/* 額外霧層（加法混合，讓底部更濕更真） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.042, 0.06]}>
        <circleGeometry args={[Math.min(pondW, pondD) * 0.44, 56]} />
        <meshBasicMaterial
          color="#e0f2fe"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -0.02]}>
        <circleGeometry args={[Math.min(pondW, pondD) * 0.52, 56]} />
        <meshBasicMaterial
          color="#bae6fd"
          transparent
          opacity={0.055}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <Sparkles
        count={48}
        scale={[sheetW * 0.45, 0.25, sheetW * 0.35]}
        position={[0, centerY - sheetH * 0.42, 0]}
        size={2.2}
        speed={0.35}
        opacity={0.55}
        color="#bae6fd"
      />

      <mesh position={[0, centerY, 0.09]} castShadow material={matBack}>
        <planeGeometry args={[sheetW * 1.02, sheetH * 1.02, 48, 72]} />
      </mesh>

      <mesh position={[0, centerY, 0]} castShadow receiveShadow material={matFront}>
        <planeGeometry args={[sheetW, sheetH, 72, 120]} />
      </mesh>

      <WaterfallDroplets count={640} width={sheetW} height={sheetH} centerY={centerY} />

      <mesh position={[0, centerY - sheetH * 0.46, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[sheetW * 0.4, 40]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.45} transparent opacity={0.5} emissive="#7dd3fc" emissiveIntensity={0.15} depthWrite={false} />
      </mesh>

      <pointLight position={[0, centerY + sheetH * 0.15, 0.45]} intensity={0.65} color="#93c5fd" distance={16} decay={2} />
    </group>
  )
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

      <Waterfall pondW={pondW} pondD={pondD} />

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
