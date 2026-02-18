# CREP Live Events – Deployment Handoff (Feb 11, 2026)

## Purpose

This document is for the **deployment agent**. All code and documentation for CREP live events are prepared and pushed to GitHub. **Deployment to sandbox (and any other VMs) is performed by the deployment agent**, not in this repo.

---

## What’s Included (Ready on GitHub)

| Item | Location |
|------|----------|
| CREP live events feature | `app/dashboard/crep/CREPDashboardClient.tsx` |
| Sandbox testing & deployment steps | `docs/CREP_LIVE_EVENTS_SANDBOX_FEB12_2026.md` |
| Changes manifest | `docs/CREP_CHANGES_MANIFEST.md` (Feb 12 live-events section) |

**Branch:** `main`  
**Commit (after push):** Latest on `main` — message includes “CREP: live events on map (90s refresh, toast, blinking new markers) + sandbox doc”.

---

## Deployment Agent Checklist

1. **Pull** latest from GitHub on Sandbox VM (192.168.0.187).
2. **Rebuild** Docker image (no cache):  
   `docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache .`
3. **Restart** website container **with NAS mount**:  
   `docker run -d --name mycosoft-website -p 3000:3000 -v /opt/mycosoft/media/website/assets:/app/public/assets:ro --restart unless-stopped mycosoft-always-on-mycosoft-website:latest`
4. **Purge** Cloudflare cache (Purge Everything).
5. **Smoke-test:** Open `https://sandbox.mycosoft.com/dashboard/crep`, enable event layers (Earthquakes, Lightning, Wildfires, etc.), wait ≥90s and confirm:
   - Toast “N new event(s) on map” appears when the API returns new events.
   - New event markers in view show an amber blinking ring.
   - Clicking a new-event marker or dismissing the toast clears the blink/toast.

---

## VMs (Outside Dev – Live)

| VM | IP | Role |
|----|-----|------|
| Sandbox | 192.168.0.187 | Website (Docker) – CREP served here |
| MAS | 192.168.0.188 | Multi-Agent System |
| MINDEX | 192.168.0.189 | Database + vector store |

CREP uses **website API routes only** (e.g. `/api/natureos/global-events`). No MAS/MINDEX code changes for this feature.

---

## Full Documentation

- **Feature, testing, env:** `docs/CREP_LIVE_EVENTS_SANDBOX_FEB12_2026.md`
- **CREP dashboard guide:** `docs/CREP_DASHBOARD_GUIDE.md`
