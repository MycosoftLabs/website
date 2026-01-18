# Sandbox Deployment Troubleshooting Guide

**Document Created:** 2026-01-17T21:50:00Z  
**Target:** sandbox.mycosoft.com  
**Status:** Active troubleshooting guide

---

## Current Issues (from Grok analysis)

### 1. MINDEX API Offline / Database Disconnected

**Symptoms:**
- NatureOS dashboard shows "API Offline"
- Database shows "Disconnected (PostGIS unknown)"
- ETL status unknown
- All species/observation counts at zero

**Root Cause Analysis:**
The MINDEX API container may be running, but cannot connect to PostgreSQL. Common causes:

1. **Wrong DATABASE_URL** - Host/port mismatch between .env and docker-compose
2. **PostGIS not enabled** - Extension not installed on database
3. **Auth credentials mismatch** - Username/password incorrect
4. **Network isolation** - Containers on different Docker networks

**Diagnostic Steps:**

```bash
# 1. Check container status
docker ps | grep mindex

# 2. View MINDEX API logs
docker logs mindex-api --tail 100

# 3. Check PostgreSQL PostGIS extension
docker exec -it mindex-postgres psql -U mindex -c "\dx"
# Should show: postgis, postgis_topology, etc.

# 4. If PostGIS not installed:
docker exec -it mindex-postgres psql -U mindex -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker exec -it mindex-postgres psql -U mindex -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

# 5. Test database connection from MINDEX container
docker exec -it mindex-api python -c "import psycopg2; psycopg2.connect('postgresql://mindex:mindex@mindex-postgres:5432/mindex')"

# 6. Check network connectivity
docker network inspect mycosoft-network
```

**Fix Actions:**

1. **Update MINDEX .env file:**
   ```env
   DATABASE_URL=postgresql://mindex:mindex@mindex-postgres:5432/mindex
   # OR for external PostgreSQL:
   DATABASE_URL=postgresql://mindex:password@192.168.x.x:5432/mindex
   ```

2. **Restart MINDEX services:**
   ```bash
   docker-compose -f docker-compose.always-on.yml restart mindex-api mindex-postgres
   ```

3. **Verify connection:**
   ```bash
   curl http://localhost:8000/api/mindex/health
   ```

---

### 2. Live-Map Stuck on "Initializing..."

**Symptoms:**
- Page loads but map container shows only dashes
- No map tiles render
- May see console errors

**Root Cause Analysis:**
Google Maps JavaScript API cannot load due to:

1. **Missing API key** - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` not set in .env.local
2. **Invalid API key** - Key revoked or restricted
3. **RefererNotAllowed** - Domain not authorized in Google Cloud Console
4. **API not enabled** - Maps JavaScript API not enabled for the key

**Diagnostic Steps:**

```bash
# 1. Check if env var is set in container
docker exec -it mycosoft-website printenv | grep GOOGLE_MAPS

# 2. Check browser console for errors:
# - RefererNotAllowed → Add domain to API restrictions
# - ApiKeyInvalid → Check key in Google Cloud Console
# - API project deleted → Create new key
```

**Fix Actions:**

1. **Verify .env.local has the key:**
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your-actual-key
   ```

2. **In Google Cloud Console:**
   - APIs & Services → Library → Enable "Maps JavaScript API"
   - APIs & Services → Credentials → Edit key → Add allowed domains:
     - `sandbox.mycosoft.com`
     - `mycosoft.com`
     - `*.mycosoft.com`
     - `localhost:3000` (for dev)

3. **Rebuild container with key:**
   ```bash
   docker-compose -f docker-compose.always-on.yml build --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key mycosoft-website
   docker-compose -f docker-compose.always-on.yml up -d mycosoft-website
   ```

4. **If using Cloudflare Tunnel, clear cache:**
   - Cloudflare Dashboard → Caching → Purge Everything

---

### 3. Cloudflare Tunnel Serving Old Build

**Symptoms:**
- Homepage shows old static landing page
- New routes return 404
- Changes not reflected

**Root Cause:**
Tunnel is pointing to an old container build that doesn't have the latest code.

**Fix Actions:**

1. **Push latest code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: Super Admin, dashboard improvements, fixes"
   git push origin main
   ```

2. **SSH to production server and rebuild:**
   ```bash
   cd /path/to/mycosoft-website
   git pull origin main
   docker-compose -f docker-compose.always-on.yml build mycosoft-website --no-cache
   docker-compose -f docker-compose.always-on.yml up -d mycosoft-website
   ```

3. **Restart Cloudflare Tunnel:**
   ```bash
   # Find tunnel container
   docker ps | grep cloudflared
   
   # Restart it
   docker restart cloudflared
   ```

4. **Clear Cloudflare Cache:**
   - Cloudflare Dashboard → Your domain → Caching → Configuration → Purge Everything

5. **Verify deployment:**
   ```bash
   curl https://sandbox.mycosoft.com/admin
   curl https://sandbox.mycosoft.com/natureos
   ```

---

## Quick Reference Commands

### Check All Service Health

```bash
# Container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# MINDEX health
curl -s http://localhost:8000/api/mindex/health | jq

# Website health
curl -s http://localhost:3000/api/health | jq

# MycoBrain health
curl -s http://localhost:8003/api/health | jq
```

### View Logs

```bash
# MINDEX logs
docker logs mindex-api --tail 100 -f

# Website logs
docker logs mycosoft-website --tail 100 -f

# All services
docker-compose -f docker-compose.always-on.yml logs -f
```

### Full Restart

```bash
# Stop all
docker-compose -f docker-compose.always-on.yml down

# Start fresh
docker-compose -f docker-compose.always-on.yml up -d

# Watch logs
docker-compose -f docker-compose.always-on.yml logs -f
```

---

## Environment Variable Checklist

Before deploying, verify these are set in production `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side admin key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ | Google Maps API key |
| `MINDEX_API_BASE_URL` | ✅ | MINDEX API endpoint |
| `MINDEX_API_KEY` | ✅ | MINDEX API authentication |
| `NEXTAUTH_URL` | ✅ | Full URL (https://sandbox.mycosoft.com) |
| `NEXTAUTH_SECRET` | ✅ | 32+ character secret |

---

## Contact

If issues persist after following this guide:
1. Check this document for updates
2. Review `docs/CHANGELOG_2026-01-17.md` for recent changes
3. Check GitHub issues for known problems

---

*Document generated: 2026-01-17T21:50:00Z*
