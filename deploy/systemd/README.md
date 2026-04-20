# Mycosoft systemd units

Systemd service + timer definitions for long-running Mycosoft cron jobs.
Units live here in-repo so they version together with the app code they
support, and install cleanly onto the target VM.

## CREP satellite tile prefetch

Weekly worker that fills the MINDEX tile cache with fresh Mapbox + ESRI
satellite imagery tiles. Keeps a local fallback so the CREP map stays
functional even if upstream tile providers go down or Mapbox quota is
exhausted.

Install on **VM 189 (MINDEX)**:

```bash
sudo cp /opt/mycosoft/website/deploy/systemd/crep-satellite-prefetch.service /etc/systemd/system/
sudo cp /opt/mycosoft/website/deploy/systemd/crep-satellite-prefetch.timer   /etc/systemd/system/
sudo mkdir -p /etc/mycosoft
sudo tee /etc/mycosoft/crep-satellite-prefetch.env > /dev/null <<'ENV'
MAPBOX_ACCESS_TOKEN=pk.eyJ...REPLACE...
MINDEX_API_URL=http://localhost:8000
MINDEX_INTERNAL_TOKEN=REPLACE
ENV
sudo chmod 600 /etc/mycosoft/crep-satellite-prefetch.env
sudo chown mycosoft:mycosoft /etc/mycosoft/crep-satellite-prefetch.env

sudo systemctl daemon-reload
sudo systemctl enable --now crep-satellite-prefetch.timer
```

### Verify

```bash
systemctl list-timers | grep crep-satellite
# Example:
# NEXT                        LEFT    LAST                     PASSED UNIT
# Sun 2026-04-26 02:00:00 UTC 5 days  Sun 2026-04-19 02:00:00 UTC ...  crep-satellite-prefetch.timer

# Manual run to test
sudo systemctl start crep-satellite-prefetch.service
sudo journalctl -fu crep-satellite-prefetch.service
```

### What it does

1. Walks 50 priority bboxes (major metros + Mycosoft operational zones)
2. Expands each bbox into tile x/y coordinates at zooms 0-14
3. Downloads each tile from the upstream basemap (Mapbox satellite-streets-v12,
   Mapbox satellite-v9, ESRI World Imagery)
4. POSTs each tile to `MINDEX:/api/mindex/tile-cache/{basemap}/.staging/{z}/{x}/{y}.jpg`
5. After all tiles land in staging, POSTs to `MINDEX:/api/mindex/tile-cache/{basemap}/swap`
   which atomically swaps `.staging` → `current` and archives the previous week to `.prev`.

Total tile count: ~200k per basemap. Disk cost: ~2 GB per basemap per
cycle (tiles keyed by JPEG quality 80 @ 256²). Three basemaps tracked
→ ~6 GB per week. Keep `current` + `.prev` → ~12 GB steady state.

### Tile serving

`/api/crep/tiles/satellite/{basemap}/{z}/{x}/{y}` (in the Next.js app)
reads from the MINDEX cache first, falls back to upstream, and async
writes-back on miss. See `app/api/crep/tiles/satellite/[basemap]/[z]/[x]/[y]/route.ts`.

### Cost / quota notes

- **Mapbox**: 50k raster tiles / month on the free tier; 200k/week × 4 weeks
  = 800k/month. Paid plans kick in beyond that. Reduce `--max-zoom=12`
  (cuts tile count 16×) if quota becomes a problem.
- **ESRI World Imagery**: free for non-commercial; no quota.
- **Bandwidth**: ~6 GB/week outbound from Mapbox + ~2 GB from ESRI. Well
  within a standard VPS egress cap.

### MINDEX tile-cache API contract

The prefetch worker expects these MINDEX endpoints (Cursor implements
server-side):

| Method | Path | Body | Meaning |
|---|---|---|---|
| `GET` | `/api/mindex/tile-cache/{basemap}/{z}/{x}/{y}.jpg` | — | Read cached tile (from `current` dir) |
| `POST` | `/api/mindex/tile-cache/{basemap}/.staging/{z}/{x}/{y}.jpg` | `image/jpeg` raw | Write to staging dir |
| `POST` | `/api/mindex/tile-cache/{basemap}/swap` | — | Atomic swap staging → current |

Auth: `X-Internal-Token: $MINDEX_INTERNAL_TOKEN` or `X-API-Key: $MINDEX_API_KEY`.
Storage backing: flat files on NAS at `/mnt/nas/crep/tile-cache/{basemap}/{current,.staging,.prev}/{z}/{x}/{y}.jpg`.
