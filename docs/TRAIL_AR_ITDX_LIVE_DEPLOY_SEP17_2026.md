# Trail AR + ITDX 2.0 live deploy — 17 Sep 2026

**Date:** 17 September 2026  
**Status:** Contrast PASS on localhost:3010, then blue-green Instant Deploy  
**CFO:** RJ Ricasata  
**live:** false · `forecast_p`: null · WEKA ≠ NLM · no claimed trail F1

## Contrast (required gate)

Play-through Playwright (not seek-only) on `http://localhost:3010/natureos/bluesight-trail`:

| Check | Result |
|---|---|
| Play + `readyState` ≥ 2 | PASS |
| `__trailOverlay` live | PASS |
| Canvas vs 300×150 | 512×910 (video 1080×1920, object-fit) |
| Clocks | objects `raf` · steps `280` ms · `INSTANCE_CAP` 5 |
| Ink / bright / halo t≈2s | 96787 / 52345 / 35193 |
| Ink / bright / halo t≈5s | 81896 / 39641 / 34948 |
| `mapCenterAtVideoY` in HUD | not used |

Screenshots:

- `.tmp/trail-overlay-contrast-sep17/t2s_play.png`
- `.tmp/trail-overlay-contrast-sep17/t5s_play.png`
- `.tmp/trail-overlay-contrast-sep17/t2s_play_canvas.png`
- `.tmp/trail-overlay-contrast-sep17/t5s_play_canvas.png`

### Stroke / fill values (`lib/fusarium/bluesight/trail-ar-hud.ts`)

| Layer | Halo | Stroke | Fill |
|---|---|---|---|
| Path L/R | black 6.0px | `#ffe600` 3.0px | bed `rgba(255,230,0,0.16)` |
| Foothold GREEN | 4.2px | `#22ff66` 2.2px | `rgba(20,255,90,0.50)` |
| Foothold CYAN | 4.2px | `#1ef0ff` 2.2px | `rgba(20,230,255,0.48)` |
| Foothold RED | 4.2px | `#ff3b3b` 2.2px | `rgba(255,40,40,0.50)` |
| Object rims | 3.8–4.0px | kind color 1.8–2.0px | 0.18–0.22 + convex hull |

## ITDX 2.0 included

- `/fusarium/itdx/v2` local demo board
- `lib/fusarium/itdx/connectivity.ts` (3.5s MAS/MINDEX probe; offline local WEKA)
- `/api/fusarium/itdx/local-weka`
- WEKA campaign `mode` / `banner`
- Dual-mode doc: `docs/ITDX_V2_LOCAL_DEMO_DUAL_MODE_SEP17_2026.md`

Honesty: fixture F1 is SYNTHETIC only. Trail score is not yet scored. `forecast_p` stays null.

## Deploy

Blue-green Instant Deploy. Primary stays up until candidate HTTP 200. NAS:

`-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`

Not a live COP.
