# ==================================================================================
# Mycosoft Website - Multi-stage Dockerfile
# ==================================================================================
# Builds and runs the Next.js website
#
# Usage:
#   docker build -t mycosoft-website .
#   docker run -p 3000:3000 mycosoft-website
#
# ==================================================================================

# =========================
# Stage 1: Dependencies
# =========================
FROM node:22-alpine AS deps
WORKDIR /app

# Smaller heap for `npm ci` on RAM-limited build hosts (sandbox VM). A 4GB V8 limit
# on a 2–4GB VM causes the kernel OOM killer; 2048MB is enough for resolution/install.
ENV NODE_OPTIONS="--max-old-space-size=2048"
# Fewer concurrent fetches = lower peak memory on small builders
ENV npm_config_maxsockets=5

# Copy package files — patches/ MUST exist before postinstall runs `patch-package`
COPY package.json package-lock.json ./
COPY patches ./patches

# Reproducible install (legacy-peer-deps for React 19 / Next 15 peer resolution in Docker)
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# =========================
# Stage 2: Builder
# =========================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage (npm or pnpm)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Apply patch-package patches after source copy
RUN npx patch-package

# Fix @tailwindcss/oxide musl native binding on Alpine (pnpm v10 doesn't auto-install optional platform deps)
RUN npm install --no-save --ignore-scripts "@tailwindcss/oxide-linux-x64-musl" 2>&1 | tail -3 || true

# Set build-time environment variables
ARG NEXT_PUBLIC_MINDEX_API_BASE_URL=/api/mindex
ARG NEXT_PUBLIC_NATUREOS_API_BASE_URL=/api/natureos
ARG NEXT_PUBLIC_MYCA_MAS_API_BASE_URL=/api/mas
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_PUBLIC_MINDEX_API_BASE_URL=$NEXT_PUBLIC_MINDEX_API_BASE_URL
ENV NEXT_PUBLIC_NATUREOS_API_BASE_URL=$NEXT_PUBLIC_NATUREOS_API_BASE_URL
ENV NEXT_PUBLIC_MYCA_MAS_API_BASE_URL=$NEXT_PUBLIC_MYCA_MAS_API_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Dummy env vars for build phase (not used at runtime - set real values in docker-compose)
ENV MONGODB_ENDPOINT_URL=mongodb://placeholder:27017
ENV MONGODB_API_KEY=placeholder
ENV NEON_DATABASE_URL=postgres://placeholder:placeholder@placeholder/placeholder
ENV DATABASE_URL=postgres://placeholder:placeholder@placeholder/placeholder
# Supabase — NEXT_PUBLIC_ vars MUST be present at build time for Next.js to inline them.
# The anon key is a public key (safe to embed in client bundles — it only grants Row-Level Security access).
# Override via --build-arg if you use a different Supabase project.
ARG NEXT_PUBLIC_SUPABASE_URL=https://hnevnsxnhfibhbsipqvz.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZXZuc3huaGZpYmhic2lwcXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzQ1NzEsImV4cCI6MjA4NDI1MDU3MX0.ooL4ZtASkUR4aQqpN4KfUPNcEwpbPLoGfGUkEoc4g7w
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
# Site URL for OAuth callbacks - MUST match deployed domain
ARG NEXT_PUBLIC_SITE_URL=https://mycosoft.com
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder
# Stripe — publishable key must be inlined at build time; secret key is set at runtime via docker-compose
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV STRIPE_SECRET_KEY=sk_placeholder
ENV STRIPE_WEBHOOK_SECRET=whsec_placeholder
# OpenAI - Required for AI routes
ENV OPENAI_API_KEY=sk-placeholder

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
# Disable V8's use of AVX/advanced CPU instructions for older CPUs (Westmere/X5670 compatibility)
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Use swc with wasm fallback for broader CPU compatibility
ENV NEXT_PRIVATE_DISABLE_WORKER_THREADS=1
RUN npm run build

# =========================
# Stage 3: Runner
# =========================
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install security tools for the integrated SOC dashboard
RUN apk add --no-cache nmap nmap-scripts bind-tools curl jq iproute2

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start the server
CMD ["node", "server.js"]

