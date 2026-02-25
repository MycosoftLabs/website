# Website Resource Compartmentalization Plan FEB25 2026

**Date**: February 25, 2026  
**Author**: MYCA Coding Agent  
**Status**: In Progress

## Overview

This plan implements a full five-phase resource compartmentalization strategy for `website` so public browsing stays fast while MYCA quality and responsiveness remain intact. The goal is to remove idle overhead, keep heavy systems route-scoped, and preserve full MYCA capability where users actively use it.

## Constraints

- Do not degrade MYCA quality, routing quality, or response speed on MYCA-enabled routes.
- Do not introduce mock or fallback fake data.
- Keep public/logged-out browsing lightweight.
- Keep heavy features isolated and loaded on demand.

## Phase Plan

### Phase 1 - Layout and global load cleanup

- [x] Remove global Leaflet CSS from `app/globals.css`.
- [x] Keep Leaflet CSS route/widget scoped (`MapWidget`).
- [x] Introduce route-aware provider composition in app shell.
- [x] Lazy load `MYCAFloatingButton`.
- [x] Defer API usage interceptor initialization until authenticated.

### Phase 2 - MYCA and voice activation strategy

- [x] Make MYCA consciousness status polling opt-in (active only when chat/UI is open or MYCA route requires it).
- [x] Add MYCA activation trigger from chat widget/button.
- [x] Scope voice providers to voice-capable routes.

### Phase 3 - CREP and search widget lazy loading

- [x] Lazy import core search widgets to reduce initial payload.
- [x] Add viewport-driven widget mounting to avoid rendering all expanded widgets immediately.
- [x] Lazy import CREP data widgets so map view does not load all panel widget code upfront.

### Phase 4 - Heavy app route isolation

- [x] Make Earth Simulator page use dynamic client loading.
- [x] Make Petri Dish Simulator page use dynamic client loading.
- [x] Keep heavy map/3D features isolated to app routes.

### Phase 5 - Service and container compartment map

- [x] Define target runtime boundaries:
  - Core Website Shell (public/read-only pages)
  - MYCA Interaction Layer (chat/memory/orchestration UI)
  - Voice Layer (PersonaPlex/Web Speech bridge)
  - CREP Layer (high-frequency map/intel widgets)
  - Earth2/Simulation Layer (GPU-heavy visualization)
- [x] Define infra split target:
  - `www.mycosoft.com`: core website shell
  - `crep.mycosoft.com`: CREP map + intelligence feeds
  - `earth.mycosoft.com`: Earth simulator and heavy weather models
- [x] Define autoscaling/resource policy:
  - Scale-to-zero or low baseline for CREP/Earth containers when idle.
  - Keep MYCA backend warm and prioritized.
  - Keep auth/session services independent from CREP/Earth workloads.

## Validation Checklist

- [ ] Public route bundle and hydration cost reduced.
- [ ] No MYCA/voice regressions on `/search`, `/myca`, `/natureos/*`, `/test-voice`.
- [ ] CREP still renders and data widgets work when selected.
- [ ] Search widgets still render with real data when brought into view.
- [ ] Earth Simulator and Petri Sim still load correctly.
- [ ] No new lints introduced in edited files.

## Related Documents

- `docs/WEBSITE_RESOURCE_COMPARTMENTALIZATION_AUDIT_FEB17_2026.md`
- `../MAS/mycosoft-mas/docs/MASTER_DOCUMENT_INDEX.md`
