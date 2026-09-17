# Trail two-clock overlay — Sep 14, 2026

Date: 2026-09-14  
Status: Local fix only — **not deployed**

## Clocks

| Layer | Interval | What |
|---|---|---|
| B — objects | every rAF (~16 ms / display Hz) | detect + track + contour follow |
| A — steps | **280 ms** place/score; rAF flow only | CYAN/RED retarget; GREEN holds |

## Caps

- Max object instances per frame: **5** (`INSTANCE_CAP`)
- Max visible footholds: **3**

## rAF

try/finally kept. `mapCenterAtVideoY` not reintroduced.

## Probe (Playwright, 14 Sep)

- Canvas bitmap **1080×1920** (no longer 300×150).
- Video metadata 1080×1920; `readyState` stayed **1**; `__trailOverlay` null; ink **0**.
- Honest fail on moving ink — Chromium did not reach HAVE_CURRENT_DATA.
- BFF: fixture 200 / `forecast_p: null`; NLM 200 / `forecast_p: null` (first compile ~9–12s).
- **Not deployed.**
