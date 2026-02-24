# SporeBase Video Sandbox 404 Fix - Feb 17, 2026

## Problem

SporeBase hero video worked in local development but returned 404 on sandbox deployment (https://sandbox.mycosoft.com/devices/sporebase).

## Root Cause

**Case sensitivity mismatch** between code and NAS filename:

| Environment | File System | Code Requested | Actual File on NAS |
|-------------|-------------|----------------|--------------------|
| Local (Windows) | Case-insensitive | `sporebase1publish.mp4` | `Sporebase1publish.mp4` ✅ Match |
| Sandbox (Linux) | Case-sensitive | `sporebase1publish.mp4` | `Sporebase1publish.mp4` ❌ No match → 404 |

On Windows, `sporebase1publish.mp4` resolves to `Sporebase1publish.mp4`. On Linux (sandbox VM), the exact path is required.

## Fix Applied

Updated `components/devices/sporebase-details.tsx`:

```diff
- heroVideo: "/assets/sporebase/sporebase1publish.mp4",
+ heroVideo: "/assets/sporebase/Sporebase1publish.mp4",
```

## Verification

- NAS path: `\\192.168.0.105\mycosoft.com\website\assets\sporebase\`
- Actual filename: `Sporebase1publish.mp4` (capital S)
- Container mount confirmed: `-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`

## Recommendation

For future device media:
1. Use **lowercase filenames** on NAS (e.g. `sporebase1publish.mp4`) to avoid case-sensitivity issues.
2. Or document the exact NAS filename and use it in code.

## Related Docs

- `docs/WEBSITE_UPDATES_AND_NAS_VIDEO_LINKING_FEB21_2026.md`
- `docs/HERO_VIDEOS_MOBILE_AUTOPLAY_FEB22_2026.md`
- `scripts/diagnose-sandbox-video.py` - Diagnostic script for future troubleshooting
