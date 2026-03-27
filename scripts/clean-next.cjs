/**
 * 刪除 Next / 打包工具快取，避免 .next 與 node_modules/.cache 不同步導致
 * Cannot find module './xxx.js'（常見於 OneDrive 同步或熱更新中斷）。
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const targets = ['.next', path.join('node_modules', '.cache')]

for (const rel of targets) {
  const abs = path.join(root, rel)
  try {
    fs.rmSync(abs, { recursive: true, force: true })
    process.stdout.write(`clean-next: removed ${rel}\n`)
  } catch {
    // ignore
  }
}
