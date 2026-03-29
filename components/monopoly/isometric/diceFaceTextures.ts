import * as THREE from 'three'

/**
 * 單面俯視點位（標準骰子相對面合計 7；此為畫在貼圖上的 2D 座標，中心為 0,0）
 */
const PIP: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.24, -0.24],
    [0.24, 0.24],
  ],
  3: [
    [-0.24, -0.24],
    [0, 0],
    [0.24, 0.24],
  ],
  4: [
    [-0.24, -0.24],
    [0.24, -0.24],
    [-0.24, 0.24],
    [0.24, 0.24],
  ],
  5: [
    [-0.24, -0.24],
    [0.24, -0.24],
    [0, 0],
    [-0.24, 0.24],
    [0.24, 0.24],
  ],
  6: [
    [-0.26, -0.22],
    [-0.26, 0],
    [-0.26, 0.22],
    [0.26, -0.22],
    [0.26, 0],
    [0.26, 0.22],
  ],
}

const SIZE = 512
const CX = SIZE / 2
const PIP_SCALE = 118

function drawPip(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x + 2.5, y + 3.5, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(60, 20, 30, 0.14)'
  ctx.fill()

  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r)
  g.addColorStop(0, '#fecdd3')
  g.addColorStop(0.35, '#e11d48')
  g.addColorStop(0.75, '#be123c')
  g.addColorStop(1, '#881337')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x - r * 0.38, y - r * 0.38, r * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fill()
}

function drawFace(ctx: CanvasRenderingContext2D, pipCount: number) {
  const bg = ctx.createRadialGradient(CX - 70, CX - 90, 30, CX, CX, 320)
  bg.addColorStop(0, '#fffefb')
  bg.addColorStop(0.4, '#faf6ef')
  bg.addColorStop(0.85, '#f0e8df')
  bg.addColorStop(1, '#e4dcd4')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.strokeStyle = '#d4ccc2'
  ctx.lineWidth = 10
  ctx.strokeRect(18, 18, SIZE - 36, SIZE - 36)

  ctx.strokeStyle = 'rgba(185, 28, 28, 0.22)'
  ctx.lineWidth = 3
  ctx.strokeRect(32, 32, SIZE - 64, SIZE - 64)

  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2
  ctx.strokeRect(40, 40, SIZE - 80, SIZE - 80)

  const pts = PIP[pipCount] ?? PIP[1]
  const pr = pipCount === 1 ? 26 : pipCount === 6 ? 21 : 23
  for (const [nx, nz] of pts) {
    const px = CX + nx * PIP_SCALE
    const py = CX + nz * PIP_SCALE
    drawPip(ctx, px, py, pr)
  }
}

/**
 * 產生 1～6 點六張貼圖（米白底、紅點、帶邊框與高光）。
 * 僅在瀏覽器環境呼叫。
 */
export function buildDiceFaceTextures(): THREE.CanvasTexture[] {
  const out: THREE.CanvasTexture[] = []
  for (let v = 1; v <= 6; v++) {
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')!
    drawFace(ctx, v)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    out.push(tex)
  }
  return out
}

/**
 * BoxGeometry 六面材質順序：+X,-X,+Y,-Y,+Z,-Z
 * 標準骰子：1 對 6、2 對 5、3 對 4 → 頂 +Y 為 1、底 -Y 為 6、前 +Z 為 2、後 -Z 為 5、右 +X 為 3、左 -X 為 4
 * textures[k] = (k+1) 點之貼圖
 */
export function buildStandardDieMaterials(textures: THREE.CanvasTexture[]): THREE.MeshStandardMaterial[] {
  const t = textures
  const order = [
    t[2], // +X  3 點
    t[3], // -X  4 點
    t[0], // +Y  1 點（朝上為預設頂）
    t[5], // -Y  6 點
    t[1], // +Z  2 點
    t[4], // -Z  5 點
  ]
  return order.map(
    (map) =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.48,
        metalness: 0.03,
      })
  )
}

export function disposeDieMaterials(materials: THREE.MeshStandardMaterial[]) {
  for (const m of materials) {
    m.map?.dispose()
    m.dispose()
  }
}
