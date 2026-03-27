/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
