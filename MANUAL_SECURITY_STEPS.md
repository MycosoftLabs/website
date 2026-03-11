# MANUAL SECURITY STEPS — When You Get Home

**Date:** March 11, 2026
**Context:** These are steps that require manual action (credentials, infrastructure, external services) that could not be automated in the code fixes.

---

## PRIORITY 1: Do These FIRST (Before Going Live)

### 1. Set Required Environment Variables

The code changes removed all hardcoded secrets. You **must** set these in your `.env` / `.env.local` / deployment secrets before the app will work:

```bash
# REQUIRED — app will crash/refuse login without these
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
MYCOSOFT_DEFAULT_PASSWORD=<set a strong password, NOT empty>

# REQUIRED for docker-compose up
POSTGRES_PASSWORD=<generate a strong password>
REDIS_PASSWORD=<generate a strong password>
GRAFANA_USER=<not "admin">
GRAFANA_PASSWORD=<strong password>
N8N_USER=<not "admin">
N8N_PASSWORD=<strong password>
```

Generate secure values:
```bash
# Generate random secrets
openssl rand -base64 32   # For NEXTAUTH_SECRET
openssl rand -base64 24   # For passwords
```

### 2. Rotate the Google Maps API Key

The key `AIzaSyA9wzTz5MiDhYBdY1vHJQtOnw9uikwauBk` was hardcoded in Dockerfiles and is now public in git history.

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Delete or regenerate the existing key
3. Create a new restricted key:
   - HTTP referrer restriction: `mycosoft.com/*`, `*.mycosoft.com/*`
   - API restriction: Maps JavaScript API only
4. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<new-key>` in your build pipeline

### 3. Rotate the Supabase Anon Key (if concerned)

The Supabase anon key was hardcoded in Dockerfiles. While anon keys are designed to be public, the key is now in git history alongside the project URL.

1. Go to Supabase Dashboard > Settings > API
2. Regenerate the anon key if desired (note: this invalidates existing client sessions)
3. Update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build args in CI/CD

### 4. Update Docker Build Pipeline

Since credentials were removed from Dockerfiles, you now need to pass them as build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-new-maps-key \
  -t mycosoft-website .
```

Or in your CI/CD pipeline (GitHub Actions):
```yaml
- name: Build
  run: |
    docker build \
      --build-arg NEXT_PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_URL }} \
      --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }} \
      --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${{ secrets.GOOGLE_MAPS_API_KEY }} \
      -t mycosoft-website .
```

---

## PRIORITY 2: Do Within 48 Hours

### 5. Replace Shared Password System with Per-User Passwords

The current system uses one shared password for all 8 team accounts. You need to implement per-user password hashing:

1. Install bcrypt: `npm install bcryptjs @types/bcryptjs`
2. Create a migration to add a `password_hash` column to your users/profiles table
3. For each team member, generate a unique password and hash it:
   ```javascript
   const bcrypt = require('bcryptjs')
   const hash = await bcrypt.hash('their-unique-password', 12)
   ```
4. Update the `authorize()` function in `app/api/auth/[...nextauth]/route.ts` to:
   - Look up the user's hashed password from the database
   - Compare with `bcrypt.compare(password, storedHash)`
5. Remove the `DEFAULT_PASSWORD` constant entirely

### 6. Fix Supabase RLS Policies

The operational backbone tables have `USING (true) WITH CHECK (true)` — anyone can read/write everything.

1. Go to Supabase Dashboard > SQL Editor
2. Run this for EACH table that needs protection:
   ```sql
   -- Drop the permissive policy
   DROP POLICY IF EXISTS "allow_all" ON your_table_name;

   -- Create role-based policy
   CREATE POLICY "authenticated_only" ON your_table_name
     FOR ALL
     USING (auth.role() = 'authenticated')
     WITH CHECK (auth.role() = 'authenticated');

   -- For admin-only tables:
   CREATE POLICY "admin_only" ON your_table_name
     FOR ALL
     USING (auth.jwt() ->> 'email' IN ('morgan@mycosoft.org', 'garret@mycosoft.org', 'rj@mycosoft.org'))
     WITH CHECK (auth.jwt() ->> 'email' IN ('morgan@mycosoft.org', 'garret@mycosoft.org', 'rj@mycosoft.org'));
   ```
3. Tables to fix (from the migration `20260307120000_supabase_operational_backbone.sql`):
   - All 16 tables listed in DB-02 finding

### 7. Fix Security Agents Route — Remove Service Role Key Usage

In `app/api/security/agents/route.ts`, the route uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS. Now that auth is added, change the Supabase client to use the user's session instead:

```typescript
// Replace this:
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// With this:
const supabase = await createClient()  // Uses the user's session
```

### 8. Bind Redis to localhost in docker-compose.services.yml

Check `docker-compose.services.yml` and ensure Redis is not exposed on `0.0.0.0:6379`. Change:
```yaml
ports:
  - "127.0.0.1:6379:6379"
```

---

## PRIORITY 3: Do Within 1 Week

### 9. Implement CSRF Protection

No CSRF tokens exist in the app. Options:

**Option A — Verify Origin Header (simplest):**
Add to your API middleware:
```typescript
function verifyCsrf(request: Request): boolean {
  const origin = request.headers.get('origin')
  const allowedOrigins = ['https://mycosoft.com', 'https://www.mycosoft.com']
  return !origin || allowedOrigins.includes(origin)
}
```

**Option B — Double Submit Cookie:**
1. Set a random CSRF token in an httpOnly cookie
2. Include it as a hidden form field
3. Compare cookie value with form value on the server

### 10. Fix dangerouslySetInnerHTML XSS Vectors

Install DOMPurify and sanitize all `dangerouslySetInnerHTML` usage:

```bash
npm install dompurify @types/dompurify
```

Files to fix:
- `components/ui/virtual-table.tsx:161,268`
- `components/mindex/query-monitor.tsx:348,371`
- `components/templates/species-template.tsx:207-213`

Replace:
```tsx
// Before:
dangerouslySetInnerHTML={{ __html: content }}
// After:
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
```

### 11. Add Subresource Integrity (SRI) to External Scripts

For each external script loaded via `<script>` tag:
1. Generate the hash: `curl -s URL | openssl dgst -sha384 -binary | openssl base64`
2. Add `integrity="sha384-HASH"` and `crossorigin="anonymous"` attributes

Files:
- `components/search/fluid/widgets/ObservationEarthPortal.tsx:36-46`
- `components/earth-simulator/cesium-globe.tsx:123-129`
- `lib/google-maps-loader.ts:136`

### 12. Sanitize LLM Output

In these files, ensure LLM responses are treated as untrusted:
- `app/api/ai/route.ts:75,104` — set `Content-Type: text/plain`
- `app/api/search/ai/route.ts:212` — strip HTML tags from response

### 13. Fix document.write() XSS

- `app/security/forms/page.tsx:561` — replace `document.write()` with DOM manipulation
- `app/security/compliance/page.tsx:472` — same fix
- `app/security/forms/page.tsx:579` — add `sandbox="allow-same-origin"` to iframe

---

## PRIORITY 4: Do Within 2 Weeks

### 14. Consolidate Auth Systems

You have both NextAuth and Supabase Auth running simultaneously. Pick one:
- **Recommended:** Keep Supabase Auth (already integrated with RLS, Edge Functions)
- Remove NextAuth gradually by migrating all credential users to Supabase Auth
- Update all routes that check `getServerSession(authOptions)` to use Supabase

### 15. Add Non-Root Users to Dockerfiles

Add `USER` directives to these 11 Dockerfiles:
```dockerfile
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 appuser
USER appuser
```

Files: `docker/maptoposter/Dockerfile`, `services/collectors/Dockerfile.aviation`, `Dockerfile.spaceweather`, `Dockerfile.maritime`, `Dockerfile.satellite`, `services/geocoding/Dockerfile`, `services/mindex_logger/Dockerfile`, `services/security/Dockerfile`, `services/crep-gateway/Dockerfile`, `services/e2cc/api-gateway/Dockerfile`, `docker/zpdf/Dockerfile`

### 16. Pin Docker Images to Specific Versions

Replace `:latest` with specific versions:
```yaml
prometheus: prom/prometheus:v2.51.0   # instead of :latest
grafana: grafana/grafana:10.4.0       # instead of :latest
ollama: ollama/ollama:0.3.0           # instead of :latest
n8n: n8nio/n8n:1.30.0                 # instead of :latest
```

### 17. Make Tests Blocking in CI/CD

In `.github/workflows/ci-cd.yml`, remove `continue-on-error: true` from test steps (lines 78, 81, 157).

### 18. Fix SSH Host Key Verification

Search for `paramiko.AutoAddPolicy()` and `StrictHostKeyChecking=no` across all Python scripts (~60 files). Replace with known host key verification.

### 19. Centralize Internal IPs

Move all hardcoded IPs (`192.168.0.187`, `.188`, `.189`) to `lib/env.ts` and reference from there. Search with:
```bash
grep -r "192.168.0" --include="*.ts" --include="*.tsx" -l
```

---

## PRIORITY 5: Cloudflare Configuration

### 20. Enable These Cloudflare Features

1. **WAF:** Enable OWASP Core Ruleset
2. **Rate Limiting:** 100 req/min per IP on `/api/*`
3. **Bot Management:** Configure for AI agent traffic
4. **SSL/TLS:** Set to "Full (strict)"
5. **Security Headers:** Add CSP via Transform Rules
6. **Firewall Rules:** Block direct access to `/api/docker/*`, `/api/admin/*` from non-admin IPs
7. **Zero Trust:** Consider Cloudflare Access for admin routes

---

## Quick Verification Checklist

After completing the steps above, verify:

- [ ] `docker-compose up` starts without errors (all env vars set)
- [ ] Login works with the new MYCOSOFT_DEFAULT_PASSWORD
- [ ] `/api/firmware` returns 401 when not authenticated
- [ ] `/api/docker/containers` returns 401 when not authenticated
- [ ] `/api/admin/api-keys?reveal=OPENAI_API_KEY` no longer reveals keys
- [ ] `curl -k https://google.com` from inside the container works (TLS not globally disabled)
- [ ] Google Maps still loads on the frontend with the new key
- [ ] Supabase auth still works after key rotation (if done)

---

*Generated alongside the automated security fixes in commit `fix: comprehensive security remediation across 30 files`*
