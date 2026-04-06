# Video R2 / Stream migration plan — Apr 06, 2026

**Status:** Optional future architecture (not required for baseline reliability)

## Why consider it

- **NAS + single VM + tunnel** is a single read path; edge caching and correct mounts address most “won’t load” issues.
- **Cloudflare R2** (object storage) + public bucket or **Cloudflare Stream** adds:
  - Geographic edge delivery without reading SMB/NAS per request
  - **Stream:** adaptive bitrate (true “HD fast” on variable networks)
  - Decoupling site deploys from large binary copies

## Phased approach

1. **Stabilize origin** — NAS bind mount, non-zero files, `/api/health/media`, purge rules (complete in Apr 2026 baseline).
2. **Upload pipeline** — one-way sync from NAS or CI to R2 after validation (no bi-directional sync that could overwrite with empty files).
3. **URL strategy** — either:
   - **A.** `NEXT_PUBLIC_MEDIA_CDN_BASE` pointing to `https://media.mycosoft.com/...` for `encodeAssetUrl` / video components, or  
   - **B.** Next.js rewrite `/assets/media/*` → R2 public URL (transparent to components).
4. **Stream (optional)** — ingest MP4s to Stream for HLS; replace `<video src>` with Stream player where justified by analytics.

## Cost / ops

- Evaluate R2 egress vs. current tunnel load; Stream bills per minute stored + delivered.

## Exit criteria before migration

- Zero-byte file prevention on NAS; monitoring green for 30+ days; runbook followed on incidents.
