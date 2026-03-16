# Deployment Fixes & Status Report — March 15, 2026

## Overview

This document captures all deployment issues identified on March 15, 2026 across
the MycosoftLabs platform, along with fixes applied and remaining action items.

---

## 1. Website Search Page — Skeleton Loaders (FIXED)

**Problem**: Search page at mycosoft.com/search showed only skeleton loading
placeholders with no actual content rendered.

**Root Cause**: The unified search API route (`/api/search/unified`) was using
sequential MAS-first strategy with a 10s timeout. When MAS at `192.168.0.188:8001`
(private LAN) is unreachable from production, the entire search pipeline stalls:
- 10s waiting for MAS timeout
- Then 6s waiting for MINDEX timeout
- Total: 16s+ before any external API results arrive

**Fix Applied**:
- Reduced MAS proxy timeout from 10s → 3s (`app/api/search/unified/route.ts`)
- Reduced MINDEX unified-search timeout from 6s → 3s
- Added 15s client-side timeout guard in `FluidSearchCanvas.tsx` — after 15s of
  loading, skeleton loaders are replaced with empty states instead of spinning forever

**Production Config Needed**:
Set environment variables on the production server to point to reachable endpoints:
```bash
# If MAS/MINDEX are only on LAN, set these to the production-accessible URLs:
MAS_API_URL=https://mas.mycosoft.com    # or disable: USE_MAS_SEARCH=false
MINDEX_API_URL=https://mindex.mycosoft.com
```

---

## 2. Hero Video Missing (FIXED)

**Problem**: Homepage hero video not rendering at mycosoft.com.

**Root Cause**: Video file at `/assets/homepage/Mycosoft%20Background.mp4` does not
exist in the `public/` directory. It was expected to be served from NAS storage.

**Fix Applied**: Added CDN fallback source in `components/home/hero-search.tsx`:
- Primary: `/assets/homepage/Mycosoft%20Background.mp4` (local/NAS)
- Fallback: `https://mycosoft.org/assets/homepage/Mycosoft%20Background.mp4`
- Added `poster` attribute for graceful degradation when no video loads

**Action Required**: Ensure the video file is either:
1. Placed in `public/assets/homepage/` on the production server, OR
2. Uploaded to `mycosoft.org/assets/homepage/` as CDN

---

## 3. MAS deploy-to-vms — 8 Consecutive Failures (ACTION REQUIRED)

**Problem**: The `deploy-to-vms.yml` workflow in `mycosoft-mas` has failed on every
single run (67 runs, 100% failure rate).

**Root Cause**: GitHub-hosted runners (`runs-on: ubuntu-latest`) **cannot reach
private LAN addresses** (192.168.0.188, 192.168.0.189, 192.168.0.187). SSH
connections time out because there is no route from GitHub's infrastructure to the
private network.

**Solutions (pick one)**:

### Option A: Self-Hosted Runner (Recommended)
Deploy a GitHub Actions self-hosted runner on the LAN:
```bash
# On a LAN machine (e.g., 192.168.0.187):
./config.sh --url https://github.com/MycosoftLabs/mycosoft-mas \
  --token <RUNNER_TOKEN>
./run.sh
```
Then change the workflow: `runs-on: self-hosted` instead of `runs-on: ubuntu-latest`

### Option B: Tailscale/WireGuard VPN Tunnel
Install Tailscale on both the GitHub runner and target VMs:
```yaml
# In the workflow, add before SSH steps:
- name: Setup Tailscale
  uses: tailscale/github-action@v2
  with:
    oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
    oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
```

### Option C: Cloudflare Tunnel
Use `cloudflared` to expose SSH on each VM through Cloudflare:
```bash
cloudflared tunnel --hostname mas-ssh.mycosoft.com --url ssh://localhost:22
```

---

## 4. MINDEX CI/CD — Azure Deployment (MONITORING)

**Status**: Recent runs (#69, #70) appear successful. The `build-and-deploy-azure`
and `platform-one-build` workflows are passing.

**However**: `mindex.mycosoft.com` returns 403 Forbidden on all paths. See item 5.

---

## 5. MINDEX/MAS Public Endpoints — 403 Forbidden (ACTION REQUIRED)

**Problem**: `mindex.mycosoft.com`, `mas.mycosoft.com`, and `api.mycosoft.com` all
return HTTP 403 on every path.

**Root Cause**: No reverse proxy (nginx/Caddy) is configured in the mindex or MAS
repos. The FastAPI apps bind to `localhost:8000`/`localhost:8001` only. There is:
- No SSL/TLS termination layer
- No public-facing proxy
- No CORS configuration for the public domains
- Docker Compose only exposes ports to LAN

**Fix Required — Add Nginx Reverse Proxy**:

```nginx
# /etc/nginx/sites-available/mindex.mycosoft.com
server {
    listen 443 ssl http2;
    server_name mindex.mycosoft.com;

    ssl_certificate /etc/letsencrypt/live/mindex.mycosoft.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mindex.mycosoft.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Also update `API_CORS_ORIGINS` in mindex `.env`:
```
API_CORS_ORIGINS=https://mycosoft.com,https://sandbox.mycosoft.com,https://mindex.mycosoft.com
```

**Alternative**: If using Azure Container Apps, configure custom domain binding and
ingress in the Azure portal or via `az containerapp ingress` commands.

---

## 6. NLM Security — Unauthenticated ETL Sync (ACTION REQUIRED)

**Problem**: `POST /api/sync` in the NLM repo has no authentication. Any external
caller can trigger ETL data synchronization, creating a DoS risk.

**Fix (to be applied in MycosoftLabs/NLM)**:

```python
# In nlm/api/main.py or the sync router:
from fastapi import Depends, HTTPException, Header

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != os.environ.get("NLM_SYNC_API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")

@router.post("/api/sync", dependencies=[Depends(verify_api_key)])
async def trigger_sync(...):
    ...
```

Also add rate limiting:
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/api/sync")
@limiter.limit("5/hour")
async def trigger_sync(...):
    ...
```

---

## 7. MAS Security PR #79 — Hardcoded Secrets (ACTION REQUIRED)

**Status**: Open, needs fixes before merge.

**Blocking Issues**:
1. Pre-commit hook contains literal credential values (`Mushroom1!`, `Diamond1!`,
   `20202020`) as regex patterns — remove these from tracked source
2. Empty `DATABASE_URL` default causes silent fallback to in-memory audit storage
3. After merge: run `git filter-repo` to purge secrets from git history
4. Rotate ALL exposed credentials (Proxmox tokens, SSH passwords, PostgreSQL strings)

---

## 8. Website Memory Pressure — 97% Usage (MONITORING)

**Problem**: Production server at 316/324MB RAM usage (97%).

**Recommendations**:
- Increase container memory limit to at least 512MB (ideally 1GB for Next.js SSR)
- Check for memory leaks in server-side data fetching (especially the large
  Promise.all in unified search)
- Add `NODE_OPTIONS=--max-old-space-size=512` to production environment
- Consider enabling ISR/static generation for pages that don't need real-time data

---

## 9. Sandbox ≠ Production (RECOMMENDATION)

**Issue**: Both `mycosoft.com` and `sandbox.mycosoft.com` serve the same deployment
and report `environment: production` in the health endpoint.

**Recommendation**: Deploy a separate container/instance for sandbox with
`NODE_ENV=staging` or `ENVIRONMENT=sandbox` to prevent accidental production changes
during development.

---

## Summary of Changes Made Today

| File | Change |
|------|--------|
| `app/api/search/unified/route.ts` | Reduced MAS timeout 10s→3s, MINDEX timeout 6s→3s |
| `components/search/fluid/FluidSearchCanvas.tsx` | Added 15s timeout guard for skeleton loaders |
| `components/home/hero-search.tsx` | Added CDN fallback video source + poster |
| `docs/DEPLOYMENT_FIXES_MAR15_2026.md` | This document |
