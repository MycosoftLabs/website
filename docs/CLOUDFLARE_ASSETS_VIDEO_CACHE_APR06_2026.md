# Cloudflare cache rules for `/assets` video — Apr 06, 2026

**Status:** Guidance for dashboard configuration  
**Goal:** Edge-cache large MP4s safely, faster repeat views, reduce origin load on the tunnel

## Recommended Cache Rules (Dashboard)

**Zone:** mycosoft.com → Caching → Cache Rules → Create rule

1. **Rule name:** `Cache static video assets`
2. **When incoming requests match:** URI Path starts with `/assets/` AND (File extension is `mp4` OR `webm` OR `mov`)
3. **Then:** Eligible for cache; Edge TTL: respect origin cache headers or set **1 day–7 days** for versioned/stable filenames.

If you use **only** stable paths (same URL when file replaced), shorten TTL or **purge everything** after NAS uploads so users do not see old binary edge cases.

## Origin behavior

- Next.js static files send `Accept-Ranges: bytes` — Cloudflare passes range requests for progressive playback when cached correctly.
- After replacing media on NAS or rebuilding the container, run **Purge Everything** (see MAS `scripts/_cloudflare_purge.py`).

## Tunnel note

- Large files go through `cloudflared` on VM 187. If stalls appear only on very large originals, prefer serving **`-web.mp4`** variants for heroes (already supported in code via `asset-video-sources.ts` / `AutoplayVideo`).

## Verification

- Compare `curl -sI https://mycosoft.com/assets/...` `cf-cache-status` / `age` headers before and after a second request.
