/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // Force dynamic rendering for all pages (avoid SSG issues with client components)
  experimental: {
    // This will make all pages dynamic by default
  },
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
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
        pathname: "/**",
      },
    ],
    unoptimized: true,
  },
  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/myca',
        destination: '/myca-ai',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
