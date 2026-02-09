# Search Fix and Verification – February 6, 2026

## Summary

Fixes and verification steps for the Revolutionary Search (fluid UI) at localhost:3010 and sandbox.mycosoft.com, per the plan in the MAS repo.

## What Was Fixed

### 1. Unified Search API (`app/api/search/unified/route.ts`)

- **MINDEX URL/port:** Default changed from `http://192.168.0.189:8001` to `http://192.168.0.189:8000` (per VM layout docs). Use `MINDEX_API_URL` or `NEXT_PUBLIC_MINDEX_URL` in env to override.
- **Optional path prefix:** `MINDEX_API_PREFIX` (e.g. `/api`) is supported if the MINDEX API is mounted under a path.
- **Fallback when MINDEX is down:** If all MINDEX calls fail or return empty, the API uses website-only data:
  - **Species:** from `SPECIES_MAPPING` (lib/services/species-mapping)
  - **Compounds:** from `searchCompounds()` (lib/data/compounds)
  - Response includes `source: "fallback"` and `message: "Search backend temporarily unavailable. Showing results from local data."`
- **Errors:** On exception, the API returns 200 with empty results and `message` / `error` so the UI can show a clear message instead of a 503.

### 2. GeneticsResult Type and GeneticsWidget

- **SDK** (`lib/search/unified-search-sdk.ts`): `GeneticsResult` updated to match the API: `id`, `accession`, `speciesName`, `geneRegion`, `sequenceLength`, `gcContent`, `source`.
- **GeneticsWidget** (`components/search/fluid/widgets/GeneticsWidget.tsx`): Renders the API shape (accession, species name, gene region, length, GC%, GenBank link).

### 3. Navigation

- **Search page** (`app/search/page.tsx`) and **test page** (`app/test-fluid-search/page.tsx`): `onNavigate` now uses `useRouter()` and `router.push(url)` for same-origin paths; external URLs use `window.location.href`. Voice commands like “Go to home page” navigate correctly.

### 4. Empty/Error State in FluidSearchCanvas

- When the user has entered a query (≥2 chars), loading has finished, and `totalCount === 0`, the canvas shows a clear message:
  - Uses `message` or `error` from the API when present.
  - Otherwise: “No results found. Try a different search term.”
  - Subtext explains that when the main backend is unavailable, local results may still appear.

### 5. Response Types

- `UnifiedSearchResponse.source` can be `"live" | "cache" | "fallback"`.
- `message` is exposed from `useUnifiedSearch` for the UI.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MINDEX_API_URL` | MINDEX API base URL (default: `http://192.168.0.189:8000`) |
| `NEXT_PUBLIC_MINDEX_URL` | Same, for client if needed |
| `MINDEX_API_KEY` | API key sent as `X-API-Key` (default: `local-dev-key`) |
| `MINDEX_API_PREFIX` | Optional path prefix (e.g. `/api`) |
| `MYCA_BRAIN_URL` | Optional; for AI answers in search (default: `http://192.168.0.188:8000`) |

## How to Test

### Local (localhost:3010)

1. In the website repo:
   ```powershell
   cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
   npm run dev:next-only
   ```
2. Open http://localhost:3010.
3. **Homepage:** Type a query in the hero search (e.g. “reishi”, “amanita”), submit. You should be taken to `/search?q=...`.
4. **Search page:** On `/search?q=reishi`, confirm:
   - Request to `GET /api/search/unified?q=reishi&...` returns 200.
   - Either MINDEX results or fallback species/compounds appear in the widgets.
   - If nothing is found, the empty/error state message appears.
5. **Test page:** Open http://localhost:3010/test-fluid-search, run a search, confirm widgets and empty state behave the same.
6. **Navigation:** Use voice or UI to trigger “Go to home page” (or equivalent); the app should navigate to `/`.

### Sandbox (sandbox.mycosoft.com)

1. Commit and push the website repo.
2. SSH to Sandbox VM (e.g. `ssh mycosoft@192.168.0.187`).
3. Pull, rebuild, restart (with NAS mount), then purge Cloudflare:
   ```bash
   cd /opt/mycosoft/website
   git reset --hard origin/main
   docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache .
   docker run -d --name mycosoft-website -p 3000:3000 \
     -v /opt/mycosoft/media/website/assets:/app/public/assets:ro \
     --restart unless-stopped mycosoft-always-on-mycosoft-website:latest
   ```
   (Or use your existing compose/script.) Then in Cloudflare: **Purge Everything**.
4. Repeat the same search and navigation checks on https://sandbox.mycosoft.com.
5. Ensure the website container has `MINDEX_API_URL` and `MINDEX_API_KEY` set if you use MINDEX on sandbox.

## Data Sources

- **Primary:** MINDEX API (species, compounds, sequences, research) when available.
- **Fallback:** Website-only data (SPECIES_MAPPING, compound search) when MINDEX is unavailable. No mock data; fallback uses real curated data only.

## Related Docs

- [REVOLUTIONARY_SEARCH_FEB05_2026.md](./REVOLUTIONARY_SEARCH_FEB05_2026.md)
- [SEARCH_SYSTEM_COMPLETE_FEB05_2026.md](./SEARCH_SYSTEM_COMPLETE_FEB05_2026.md)
