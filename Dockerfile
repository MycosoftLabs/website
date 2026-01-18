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

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (use --no-frozen-lockfile for flexibility)
RUN pnpm install --no-frozen-lockfile

# =========================
# Stage 2: Builder
# =========================
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_MINDEX_API_BASE_URL=/api/mindex
ARG NEXT_PUBLIC_NATUREOS_API_BASE_URL=/api/natureos
ARG NEXT_PUBLIC_MYCA_MAS_API_BASE_URL=/api/mas
ARG NEXT_PUBLIC_USE_MOCK_DATA=false
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA9wzTz5MiDhYBdY1vHJQtOnw9uikwauBk

ENV NEXT_PUBLIC_MINDEX_API_BASE_URL=$NEXT_PUBLIC_MINDEX_API_BASE_URL
ENV NEXT_PUBLIC_NATUREOS_API_BASE_URL=$NEXT_PUBLIC_NATUREOS_API_BASE_URL
ENV NEXT_PUBLIC_MYCA_MAS_API_BASE_URL=$NEXT_PUBLIC_MYCA_MAS_API_BASE_URL
ENV NEXT_PUBLIC_USE_MOCK_DATA=$NEXT_PUBLIC_USE_MOCK_DATA
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Dummy env vars for build phase (not used at runtime - set real values in docker-compose)
ENV MONGODB_ENDPOINT_URL=mongodb://placeholder:27017
ENV MONGODB_API_KEY=placeholder
ENV NEON_DATABASE_URL=postgres://placeholder:placeholder@placeholder/placeholder
ENV DATABASE_URL=postgres://placeholder:placeholder@placeholder/placeholder
# Supabase - REAL values needed at build time (NEXT_PUBLIC_* are baked into client code)
ENV SUPABASE_URL=https://kzwnthsxofkkdxcmqbcl.supabase.co
ENV SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6d250aHN4b2Fra2R4Y21xYmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDg5MTEsImV4cCI6MjA1Mjk4NDkxMX0.HRmyw7OVZsrmTDN95b2wbJk2w8j1RRe5zKTRpKQMXJE
ENV NEXT_PUBLIC_SUPABASE_URL=https://kzwnthsxofkkdxcmqbcl.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6d250aHN4b2Fra2R4Y21xYmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDg5MTEsImV4cCI6MjA1Mjk4NDkxMX0.HRmyw7OVZsrmTDN95b2wbJk2w8j1RRe5zKTRpKQMXJE
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder
# Stripe - Required for webhook route
ENV STRIPE_SECRET_KEY=sk_placeholder
ENV STRIPE_WEBHOOK_SECRET=whsec_placeholder
# OpenAI - Required for AI routes
ENV OPENAI_API_KEY=sk-placeholder

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

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

