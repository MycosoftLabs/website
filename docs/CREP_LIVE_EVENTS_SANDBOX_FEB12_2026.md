# CREP Live Events & Sandbox Testing – Feb 12, 2026

## Purpose

This document describes the **live events** feature on the CREP map, how to test it on the sandbox (all VMs, production-like), and what to hand off to the deployment agent. **Deployment is performed by another agent**; this repo is prepared and pushed to GitHub only.

---

## What Was Built

### Live events on the CREP map

1. **Periodic refresh (every 90 seconds)**  
   - Global events (earthquakes, lightning, fire, storms, volcanoes, etc.) are refetched from `/api/natureos/global-events` every 90s.  
   - Events that **did not exist at initial page load** are treated as **new** and drive the toast and blinking indicators.

2. **“New” event tracking**  
   - `initialEventIdsRef` stores event IDs from the first load.  
   - On each refresh, any event ID not in that set is added to `newEventIds`.  
   - New IDs are then added to the “known” set so they are not marked new again on subsequent refreshes.

3. **Live events toast**  
   - When there are new events (`newEventIds.size > 0`), a toast appears at the **top-left** of the map: **“N new event(s) on map”** with a blinking dot and a dismiss (X) button.  
   - Dismissing clears the “new” set and hides the toast.  
   - Position respects the left panel: when the panel is open, the toast shifts right (`left-[326px]`).

4. **Blinking marker for new events in view**  
   - **EventMarker** accepts an optional **`isNew`** prop.  
   - When `isNew` is true, an **amber pulsing ring** is shown around the marker (distinct from the critical-event ping).  
   - Only events that are both **new** and **in the current filtered/visible set** get the blink.  
   - Clicking a marker (selecting that event) removes its ID from `newEventIds`, so the blink stops for that event.

5. **API and data**  
   - No backend changes. Uses existing **`/api/natureos/global-events`** (USGS, NASA EONET, NOAA, plus simulated lightning/fire/storm etc.).  
   - Cache TTL for that API is 60s; client refresh is 90s.

### Files changed (CREP live events)

- **`app/dashboard/crep/CREPDashboardClient.tsx`**  
  - Added `initialEventIdsRef`, `newEventIds` state.  
  - Set initial IDs after first global-events fetch.  
  - Added `useEffect` for 90s periodic refresh; detects new IDs and updates `newEventIds` and `globalEvents`.  
  - Clear “new” when user selects an event in `handleSelectEvent`.  
  - **EventMarker**: `isNew` prop and amber blinking ring when `isNew`.  
  - Live events toast (top-left, dismissible).  
  - Fixed duplicate `X` import from `lucide-react`.

---

## Environment & VMs (Sandbox / Production-like)

| VM        | IP           | Role                          | Relevant for CREP                    |
|-----------|--------------|-------------------------------|--------------------------------------|
| Sandbox   | 192.168.0.187| Website (Docker), optional svc | CREP UI + Next.js API routes         |
| MAS       | 192.168.0.188| Multi-Agent System            | If CREP calls MAS (e.g. agents)      |
| MINDEX    | 192.168.0.189| Database + vector store       | If CREP uses MINDEX (e.g. fungal)    |

- **CREP dashboard URL (production)**: `https://sandbox.mycosoft.com/dashboard/crep` (or main site if deployed there).  
- **Local dev (CREP-only, optional)**: `npm run dev:crep` → `http://localhost:3020/dashboard/crep` (see `.cursor/rules/crep-context.mdc`).  
- **Website container on Sandbox**: Must include NAS volume mount for media:  
  `-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`

---

## How to Test on Sandbox (After Deployment)

1. **Deploy**  
   - Another agent will: pull from GitHub, rebuild Docker image, restart website container on Sandbox (187), purge Cloudflare cache.

2. **Open CREP**  
   - Go to `https://sandbox.mycosoft.com/dashboard/crep` (or the URL chosen for the website).

3. **Enable event layers**  
   - In the right-hand layers panel, enable **Earthquakes**, **Lightning**, **Wildfires**, **Storms**, etc., as needed.

4. **Verify initial load**  
   - Event markers appear from the first load (USGS, EONET, simulated events).

5. **Verify live updates**  
   - Wait at least **90 seconds** (or reduce `LIVE_EVENTS_REFRESH_MS` in code for testing).  
   - When the API returns events that weren’t in the first response, you should see:  
     - **Toast**: “N new event(s) on map” at top-left (with blinking dot and X).  
     - **Blinking ring**: Amber pulsing ring on markers for **new** events that are **in view** and **enabled** by the layer filter.

6. **Verify interactions**  
   - Click a “new” event marker → its blink should stop and toast count should drop (or toast disappear if none left).  
   - Click **X** on the toast → toast disappears and all “new” state is cleared (blinks stop).

7. **Optional**  
   - Test with left panel open to confirm toast position.  
   - Test with different layer filters to ensure only enabled event types show and only visible/new ones blink.

---

## Deployment Checklist (For Deployment Agent)

- [ ] Pull latest from GitHub (e.g. `main`) on Sandbox VM (192.168.0.187).  
- [ ] Rebuild Docker image (e.g. `docker build -t mycosoft-always-on-mycosoft-website:latest --no-cache .`).  
- [ ] Restart website container **with NAS mount**:  
  `docker run -d --name mycosoft-website -p 3000:3000 -v /opt/mycosoft/media/website/assets:/app/public/assets:ro --restart unless-stopped mycosoft-always-on-mycosoft-website:latest`  
- [ ] Purge Cloudflare cache (Purge Everything).  
- [ ] Smoke-test: open `/dashboard/crep`, enable event layers, wait 90s and confirm toast + blinking for new events if API returns new IDs.

---

## References

- CREP dashboard guide: `docs/CREP_DASHBOARD_GUIDE.md`  
- CREP dev server (3020): `.cursor/rules/crep-context.mdc`  
- VM layout and dev: `docs/VM_LAYOUT_AND_DEV_REMOTE_SERVICES_FEB06_2026.md` (in MAS repo if present) or workspace rules `vm-layout-and-dev-remote-services.mdc`  
- Global events API: `app/api/natureos/global-events/route.ts` (60s cache).
