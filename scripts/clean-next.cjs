/**
 * 刪除 Next / 打包工具快取，避免 .next 與 node_modules/.cache 不同步導致
 * Cannot find module './xxx.js'（常見於 OneDrive 同步或熱更新中斷）。
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function readNextDistDirFromEnvLocal() {
  try {
    const p = path.join(root, '.env.local')
    if (!fs.existsSync(p)) return null
    const text = fs.readFileSync(p, 'utf8')
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const m = trimmed.match(/^NEXT_DIST_DIR=(.*)$/)
      if (m) return m[1].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    /* ignore */
  }
  return null
}

const extraDist = process.env.NEXT_DIST_DIR || readNextDistDirFromEnvLocal()
const targets = ['.next', path.join('node_modules', '.cache')]
if (extraDist) {
  targets.push(path.resolve(extraDist))
}

for (const rel of targets) {
  const abs = path.isAbsolute(rel) ? rel : path.join(root, rel)
  try {
    fs.rmSync(abs, { recursive: true, force: true })
    process.stdout.write(`clean-next: removed ${path.isAbsolute(rel) ? abs : rel}\n`)
  } catch {
    // ignore
  }
}
