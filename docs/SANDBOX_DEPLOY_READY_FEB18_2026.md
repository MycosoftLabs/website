# Sandbox Deploy Ready – February 18, 2026

**Status:** Website code is prepared and pushed to GitHub. Sandbox live testing is documented; **deployment is executed by another agent**.

## What’s Ready

- **Website repo:** Latest code committed and pushed to `main` (MycosoftLabs/website).
- **Single deployment reference:** See **MAS repo** → `docs/SANDBOX_LIVE_TESTING_PREP_FEB18_2026.md` for:
  - VM layout (Sandbox 187, MAS 188, MINDEX 189, GPU node 190)
  - Step-by-step deployment checklist (pull, build, run with NAS mount, Cloudflare purge)
  - Container name, image name, paths, env vars
  - Post-deploy verification URLs

## Deploying Agent

1. Open `docs/SANDBOX_LIVE_TESTING_PREP_FEB18_2026.md` in the **MAS** repo (or `mycosoft-mas/docs/`).
2. Follow the checklist in section 3 (On Sandbox VM, Cloudflare, Verification).
3. Do not omit the NAS volume mount for the website container.

## Quick Reference

- **Sandbox VM:** 192.168.0.187, user `mycosoft`, code path `/opt/mycosoft/website`
- **Live URL:** https://sandbox.mycosoft.com/
- **Image:** `mycosoft-always-on-mycosoft-website:latest`
- **NAS mount:** `-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`
