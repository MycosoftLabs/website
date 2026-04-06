# Video / NAS Media Reliability Runbook — Apr 06, 2026

**Status:** Operational reference  
**Scope:** mycosoft.com static video delivery from NAS via VM 187 Docker bind mount

## Symptoms

- Black video players, infinite loading, or broken heroes on homepage / device pages
- `/api/health/media` returns `503` or `degraded`

## Root causes (check in order)

1. **0-byte or missing MP4 on NAS** — e.g. `homepage/Mycosoft Background.mp4` with size 0 breaks the hero; replace the real file via NAS/UniFi (do not use destructive sync scripts).
2. **Container started without NAS volume** — must include:
   `-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`
3. **Host path empty or unmounted** — `/opt/mycosoft/media/website/assets` should list `mushroom1`, `homepage`, etc.
4. **Stale Cloudflare cache** — after fixing origin files or container, run full cache purge (`scripts/_cloudflare_purge.py` from MAS repo with `CLOUDFLARE_*` in website `.env.local`).

## Verification commands

**From operator PC (LAN):**

```powershell
cd WEBSITE\website
python scripts\verify_sandbox_nas_media.py
```

**On VM 187 (SSH):**

```bash
find /opt/mycosoft/media/website/assets -name '*.mp4' -size 0
docker ps --filter publish=3000 --format '{{.Names}}'
docker inspect <container> --format '{{json .Mounts}}'
curl -sI 'http://127.0.0.1:3000/assets/mushroom1/mushroom%201%20walking.mp4' | head -15
```

**HTTP health:**

- `GET https://mycosoft.com/api/health/media` — `healthy` when critical files meet minimum sizes; `503` in production if critical checks fail.

## Synthetic monitoring (recommended)

- Configure an external uptime check with **HEAD** on:
  - `https://mycosoft.com/assets/mushroom1/mushroom%201%20walking.mp4` → expect `200` and `Content-Length` &gt; 10000  
- Optional: alert on `GET /api/health/media` non-200.

## Deploy checklist

- `_rebuild_sandbox.py` and CI deploy jobs must pass the NAS `-v` line (grep in workflows).
- After deploy: spot-check step **7b** in rebuild log (critical MP4 `curl`).

## Related

- [CLOUDFLARE_ASSETS_VIDEO_CACHE_APR06_2026.md](./CLOUDFLARE_ASSETS_VIDEO_CACHE_APR06_2026.md)
- [VIDEO_R2_STREAM_MIGRATION_PLAN_APR06_2026.md](./VIDEO_R2_STREAM_MIGRATION_PLAN_APR06_2026.md)
