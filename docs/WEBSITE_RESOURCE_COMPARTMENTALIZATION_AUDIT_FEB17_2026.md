# Website Resource Compartmentalization & Performance Audit — Feb 17, 2026

## Executive Summary

The website loads too many systems on every page, causing lag on mobile, tablet, and desktop. Providers (MYCA, PersonaPlex, voice, presence), heavy CSS, and API interceptors run unconditionally. CREP, Earth Simulator, and search load large chunks up front. This document maps current behavior and defines a separation plan.

## Goals

- **Public / logged-out users**: Minimal bundle, no MYCA/voice/presence, fast read/scroll/video.
- **Logged-in users**: Full tooling on demand — MYCA, voice, search, CREP, NatureOS apps.
- **Compartmentalization**: Each heavy system (CREP, Earth Sim, voice, search, MYCA) runs only when the user is on that route or feature.
- **Resource management**: Services scale up when used, scale down when idle; one user does not slow others.

---

## 1. What Runs on Every Page Load (Current)

### Root layout tree

```
RootLayout
├── Geist font
├── globals.css
│   ├── Tailwind
│   ├── tw-animate-css
│   └── leaflet/dist/leaflet.css  ← WRONG: no map on most pages
├── ThemeProvider
├── AuthProvider          → supabase.auth.getSession()
├── PresenceProvider      → initApiUsageInterceptor() (intercepts all fetch)
├── AppStateProvider      → Supabase user_app_state (when user)
├── MYCAProvider          → localStorage + /api/myca/consciousness/status every 30s
├── UnifiedVoiceProvider  → Web Speech API check on mount
├── PersonaPlexProvider   → usePersonaPlex, useWebSpeechFallback
├── PersonaPlexWidget     → (excluded /search, /test-voice)
├── Header                → framer-motion, MobileNav, Images
├── {children}
├── Footer
├── MYCAFloatingButton    → uses full MYCA context
└── Toaster
```

### Lag sources (global)

| Item | Impact | Fix |
|------|--------|-----|
| 7 nested providers | CPU/memory on mount | Route-based provider loading |
| Leaflet CSS in globals | Unnecessary CSS parse | Import only in CREP/map routes |
| MYCA consciousness poll (30s) | API traffic when MYCA unused | Start only when MYCA UI open |
| API usage interceptor | Monkey-patches fetch for all requests | Defer until user logged in |
| PersonaPlexProvider | Web Speech + WS logic on mount | Mount only on voice-enabled routes |
| MYCAFloatingButton | Full MYCA context | Lazy-load when shown |
| Header framer-motion | Animation lib in main bundle | Lazy MobileNav, simplify Header |

---

## 2. Route-by-Route Heavy Loads

| Route | Heavy items | When loaded |
|-------|-------------|-------------|
| `/` | ParallaxSearch, HeroSearch, PersonaPlex, video | On visit |
| `/search` | FluidSearchCanvas, 10+ widgets, packery, physics | Dynamic (ssr: false) |
| `/natureos/crep`, `/dashboard/crep` | MapLibre, OEI widgets, real-time APIs | Dynamic (ssr: false) |
| `/apps/earth-simulator` | Cesium, Earth2 API, 3D | On visit |
| `/apps/petri-dish-sim` | PetriDishSimContent, MyceliumSimulator | On visit |
| `/natureos/*` | DashboardNav, TopNav, MYCA sheet | On visit |

### CREP dashboard

- MapLibre GL + tile loading
- Multiple OEI widgets (SpaceWeather, FlightTracker, VesselTracker, SatelliteTracker, SmartFence, PresenceDetection, Biosignal)
- All widgets fetch in parallel on load
- **Should**: Lazy-load widgets when tab/panel opened; consider CREP as separate subdomain/app

### Search

- FluidSearchCanvas: useUnifiedSearch, usePackery, useVoiceSearch, useSearchMemory, useMYCA, useVoice, useAuth
- All widgets loaded in one chunk
- **Should**: Lazy-load widgets when visible (IntersectionObserver) or when tab selected

### Earth Simulator

- Cesium + Earth2 API
- GPU/CPU intensive
- **Should**: Own route with heavy dynamic import; consider separate container for Earth2

---

## 3. Separation Plan

### Tier 1: Core (always minimal)

- **Public site** (About, Devices, Research, etc.): ThemeProvider, AuthProvider only. No MYCA, no voice, no presence.
- **CSS**: Tailwind + tw-animate only. No Leaflet in globals.

### Tier 2: Logged-in shell

- **AppStateProvider**, **PresenceProvider**: Only when `user` exists.
- **API interceptor**: Only when user logged in or first API call.

### Tier 3: Feature-specific (load on route or interaction)

- **MYCAProvider + MYCAFloatingButton**: Only on routes that use MYCA (`/search`, `/myca`, `/natureos/*`, etc.) or when user opens MYCA.
- **UnifiedVoiceProvider + PersonaPlexProvider**: Only on voice-enabled routes or when user taps mic.
- **CREP**: Own route; dynamic import; lazy widget loading.
- **Earth Simulator**: Own route; dynamic import Cesium.
- **Search**: Dynamic FluidSearchCanvas; lazy widget loading.

### Tier 4: Separate servers/containers (future)

| System | Current | Target |
|--------|---------|--------|
| CREP | Inline Next.js | Optional: subdomain + dedicated CREP app |
| Earth Simulator | Inline Next.js | Optional: subdomain + Cesium/Earth2 container |
| PersonaPlex | External (8999) | Already separate ✓ |
| MAS/MINDEX | External APIs | Already separate ✓ |
| Supabase | External | Already separate ✓ |

---

## 4. Implementation Phases

### Phase 1: Layout cleanup (high impact)

1. Remove `leaflet/dist/leaflet.css` from globals; import in CREP/map components only.
2. Route-based providers: wrap MYCAProvider, PersonaPlexProvider, UnifiedVoiceProvider in a `FeatureProviders` component that only mounts on routes needing them.
3. Lazy-load MYCAFloatingButton with `dynamic(..., { ssr: false })` and only render when on MYCA-enabled routes or when user has used MYCA before (localStorage).
4. Defer `initApiUsageInterceptor` until user is logged in.

### Phase 2: MYCA and voice on demand

1. MYCA consciousness poll: start only when MYCA chat is open.
2. PersonaPlexProvider: mount only on `/search`, `/myca`, `/natureos/*`, `/test-voice`, or when MYCA floating button is shown.
3. UnifiedVoiceProvider: same route set.

### Phase 3: CREP and search widget lazy-loading

1. CREP: Lazy-load OEI widgets when their tab/panel is opened.
2. Search: Lazy-load SpeciesWidget, ChemistryWidget, etc. when visible (IntersectionObserver) or when tab selected.
3. Packery: Initialize only when widgets are ready.

### Phase 4: Earth Simulator and heavy apps

1. Earth Simulator: Ensure Cesium/Earth2 are in a dynamic import with `ssr: false`.
2. Petri Dish Sim: Dynamic import if not already.
3. Consider route groups: `(marketing)` vs `(app)` with different layouts.

### Phase 5: Containerization (ops)

1. Document which routes hit which external services (MAS, MINDEX, Supabase, PersonaPlex, CREP APIs).
2. Consider subdomains: `crep.mycosoft.com`, `earth.mycosoft.com` for heaviest apps.
3. Implement health checks and resource quotas per feature container.

---

## 5. Files to Change

| File | Phase | Change |
|------|-------|--------|
| `app/globals.css` | 1 | Remove `leaflet.css` |
| `app/layout.tsx` | 1, 2 | Route-based FeatureProviders; lazy MYCAFloatingButton |
| `components/crep/*` or CREP page | 1 | Import leaflet.css in CREP client |
| `contexts/myca-context.tsx` | 2 | Consciousness poll only when chat open |
| `lib/api-usage-interceptor.ts` | 1 | Defer init until user logged in |
| `components/voice/PersonaPlexProvider.tsx` | 2 | Conditional mount by route |
| `app/dashboard/crep/*` or CREP client | 3 | Lazy-load OEI widgets per tab |
| `components/search/fluid/FluidSearchCanvas.tsx` | 3 | Lazy-load widgets on visibility |
| `app/apps/earth-simulator/*` | 4 | Verify dynamic import for Cesium |

---

## 6. Route-Based Provider Logic

### Routes that need MYCA

- `/search`, `/myca`, `/natureos/*`, `/defense/*`, `/protocols/*` (if MYCA embedded)

### Routes that need voice

- `/search`, `/myca`, `/test-voice`, `/natureos/*` (when voice UX present)

### Routes that need presence

- Any authenticated app route (dashboard, natureos, etc.)

### Routes that need minimal load (public)

- `/`, `/about`, `/devices`, `/devices/[id]`, `/research`, `/science`, `/protocols/*` (read-only), `/terms`, `/privacy`, etc.

---

## 7. Success Criteria

- **Public / logged-out**: Lighthouse Performance > 90; no MYCA/voice/presence in bundle.
- **Logged-in, idle**: No consciousness poll, no heartbeat until user interacts.
- **CREP**: Widgets load on tab open; initial CREP paint < 3s.
- **Search**: Widgets load on visibility; no packery init until first widget visible.
- **One user heavy load**: Does not increase latency for other users (via separation of compute).

---

## 8. Related Docs

- `docs/VIDEO_FIXES_INSTANT_START_FEB10_2026.md`
- `docs/IMAGE_VIDEO_SANDBOX_UPDATE_FEB17_2026.md`
- `.cursor/rules/mobile-first-standards.mdc`
- `.cursor/rules/dev-server-3010.mdc` (run dev server externally)
