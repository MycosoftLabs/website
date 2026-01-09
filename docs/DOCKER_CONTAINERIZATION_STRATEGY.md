# Docker Containerization Strategy for Mycosoft System

## Current State Analysis

### Existing Setup
Currently, you have a **monolithic deployment** with services in a single `docker-compose.yml`:
- Website (Next.js) - Running on port 3000/3002
- MINDEX API (Python/FastAPI) - Port 8000
- MAS Orchestrator (Python) - Port 8001
- N8N Workflows - Port 8888
- PostgreSQL - Port 5432
- Redis (if used) - Port 6379

### Problems with Current Setup
1. **Port Conflicts**: Services compete for ports
2. **Resource Contention**: All share same resources
3. **Scaling Issues**: Can't scale individual services
4. **Development Complexity**: Hard to work on one service without affecting others
5. **Deployment Risks**: One service failure can affect entire stack

---

## Recommended Architecture: Microservices with Docker Compose

### Container Structure

```
mycosoft-system/
├── docker-compose.yml (Main orchestration)
├── website/
│   ├── Dockerfile
│   └── .env.production
├── mindex/
│   ├── Dockerfile
│   └── requirements.txt
├── mas/
│   ├── Dockerfile
│   └── requirements.txt
└── natureos/
    ├── Dockerfile
    └── package.json
```

---

## Docker Compose Configuration

### Main `docker-compose.yml`

```yaml
version: '3.8'

services:
  # ============================================
  # WEBSITE - Next.js Frontend
  # ============================================
  website:
    build:
      context: ./website
      dockerfile: Dockerfile
    container_name: mycosoft-website
    ports:
      - "3000:3000"  # Main website
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - MINDEX_API_BASE_URL=http://mindex:8000/api/mindex
      - MAS_API_BASE_URL=http://mas:8001
    depends_on:
      - mindex
      - mas
      - postgres
    networks:
      - mycosoft-network
    restart: unless-stopped
    volumes:
      - ./website/public:/app/public  # Static assets
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # NATUREOS - Dashboard & Tools
  # ============================================
  natureos:
    build:
      context: ./website  # Same Next.js app, different entry
      dockerfile: Dockerfile
    container_name: mycosoft-natureos
    ports:
      - "3002:3000"  # NatureOS on different port
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_BASE_PATH=/natureos
      - MINDEX_API_BASE_URL=http://mindex:8000
    depends_on:
      - mindex
      - mas
    networks:
      - mycosoft-network
    restart: unless-stopped

  # ============================================
  # MINDEX - Data Integrity Index
  # ============================================
  mindex:
    build:
      context: ./mindex
      dockerfile: Dockerfile
    container_name: mycosoft-mindex
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${MINDEX_DB_NAME}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - mycosoft-network
    restart: unless-stopped
    volumes:
      - mindex-data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # MAS - Mycosoft Automation System
  # ============================================
  mas:
    build:
      context: ./mas
      dockerfile: Dockerfile
    container_name: mycosoft-mas
    ports:
      - "8001:8001"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=${MAS_DB_NAME}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - MINDEX_API_URL=http://mindex:8000
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - mycosoft-network
    restart: unless-stopped
    volumes:
      - mas-logs:/app/logs
      - /dev:/dev  # For serial device access
    privileged: true  # For MycoBrain serial access

  # ============================================
  # N8N - Workflow Automation
  # ============================================
  n8n:
    image: n8nio/n8n:latest
    container_name: mycosoft-n8n
    ports:
      - "8888:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - POSTGRES_HOST=postgres
      - POSTGRES_DATABASE=${N8N_DB_NAME}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - mycosoft-network
    restart: unless-stopped
    volumes:
      - n8n-data:/home/node/.n8n
      - ./n8n/workflows:/workflows:ro

  # ============================================
  # POSTGRES - Main Database
  # ============================================
  postgres:
    image: postgres:15-alpine
    container_name: mycosoft-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_MULTIPLE_DATABASES=${MINDEX_DB_NAME},${MAS_DB_NAME},${N8N_DB_NAME}
    networks:
      - mycosoft-network
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init-databases.sh:/docker-entrypoint-initdb.d/init-databases.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # REDIS - Caching Layer
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: mycosoft-redis
    ports:
      - "6379:6379"
    networks:
      - mycosoft-network
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  # ============================================
  # NGINX - Reverse Proxy (Optional but Recommended)
  # ============================================
  nginx:
    image: nginx:alpine
    container_name: mycosoft-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - website
      - natureos
      - mindex
      - mas
    networks:
      - mycosoft-network
    restart: unless-stopped

networks:
  mycosoft-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/16

volumes:
  postgres-data:
  mindex-data:
  mas-logs:
  n8n-data:
  redis-data:
```

---

## Individual Dockerfiles

### Website Dockerfile
```dockerfile
# website/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### MINDEX Dockerfile
```dockerfile
# mindex/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 mindex && chown -R mindex:mindex /app
USER mindex

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### MAS Dockerfile
```dockerfile
# mas/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "-m", "uvicorn", "mycosoft_mas.api:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## NGINX Reverse Proxy Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream website {
        server website:3000;
    }

    upstream natureos {
        server natureos:3000;
    }

    upstream mindex {
        server mindex:8000;
    }

    upstream mas {
        server mas:8001;
    }

    server {
        listen 80;
        server_name mycosoft.local;

        # Main website
        location / {
            proxy_pass http://website;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # NatureOS dashboard
        location /natureos {
            proxy_pass http://natureos;
            proxy_set_header Host $host;
        }

        # MINDEX API
        location /api/mindex {
            proxy_pass http://mindex;
            proxy_set_header Host $host;
        }

        # MAS API
        location /api/mas {
            proxy_pass http://mas;
            proxy_set_header Host $host;
        }
    }
}
```

---

## Environment Variables

Create `.env` file:

```bash
# Database
POSTGRES_USER=mycosoft
POSTGRES_PASSWORD=secure_password_here
MINDEX_DB_NAME=mindex
MAS_DB_NAME=mycosoft_mas
N8N_DB_NAME=n8n

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# N8N
N8N_USER=admin
N8N_PASSWORD=secure_n8n_password

# MINDEX
MINDEX_API_KEY=your_mindex_api_key
```

---

## Startup Script

Create `start-system.sh` (Linux/Mac) or `start-system.bat` (Windows):

```bash
#!/bin/bash
# start-system.sh

echo "Starting Mycosoft System..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

# Create networks if they don't exist
docker network create mycosoft-network 2>/dev/null || true

# Start services
docker-compose up -d

# Wait for health checks
echo "Waiting for services to be healthy..."
sleep 10

# Show status
docker-compose ps

echo ""
echo "✅ Mycosoft System Started!"
echo ""
echo "Access points:"
echo "  Website:    http://localhost:3000"
echo "  NatureOS:   http://localhost:3002"
echo "  MINDEX API: http://localhost:8000"
echo "  MAS API:    http://localhost:8001"
echo "  N8N:        http://localhost:8888"
echo ""
```

---

## Benefits of This Architecture

### 1. Isolation
- Each service in its own container
- No port conflicts
- Independent restarts

### 2. Scalability
```bash
# Scale MINDEX API
docker-compose up -d --scale mindex=3

# Scale website
docker-compose up -d --scale website=2
```

### 3. Resource Management
```yaml
# Add resource limits to any service
services:
  mindex:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### 4. Easy Updates
```bash
# Update just MINDEX
docker-compose up -d --no-deps --build mindex

# Update everything
docker-compose up -d --build
```

### 5. Development vs Production
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

## Migration Plan

### Phase 1: Preparation (Day 1)
1. Backup current system
2. Document all current ports and services
3. Create new directory structure
4. Write Dockerfiles

### Phase 2: Testing (Day 2-3)
1. Build containers individually
2. Test each service
3. Test inter-service communication
4. Verify data persistence

### Phase 3: Migration (Day 4)
1. Stop old system
2. Migrate databases
3. Start new containerized system
4. Smoke test all features

### Phase 4: Monitoring (Day 5+)
1. Monitor logs
2. Check resource usage
3. Optimize as needed

---

## Monitoring & Logging

### Add Logging Stack
```yaml
  # docker-compose.logging.yml
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    networks:
      - mycosoft-network

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers
    networks:
      - mycosoft-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    networks:
      - mycosoft-network
```

---

## Backup Strategy

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/mycosoft-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup databases
docker exec mycosoft-postgres pg_dumpall -U mycosoft > "$BACKUP_DIR/postgres.sql"

# Backup volumes
docker run --rm -v mycosoft_mindex-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/mindex-data.tar.gz -C /data .
docker run --rm -v mycosoft_mas-logs:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/mas-logs.tar.gz -C /data .

echo "Backup completed: $BACKUP_DIR"
```

---

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs -f [service_name]

# Check health
docker-compose ps

# Recreate service
docker-compose up -d --force-recreate [service_name]
```

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker logs mycosoft-postgres

# Test connection
docker exec -it mycosoft-postgres psql -U mycosoft -l
```

### Port Already in Use
```bash
# Find what's using the port
netstat -ano | findstr :3000

# Kill process or change port in docker-compose.yml
```

---

## Production Deployment

### Use Docker Swarm or Kubernetes
- **Docker Swarm**: Easier, good for small-medium scale
- **Kubernetes**: More complex, enterprise-grade

### Example Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mycosoft-website
spec:
  replicas: 3
  selector:
    matchLabels:
      app: website
  template:
    metadata:
      labels:
        app: website
    spec:
      containers:
      - name: website
        image: mycosoft/website:latest
        ports:
        - containerPort: 3000
        env:
        - name: MINDEX_API_URL
          value: "http://mindex-service:8000"
```

---

## Summary

✅ **Recommended Approach**:
1. Separate containers for each major service
2. Use Docker Compose for orchestration
3. Implement NGINX for routing
4. Add monitoring with Grafana/Loki
5. Automated backups

✅ **Benefits**:
- No more port conflicts
- Easy scaling
- Independent updates
- Better resource management
- Production-ready

✅ **Timeline**:
- Setup: 1-2 days
- Testing: 1-2 days
- Migration: 1 day
- **Total**: ~5 days for full migration






























