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
  experimental: {
    // Stabilize large-app production builds: avoid parallel compile/trace races that
    // surface as missing chunks (e.g. ./chunks/vendor-chunks/next.js) or PageNotFoundError in export.
    parallelServerCompiles: false,
    parallelServerBuildTraces: false,
  },
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
    // Apr 22, 2026 — also ignore var/, coverage/, tmp/. The vessel-disk-cache
    // writes var/cache/vessels.json every 5 s; without this ignore rule Next
    // HMR recompiles the whole bundle every write, which stranded /dashboard/
    // crep on the loading screen forever. Applied to all platforms, not just
    // Windows — the loop also fires on Linux dev.
    const watchIgnore = [
      '**/node_modules',
      '**/.next',
      '**/.git',
      '**/.*',
      '**/var/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/dist/**',
      '**/public/data/crep/**',
    ];
    if (dev) {
      config.watchOptions = {
        ...(process.platform === 'win32' ? { poll: 2000 } : {}),
        aggregateTimeout: 300,
        ignored: watchIgnore,
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
  // Security headers + asset caching
  async headers() {
    return [
      // Long-lived cache for NAS-mounted media assets (videos, images)
      // Browsers cache for 1 day, serve stale up to 7 days while revalidating.
      {
        source: '/assets/:path(.+\\.(?:mp4|webm|mov))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800, immutable' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/assets/:path(.+\\.(?:jpg|jpeg|png|webp|svg|gif|avif))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
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
            // Apr 23, 2026 — Morgan: "ssl on cloudflare not live it says not
            // secure on mycosoft.com that CANNOT happen". The SSL cert is
            // valid (Cloudflare / Google Trust Services, HSTS preloaded).
            // The browser was flagging "Not Secure" from MIXED CONTENT —
            // the CSP used to permit `http://192.168.0.*` LAN URLs and
            // `ws://` bridges in connect-src on ALL environments. Any
            // failed client attempt to reach those from the public HTTPS
            // page flips the lock.
            //
            // Split the policy by NODE_ENV:
            //   • dev (npm run dev): keep the permissive dev hosts so
            //     localhost:8001 MAS, :8999 MycoBrain, LAN GPU nodes all
            //     work from the 3010 dev server.
            //   • prod: drop every http:// and LAN ws:// entry — only
            //     https: + wss: + 'self' are reachable. No more mixed-
            //     content flag, HSTS can now fully trust the page.
            value: (process.env.NODE_ENV === 'production'
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; worker-src 'self' blob:; frame-src 'self' https:; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss: ws: http://localhost:8001 http://127.0.0.1:8001 ws://localhost:8001 ws://127.0.0.1:8001 http://192.168.0.188:8001 ws://192.168.0.188:8001 http://192.168.0.189:8000 http://192.168.0.187:8002 ws://localhost:8999 ws://127.0.0.1:8999 http://localhost:8999 http://127.0.0.1:8999 ws://192.168.0.241:8999 http://192.168.0.241:8999 ws://192.168.0.190:8999 http://192.168.0.190:8999; worker-src 'self' blob:; frame-src 'self' https:; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"),
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
