# Apps Suite Removed — Sep 22, 2026

**Date:** September 22, 2026  
**Status:** Complete  
**Repo:** `WEBSITE/website`  
**Permission:** Morgan explicit — completely remove Apps from the product

## Outcome

The public **Apps** product surface is removed. Science / research / developer tools are reached via **NatureOS**; defense tools via **Defense / Fusarium**. Legacy `/apps` and `/apps/*` URLs permanently redirect to NatureOS canonicals.

## Files changed

| File | Change |
|------|--------|
| `components/header.tsx` | Removed Apps dropdown; added Tools Hub to NatureOS menu |
| `components/mobile-nav.tsx` | Removed Apps section; added Tools Hub under NatureOS |
| `components/footer.tsx` | Applications → NatureOS (`/natureos`) |
| `app/apps/page.tsx` | Suite landing replaced with redirect to `/natureos` |
| `next.config.js` | Permanent redirects `/apps` and `/apps/*` → NatureOS paths |
| `app/sitemap.ts` | Removed `/apps*` URLs; list NatureOS tool URLs |
| `components/command-search.tsx` | Explore Apps → Open NatureOS |
| `components/dashboard/nav.tsx` | Sidebar section Apps → Science |
| `components/dashboard/natureos-dashboard.tsx` | Earth Sim link → `/natureos/earth-simulator` |
| `components/dashboard/top-nav.tsx` | Help copy: Science not Apps |
| `components/search/mobile/MobileSearchViewport.tsx` | Earth sim deep links → NatureOS |
| `app/natureos/page.tsx` | Added missing science tools + Workflow Builder; copy cleanup |
| `components/natureos/apps/tools-hub/tools-hub-index.tsx` | Added Aerosol / Spore Tracker |
| `lib/nav-public-tools.ts` | Comment update (suite removed) |
| `app/dashboard/page.tsx` | Removed Apps nav chip |
| `components/apps/petri-dish-sim-content.tsx` | Back link → NatureOS Tools |


## Former Apps items → where they live now

### Research / innovation (NatureOS)

| Former Apps item | Canonical destination |
|------------------|----------------------|
| Petri Dish Simulator | `/natureos/virtual-petri-dish` |
| Mushroom Simulator | `/natureos/biology-simulator` |
| Compound Analyzer | `/natureos/compound-analyser` |
| Spore Tracker | `/natureos/aerosol` |
| Ancestry Database | `/natureos/ancestry` |
| Genomics Tools | `/natureos/ancestry/tools#genomics` |
| Growth Analytics | `/natureos/growth-analytics` |
| Physics Simulator | `/natureos/tools/physics-sim` |
| Digital Twin | `/natureos/tools/digital-twin` |
| Lifecycle Simulator | `/natureos/tools/lifecycle-sim` |
| Genetic Circuit | `/natureos/tools/genetic-circuit` |
| Symbiosis Mapper | `/natureos/tools/symbiosis` |
| Retrosynthesis | `/natureos/tools/retrosynthesis` |
| Alchemy Lab | `/natureos/tools/alchemy-lab` |
| Earth Simulator | `/natureos/earth-simulator` |
| Tools Hub (catalog) | `/natureos/tools` |

### Developer (NatureOS)

| Former Apps item | Canonical destination |
|------------------|----------------------|
| Shell | `/natureos/shell` |
| API Gateway | `/natureos/api` |
| Workflow Builder | `/natureos/workflows` |
| Functions | `/natureos/functions` |
| SDK / Containers / Storage / etc. | NatureOS infra section on `/natureos` |

### Defense (already under Defense / Fusarium)

| Former Apps portal item | Destination |
|-------------------------|-------------|
| Fusarium | `/defense/fusarium` |
| NatureOS Command | `/natureos` |
| MINDEX Console | `/natureos/mindex` |
| CREP Dashboard | `/dashboard/crep` (+ Fusarium overview native apps) |

Fusarium overview still hosts Situational Awareness, Threat Assessment, Data Fusion, C2, OEI Narrative, Stack Inventory.

## Verify

- Header / mobile nav: no Apps menu
- `/apps` → `/natureos` (308)
- No footer/sitemap/command-palette hub link to `/apps`
- NatureOS lists science + developer tools; defense under Defense/Fusarium
