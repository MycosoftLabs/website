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
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install with npm (legacy-peer-deps for React 19 / Next 15 peer resolution in Docker)
RUN npm install --legacy-peer-deps

# =========================
# Stage 2: Builder
# =========================
FROM node:20-alpine AS builder
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
# Supabase — pass via CI/CD build args, never hardcode
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
# Site URL for OAuth callbacks - MUST match production domain
ENV NEXT_PUBLIC_SITE_URL=https://sandbox.mycosoft.com
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder
# Stripe - Required for webhook route
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
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

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

