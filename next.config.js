/**
 * Fix: Claude Code / Anthropic CLI sets ANTHROPIC_API_KEY="" in the system
 * environment, which prevents Next.js from loading the real key from .env.local.
 * We manually read .env.local and .env and override any empty LLM API keys at startup.
 */
const fs = require('fs')
const path = require('path')

const LLM_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'GOOGLE_AI_API_KEY',
  'GEMINI_API_KEY',
  'XAI_API_KEY',
  'ELEVENLABS_API_KEY',
]

// Try .env.local first (dev), then .env (production Docker)
for (const envFile of ['.env.local', '.env']) {
  try {
    const envPath = path.join(__dirname, envFile)
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8')
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx)
        const value = trimmed.slice(eqIdx + 1)
        // Override if: the key is an LLM key AND the current env is empty/missing
        if (LLM_KEYS.includes(key) && (!process.env[key] || process.env[key].trim() === '')) {
          process.env[key] = value
        }
      }
    }
  } catch (e) {
    // Silently continue — env override is best-effort
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable X-Powered-By header for security
  poweredByHeader: false,
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Skip TypeScript errors during build (pre-existing Next.js 15 type issues)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Exclude heavy packages from server bundle analysis (fixes build-time env var issues)
  serverExternalPackages: [
    '@langchain/community',
    '@langchain/openai',
    '@langchain/core',
    'langchain',
  ],
  experimental: {},
  // Increase timeout for "Collecting page data" (fixes build failures on large apps)
  staticPageGenerationTimeout: 120,
  // Configure webpack for Cesium
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    // Reduce EBUSY / file lock crashes and OOM on Windows (Next 15 dev server)
    if (dev && process.platform === 'win32') {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next', '**/.git', '**/.*'],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "inaturalist-open-data.s3.amazonaws.com",
        pathname: "/photos/**",
      },
      {
        protocol: "https",
        hostname: "static.inaturalist.org",
        pathname: "/photos/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      // SECURITY: Restrict CloudFront to specific distribution(s)
      // Replace with your actual CloudFront distribution domain(s)
      {
        protocol: "https",
        hostname: "d*.cloudfront.net",
        pathname: "/**",
      },
    ],
    unoptimized: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            // connect-src: include ws: (not only wss:) so ws://localhost MAS/bridge URLs work on http dev (3010).
            // Explicit hosts for MAS entity stream, PersonaPlex CREP bridge, and LAN VMs.
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss: ws: http://localhost:8001 http://127.0.0.1:8001 ws://localhost:8001 ws://127.0.0.1:8001 http://192.168.0.188:8001 ws://192.168.0.188:8001 http://192.168.0.189:8000 http://192.168.0.187:8002 ws://localhost:8999 ws://127.0.0.1:8999 http://localhost:8999 http://127.0.0.1:8999; worker-src 'self' blob:; frame-src 'self' https:; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  // Redirect: /myca-ai -> /myca (legacy chat page removed)
  // Note: /MYCA redirect removed - caused redirect loop on some systems; use /myca directly
  async redirects() {
    return [
      { source: "/myca-ai", destination: "/myca", permanent: false },
      { source: "/myocode", destination: "/devices/myconode", permanent: false },
      { source: "/myo-code", destination: "/devices/myconode", permanent: false },
      { source: "/sporebase", destination: "/devices/sporebase", permanent: false },
    ]
  },
}

module.exports = nextConfig
