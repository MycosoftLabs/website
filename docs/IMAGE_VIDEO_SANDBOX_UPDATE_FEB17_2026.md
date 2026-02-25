# Image and Video Sandbox Update – Feb 17, 2026

## Summary

Deployed image and video fixes to sandbox.mycosoft.com. Device images on the About page and Devices page now use NAS assets; sync script removed to prevent data corruption.

## Changes

### Device images (lib/devices.ts)

| Device   | Before                  | After                              |
|----------|-------------------------|------------------------------------|
| SporeBase| sporebase main.jpg      | sporebase main2.jpg                |
| MycoNode | (unchanged)             | myconode a.png                     |

Paths: `/assets/sporebase/sporebase main2.jpg`, `/assets/myconode/myconode a.png`.

### NAS sync script removed

- `_sync_nas_push_from_windows.py` was deleted (caused 0-byte overwrites of NAS and local videos).
- Deploy script `_run_sandbox_deploy_steps.py` no longer runs any NAS sync step.
- Add videos by uploading directly to the NAS via UniFi web UI.

### Rules and agents

- agent-must-execute-operations: never run or recreate the NAS sync script.
- deploy-pipeline, deploy-website-sandbox: same warning.
- dev-server-3010, run-servers-externally: dev server must run externally (not in Cursor) to avoid memory use.

## NAS asset locations

Files must exist on the NAS at:

- `\\192.168.0.105\mycosoft.com\website\assets\sporebase\sporebase main2.jpg`
- `\\192.168.0.105\mycosoft.com\website\assets\myconode\myconode a.png`

The Sandbox VM mounts the NAS at `/opt/mycosoft/media/website/assets`; the website container serves `/app/public/assets` from that mount.

## Related docs

- `docs/VIDEO_ZERO_BYTE_FIX_FEB17_2026.md`
- `docs/VIDEO_FIXES_INSTANT_START_FEB10_2026.md`
