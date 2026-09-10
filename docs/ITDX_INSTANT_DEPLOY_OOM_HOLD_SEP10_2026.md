# ITDX Instant Deploy OOM Hold — September 10, 2026

**Date:** September 10, 2026  
**Status:** Hold — no 187 cutover  
**Worktree:** `WEBSITE/website-itdx-codex-v13`  
**RJ Ricasata = CFO.** Briefing stays SYNTHETIC EXERCISE `live: false`. Mycosoft is pursuing CMMC L2 — this document does not claim CMMC compliance.

## Why the cut was held

Earth Sim **OOM on tilt** with animated Live Data (wind, weather radar). Flight buttons die. Shipping that globe is worse than a short hold.

Morgan: if Instant Deploy Phase B / container cutover has not started, **HOLD 187** until the sibling viewport-cull + memory governor lands in the same SHA.

## What was cancelled

| Run | Phase when cancelled | 187 cut |
|---|---|---|
| Instant Deploy `34529506828` | Phase A GHCR **Build and push** only. No `VM pull + blue/green cutover` job. | **None.** Origin `192.168.0.187:3000` stayed HTTP 200. |

No second Instant Deploy was started.

## Packet already on `main` (not cut to 187)

- PR 310 / `a4ae8668` — Fusarium ITDX tab restore (`/fusarium/itdx` packaged Algorithm Lab)
- PR 311 / `e4e69d50` — Earth Sim Live Data binds (Arraylake catalog + aerosol)

Governor files were **not** in the worktree at hold time. When the sibling lands viewport-cull + memory governor, include those files in the **next** Instant Deploy candidate with ITDX + Live Data. Do not revert the briefing.

## Verify after the next candidate

1. Governor present in the deploy SHA.
2. Instant Deploy idle, then one blue-green cut. NAS `-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`.
3. Candidate `187:3000` HTTP 200 before cutover.
4. Live `/fusarium/itdx` tabs show the application. Tilt + wind/radar does not OOM. Flight buttons stay alive.
