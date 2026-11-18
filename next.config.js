const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-DNS-Prefetch-Control', value: 'off' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org; form-action 'self'; script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org; connect-src 'self' https://api.telegram.org https://*.terainterface.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:" },
      ],
    }]
  },
}
module.exports = nextConfig
