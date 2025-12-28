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

# Dummy env vars for build phase (not used at runtime - set real values in .env)
ENV MONGODB_ENDPOINT_URL=mongodb://placeholder:27017
ENV MONGODB_API_KEY=placeholder
ENV NEON_DATABASE_URL=postgres://placeholder:placeholder@placeholder/placeholder
ENV DATABASE_URL=postgres://placeholder:placeholder@placeholder/placeholder
ENV SUPABASE_URL=https://placeholder.supabase.co
ENV SUPABASE_ANON_KEY=placeholder

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

