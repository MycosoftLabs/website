# Deployment Fixes & Recommendations — March 16, 2026

## Issues Addressed

### 1. Website: Search Page Stuck on Skeleton Loaders

**Root cause:** The `/search` page uses `next/dynamic` with `ssr: false` to load
`FluidSearchCanvas` (84KB+ component with physics animations, particle system,
12+ dynamically imported sub-widgets). If any dependency in the import chain
fails (network timeout, JS error, missing context provider), the page stays on
the loading spinner indefinitely.

**Fix applied:**
- Added `DynamicErrorBoundary` around both `FluidSearchCanvas` and `MobileSearchChat`
  dynamic imports in `app/search/page.tsx`
- When the dynamic import fails, the page falls back to `SearchResults` component
  (the simpler, proven search results view) instead of showing infinite skeletons
- Users see an amber banner with a "Reload" button to retry the enhanced view

**File:** `app/search/page.tsx`

---

### 2. Website: Hero Video Not Displaying

**Root cause:** The hero video references `/assets/homepage/Mycosoft Background.mp4`
but `public/assets/homepage/` directory did not exist. Video also has a CDN
fallback (`mycosoft.org/assets/homepage/...`) which may also be unavailable on
fresh deployments.

**Fix applied:**
- Created `public/assets/homepage/` directory
- Added `onError` handler to the `<video>` element that hides it gracefully
- Added a secondary gradient background so the page looks intentional even
  without the video (gradient from primary/5 to purple-500/5)
- **Action needed:** Upload `Mycosoft Background.mp4` and `hero-poster.jpg` to
  `public/assets/homepage/` or ensure the CDN URL is accessible

**File:** `components/home/hero-search.tsx`

---

### 3. Website: Auth Middleware Redirect Loops

**Root cause:** The middleware matcher included `/login` in its scope, meaning the
middleware would attempt Supabase `getUser()` on the login page. If Supabase env
vars are missing/misconfigured, this could cause redirect loops or errors on the
login page itself.

**Fix applied:**
- Added `login` to the middleware matcher exclusion list
- Also excluded `api/health`, `favicon.ico`, and `assets/` from middleware
  processing to reduce unnecessary auth checks and improve performance

**File:** `middleware.ts`

---

### 4. Mindex: Azure CI/CD Failures

**Likely causes (requires GitHub access to confirm):**
1. **Missing secrets:** `SSH_KEY`, `PRODUCTION_HOST`, or Azure credentials not
   configured in the repo's GitHub Actions secrets
2. **Network accessibility:** MINDEX runs on `192.168.0.189:8000` (private LAN).
   If the CI runner can't reach this IP, deploy health checks fail
3. **Docker registry auth:** If using Azure Container Registry, the `REGISTRY_*`
   secrets need to be configured

**Recommended fixes:**
- Verify all required secrets exist: `gh secret list --repo MycosoftLabs/mindex`
- If deploying to Azure VM, ensure the GitHub Actions runner can SSH to the VM
  (check firewall rules, NSG rules)
- Add `continue-on-error: true` to non-critical steps (health check, cleanup)
- Consider using Azure-native deployment (Azure Container Apps or App Service)
  instead of SSH-based deployment for better reliability

---

### 5. Mindex/MAS: Public Endpoint 403 Errors

**Root cause analysis:**
The website's unified search API (`app/api/search/unified/route.ts`) calls MINDEX
at `http://192.168.0.189:8000` — a private LAN IP. When deployed to production
(different network), this is unreachable.

**Recommended fixes:**
1. **Set `MINDEX_API_URL` environment variable** to the public-facing MINDEX URL
   in production (e.g., `https://mindex.mycosoft.com` or the Azure VM's public IP)
2. **Configure reverse proxy** (nginx/Caddy) on the MINDEX VM:
   ```nginx
   server {
       listen 443 ssl;
       server_name mindex.mycosoft.com;

       location /api/ {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. **Add API key authentication** to MINDEX endpoints — the website already sends
   `MINDEX_API_KEY` if configured
4. **Add CORS headers** if the website calls MINDEX directly from the browser
   (currently it's server-to-server via API routes, so CORS isn't needed)

---

### 6. NLM: ETL DoS Security Risk on POST /api/sync

**Risk:** The `/api/sync` endpoint (if it exists in NLM) could be abused for
denial-of-service by sending many large sync requests that trigger expensive
ETL operations.

**Recommended mitigations (implement before production):**

1. **Rate limiting** — Add per-IP and per-user rate limits:
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)

   @app.post("/api/sync")
   @limiter.limit("5/minute")
   async def sync(request: Request):
       ...
   ```

2. **Authentication** — Require API key or JWT:
   ```python
   @app.post("/api/sync")
   async def sync(request: Request):
       api_key = request.headers.get("X-API-Key")
       if api_key != os.environ.get("NLM_SYNC_API_KEY"):
           raise HTTPException(status_code=403, detail="Invalid API key")
   ```

3. **Payload size limits** — Cap request body size:
   ```python
   @app.post("/api/sync")
   async def sync(request: Request):
       body = await request.body()
       if len(body) > 10 * 1024 * 1024:  # 10MB limit
           raise HTTPException(status_code=413, detail="Payload too large")
   ```

4. **Queue-based processing** — Don't process sync inline; queue it:
   ```python
   @app.post("/api/sync")
   async def sync(request: Request):
       job_id = queue.enqueue(process_sync, request.json())
       return {"job_id": job_id, "status": "queued"}
   ```

5. **IP allowlisting** — Only allow sync from known IPs (internal services)

---

### 7. NLM: CI/CD Workflow

**Created:** `.github/workflows/nlm-ci-cd.yml`

This is a template workflow for the NLM repo. Copy it to
`MycosoftLabs/nlm/.github/workflows/ci-cd.yml`.

Features:
- Python linting (Ruff) and type checking (mypy)
- Pytest with coverage
- Security scanning (Bandit + Safety)
- Docker image build and push to GHCR
- SSH-based deployment to production VM
- Health check after deploy

**Required secrets in NLM repo:**
- `PRODUCTION_HOST` — VM IP/hostname
- `SSH_USER` — SSH username (defaults to `mycosoft`)
- `SSH_KEY` — SSH private key

---

### 8. Website: Memory Pressure (97%)

**Contributing factors:**
- `FluidSearchCanvas` (84KB) with particle physics system and 12 sub-widgets
- `cesium` (3D globe), `deck.gl`, `pixi.js`, `three.js` all in dependencies
- Dev server runs with `--max-old-space-size=3072` (3GB limit)

**Recommendations:**
- The error boundary fallback (fix #1) already reduces memory impact by allowing
  the search page to work without loading the full physics engine
- Consider code-splitting `cesium` and `three.js` imports to only load on pages
  that need them (currently they may be bundled into shared chunks)
- For the production Docker container, set `NODE_OPTIONS=--max-old-space-size=4096`
- Monitor with: `docker stats mycosoft-website`

---

## Summary of Changes Made

| File | Change |
|------|--------|
| `app/search/page.tsx` | Added error boundary fallback for dynamic imports |
| `components/home/hero-search.tsx` | Added video error handler + gradient fallback |
| `middleware.ts` | Excluded `/login`, `/api/health`, assets from middleware |
| `public/assets/homepage/` | Created missing directory for hero video |
| `.github/workflows/nlm-ci-cd.yml` | NLM CI/CD workflow template |
| `docs/DEPLOYMENT_FIXES_MAR16_2026.md` | This document |
