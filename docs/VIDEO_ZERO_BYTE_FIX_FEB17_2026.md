# Video Zero-Byte Fix - Sporebase & About Us - Feb 17, 2026

## Root Cause

**Videos return HTTP 200 but have 0 bytes of content.** The server correctly serves the files, but the files themselves are empty on the sandbox VM.

### Diagnostic Results (Feb 17, 2026)

| Video | VM Path | File Size | Result |
|-------|---------|-----------|--------|
| **Sporebase** | `/opt/mycosoft/media/website/assets/sporebase/Sporebase1publish.mp4` | **0 bytes** | Empty — will not play |
| About Us | `/opt/mycosoft/media/website/assets/about us/` | (check separately) | TBD |

The Sporebase video file exists with the correct name (`Sporebase1publish.mp4` capital S) but contains zero bytes. Browsers receive 200 + `Content-Type: video/mp4` with an empty body, so the `<video>` element never gets decodable content.

### Why 0 Bytes? (Confirmed)

**Both the NAS and VM have 0-byte files.** Verified Feb 17, 2026:

- `\\192.168.0.105\mycosoft.com\website\assets\sporebase\Sporebase1publish.mp4` → **0 bytes**
- `\\192.168.0.105\mycosoft.com\website\assets\about us\Mycosoft Commercial 1.mp4` → **0 bytes**

`_sync_nas_push_from_windows.py` was deleted — it caused the 0-byte corruption. The VM mounts the NAS directly; no sync script is needed. Add videos by uploading directly to the NAS via UniFi web UI. The original 120MB Sporebase video and About Us video must be copied to the NAS from their source.

## Fix Steps

### 1. Verify Source on Windows NAS

On a machine with access to the NAS:

```
\\192.168.0.105\mycosoft.com\website\assets\sporebase\Sporebase1publish.mp4
```

- Check file size. It should be ~120 MB. If 0 bytes, the real file must be copied there first.

### 2. Copy Real Video to NAS (if needed)

If the NAS file is 0 bytes, copy the real video from wherever it exists:

- Original doc: `Sporebase/Sporebase1publish.mp4` (120.49 MB) — check dev machine, backups, or source media folder.
- Target: `\\192.168.0.105\mycosoft.com\website\assets\sporebase\Sporebase1publish.mp4`
- Ensure exact filename: `Sporebase1publish.mp4` (capital S).

### 3. Add Videos via NAS Upload

Upload videos directly to the NAS via the UniFi web UI. The VM mounts the NAS; no sync script exists or is needed. Do not recreate any NAS sync script — it caused catastrophic data loss.

### 4. Verify About Us Videos

Run diagnostic to check About Us folder:

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
python scripts/diagnose-sandbox-video.py
```

Or manually add a check for `about us/Mycosoft Commercial 1.mp4` and `about us/10343918-hd_1920_1080_24fps.mp4` file sizes.

### 5. Purge Cloudflare

After fixing files on the VM:

1. Cloudflare Dashboard → mycosoft.com → Caching → Configuration
2. **Purge Everything**

### 6. Verify

- `https://sandbox.mycosoft.com/devices/sporebase` — hero video should play
- `https://sandbox.mycosoft.com/about` — hero video should play

## Local Development Note

Videos are **not** in `public/assets/` (they live on NAS for production). Local dev (`localhost:3010`) will **never** show these videos unless you:

1. Add symlinks or copies of the videos into `website/public/assets/`, or
2. Use a proxy that serves `/assets/` from the NAS.

For local testing of video playback, use sandbox after the fix.

## Related Docs

- `docs/SPOREBASE_VIDEO_SANDBOX_FIX_FEB17_2026.md` — case sensitivity
- `docs/WEBSITE_UPDATES_AND_NAS_VIDEO_LINKING_FEB21_2026.md` — NAS paths
- `scripts/diagnose-sandbox-video.py` — diagnostic
- `scripts/_sync_nas_push_from_windows.py` — **DELETED**; do not recreate; causes data loss
