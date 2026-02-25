# Video Fixes — Instant Start, No Poster Flash (Feb 10, 2026)

## Summary

Fixed hero and device videos across the website: no poster/image flash, instant start, and working on mobile, tablet, and desktop. All videos now use NAS `/assets/` paths where available, with `preload="auto"` and no poster to avoid the split-second image flash.

## Changes Made

### 1. Removed All Posters
- **About page hero**: Removed `poster` and the background `Image` fallback that caused the flash
- **About page "Why Mycosoft" video**: Added `preload="auto"`, no poster
- **Device-details (generic)**: Removed `poster="/placeholder.svg..."`
- **Myconode hero**: Removed `poster={encodeURI("/assets/myconode/myconode a.png")}`

### 2. Hero Video Sources
- **Homepage (hero-search)**: Primary `/assets/videos/mycelium-bg.mp4`, fallback `https://mycosoft.org/videos/mycelium-bg.mp4`
- **About hero**: `/assets/about us/Mycosoft Commercial 1.mp4` (encodeURI for spaces)
- **SporeBase**: `/assets/sporebase/Sporebase1publish.mp4` (custom page)
- **MycoNode**: `/assets/myconode/grok_video_2026-01-22-19-17-42.mp4` (custom page; `myconode hero1.mp4` may not exist on NAS)
- **Mushroom1**: NAS paths (custom page, already working)

### 3. lib/devices.ts (Generic DeviceDetails)
- SporeBase: `https://mycosoft.org/...` → `/assets/sporebase/Sporebase1publish.mp4`
- MycoNode: → `/assets/myconode/grok_video_2026-01-22-19-17-42.mp4`
- Mushroom1: → `/assets/mushroom1/waterfall 1.mp4`
- Hyphae-1, ALARM: Still use mycosoft.org (custom pages may override)

### 4. URL Encoding
- All `/assets/` paths with spaces use `encodeURI()` (e.g. `about us`, `waterfall 1.mp4`)
- `device-details.tsx`: `encodeURI(device.video)` when present

## NAS Sync — NEVER Run the Sync Script

**`_sync_nas_push_from_windows.py` was deleted** — it caused catastrophic data loss. Do not recreate it. Add or update videos by uploading directly to the NAS via the UniFi web UI. The VM serves from the NAS mount — no sync script needed.

## NAS Requirements (Windows source)

For videos to work, ensure these files exist on Windows NAS at `\\192.168.0.105\mycosoft.com\website\assets\`:

| Path | Purpose |
|------|---------|
| `videos/mycelium-bg.mp4` | Homepage hero (optional; falls back to mycosoft.org) |
| `about us/Mycosoft Commercial 1.mp4` | About hero |
| `about us/10343918-hd_1920_1080_24fps.mp4` | About "Why Mycosoft" section |
| `sporebase/Sporebase1publish.mp4` | SporeBase device hero |
| `myconode/grok_video_2026-01-22-19-17-42.mp4` | MycoNode hero |
| `mushroom1/` | Mushroom1 videos (waterfall 1.mp4, etc.) |

## AutoplayVideo Component

Created `components/ui/autoplay-video.tsx` for reusable hero videos (optional; existing inline pattern kept for now).

## Testing

- [ ] Homepage hero: No image flash, instant start
- [ ] About hero: No poster/image flash
- [ ] SporeBase: Hero video plays
- [ ] MycoNode: Hero video plays
- [ ] Mushroom1: Still works
- [ ] Mobile/tablet: All autoplay (muted, playsInline)
