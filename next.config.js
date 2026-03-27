/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** 開發模式關閉 webpack 持久化快取，降低 OneDrive 等環境下 chunk 遺失機率（僅影響 dev:webpack） */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  },
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
