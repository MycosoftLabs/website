# DirtNet Glass Overhaul — Complete SEP22 2026

**Date:** September 22, 2026  
**Status:** Complete  
**Route:** `/dirtnet`  
**Related:** NatureOS / product-glass / GlassButton marketing language

## Scope

Overhaul the public DirtNet marketing page to black/white glass UI (no blue slate / green light-mode card tints), glass CTAs, rich protocol copy, real sensor/device links, and an Earth-centered interactive device network (standalone — no Fusarium CTAs).

## Delivered

### Page path

- `https://localhost:3010/dirtnet` (App Router: `app/dirtnet/page.tsx`)

### Sections

1. **Hero** — DirtNet definition (devices, MDP, Mycorrhizae, MycoSpeak); glass CTAs  
2. **Sensors & systems** — links to real device/protocol/NatureOS routes  
3. **Device network (Earth orbit)** — Earth Simulator center; ProductIcons around Earth; click → dialog  
4. **Network stack** — MDP / Mycorrhizae / MycoSpeak glass cards  
5. **Data flow** — Sense → MDP/MycoSpeak → Mycorrhizae mesh → MINDEX & NatureOS  
6. **Radio & mesh + where it runs** — integration list + device deep-links  
7. **Closing CTA** — NatureOS + MycoBrain (no Fusarium)

### Orbit device list

| Device | ProductIcon | Route | Image |
|--------|-------------|-------|-------|
| MycoBrain | `mycobrain` | `/devices/mycobrain` | `/assets/devices/mycobrainjetson-white.jpg` |
| Mushroom 1 | `mushroom-1` | `/devices/mushroom-1` | `/assets/mushroom1/Main A.jpg` |
| SporeBase | `sporebase` | `/devices/sporebase` | `/assets/sporebase/sporebase%20main2.jpg` |
| Hyphae 1 | `hyphae-1` | `/devices/hyphae-1` | `/assets/hyphae1/hyphae1-lab-prototype.png` |
| MycoNode | `myconode` | `/devices/myconode` | `/assets/myconode/myconode-main.png` |
| ALARM | `alarm` | `/devices/alarm` | `/assets/alarm/alarm-device.jpg` |
| Psathyrella | `psathyrella` | `/devices/psathyrella` | `/assets/psathyrella/hero.png` |
| Agaric | `agaric` | `/devices/agaric` | `/assets/agaric/hero.jpg` |

Earth center → `/natureos/earth-simulator` (ProductIcon `earth-simulator`).

### Files changed

- `app/dirtnet/page.tsx` — metadata + client page mount  
- `components/dirtnet/dirtnet-page.tsx` — glass layout sections (new)  
- `components/dirtnet/dirtnet-earth-orbit.tsx` — orbit + dialog (new)  
- `components/dirtnet/dirtnet-devices.ts` — orbit catalog + system links (new)

## Verify

- `GET http://localhost:3010/dirtnet` → **200** (confirmed SEP22 2026)  
- No mock metrics; dialogs use real `/assets` paths and live `href`s  
- Mobile: stacked Earth card + 2/4-column touch grid; desktop: polar orbit

## Follow-up

- Optional: commit/push + Sandbox rebuild when Morgan requests deploy  
- Optional: NAS poster/video band for DirtNet hero if a dedicated clip is added later
