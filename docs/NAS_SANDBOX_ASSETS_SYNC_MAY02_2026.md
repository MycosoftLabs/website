# NAS + Sandbox: Why new images/videos are missing on mycosoft.com (May 02, 2026)

**Status:** Runbook

## Cause

The production website container on Sandbox (192.168.0.187) bind-mounts the **host** (NAS) tree over `public/assets`:

```text
-v /opt/mycosoft/media/website/assets:/app/public/assets:ro
```

Whatever is in the **Docker image** under `/app/public/assets` is **not visible** at runtime. Only files under `/opt/mycosoft/media/website/assets` on the VM (backed by `\\192.168.0.105\mycosoft.com\website\assets\` on the LAN) are served. That is why code deploys (JS/React) can go live while **new** `public/assets/...` media from git does not, until the same files exist on that path.

## Affected areas (examples)

- **About** hero/closing: `/assets/about us/*.mp4`
- **Psathyrella:** `/assets/psathyrella/*`
- **Hyphae 1 / MycoNode:** `/assets/hyphae1/*`, `/assets/myconode/*`

## Fix (automated)

From the MAS repo, with `.credentials.local` loaded (VM password + optional Cloudflare token/zone for purge):

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas
python scripts\sync_sandbox_nas_website_assets.py
```

- Uploads the full tree from `CODE\WEBSITE\website\public\assets` to the VM.
- Optional: set `MYCOSOFT_ASSET_SUBDIRS` to only some folders (space-separated), e.g. `psathyrella` `about us` `hyphae1` `myconode`.

## Fix (manual)

Copy the same folders to the NAS share or use `scripts\media\sync-website-media.ps1` with destination `mycosoft@192.168.0.187:/opt/mycosoft/media/website/assets` (see script header).

## After upload

- Script calls `website/_cloudflare_cache.purge_everything()` if `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` are set (e.g. in `website/.env.local` or `.credentials.local` with those keys). If the API returns 401, rotate the token (Cache Purge + Zone read) or use **Purge Everything** in the Cloudflare dashboard for mycosoft.com.
- A successful asset sync in May 2026: **128 files, ~3.9 GB** from the dev PC to Sandbox staging + `sudo rsync` to `/opt/mycosoft/media/website/assets/`.

## Never

- Do **not** use deleted/destructive NAS push scripts; upload via this sync or UniFi/NAS UI when adding large media.
