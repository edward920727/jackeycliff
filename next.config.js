const fs = require('fs')
const path = require('path')

/** 從 .env.local 讀取 NEXT_DIST_DIR（讓 next.config 不必依賴 dotenv 套件） */
function loadNextDistDirFromEnvLocal() {
  try {
    const p = path.join(__dirname, '.env.local')
    if (!fs.existsSync(p)) return
    const text = fs.readFileSync(p, 'utf8')
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const m = trimmed.match(/^NEXT_DIST_DIR=(.*)$/)
      if (m) {
        process.env.NEXT_DIST_DIR = m[1].trim().replace(/^["']|["']$/g, '')
        break
      }
    }
  } catch {
    /* ignore */
  }
}

loadNextDistDirFromEnvLocal()

/** 建置輸出目錄：預設 `.next`；若在 OneDrive 內開發，可設到本機路徑避免同步損毀 chunk */
const distDir = process.env.NEXT_DIST_DIR
  ? path.resolve(process.env.NEXT_DIST_DIR)
  : '.next'

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  reactStrictMode: true,
  experimental: {
    /** 讓 Firebase 走 Node require，減少 server bundle 對 @firebase 的 vendor chunk 問題 */
    serverComponentsExternalPackages: ['firebase'],
  },
  /** 勿在此加自訂 webpack externals：易與 Next 的 chunk 編號（如 682.js）錯位，在 OneDrive 下更常發生 */
  async redirects() {
    return [
      {
        source: '/pictionary/rooms',
        destination: '/pictionary/all-rooms',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
