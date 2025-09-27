/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://13.53.158.252/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
