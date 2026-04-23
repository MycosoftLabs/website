# CREP Strategic Scale + Rebrand Plan — Apr 23, 2026

**Requested by**: Morgan, evening of Apr 23 2026.
**Context**: 19+ PRs shipped today fixing render, data, perf, and UX. Foundation is now stable enough to plan the next arc. Morgan is going to Vegas for a week (Bitcoin conference, mobile demo). When he returns we attack: (a) GPU + infra scaling, (b) integrate CREP as the backbone of NatureOS, (c) public rebrand to "Earth Simulator", (d) defense variant inside Fusarium.

---

## 1. Performance ceiling — where we are, where we're going

### Today (post PRs #109-#129)
| Metric | Value |
|---|---|
| First page load (cold) | ~3-4 s on fiber, ~8-15 s on mobile LTE |
| Second page load | ~800 ms (service worker cache hit) |
| Resident GPU memory | ~500-900 MB (down from ~1.2 GB) |
| DOM marker count cap | 200-2,500 by zoom tier (down from 300-100,000) |
| Live entity pump | 5 FPS dead-reckoning, 30 s refresh |
| Layer count | ~224 registered, ~60 rendered in viewport at typical zoom |
| MapLibre source types | still 90% geojson — migration to PMTiles in flight |

### Target (post scaling plan)
| Metric | Target | How |
|---|---|---|
| First page load cold | **< 1.5 s on fiber, < 3 s on LTE** | PMTiles + Cloudflare edge, image optimization, route-split |
| Second page load | **< 300 ms** | Service worker hit + prewarmed MINDEX snapshot |
| Resident GPU memory | **< 250 MB on phones** | GPU raster tiles on 4080s for heavy layers, not client WebGL |
| Concurrent users | **500+ per dyno** | Server-side tile rendering, CDN caching, Edge-native APIs |
| Mobile target | **60 fps pan/zoom on iPhone 13+, 30 fps on Android mid-range** | Thin client, server-rendered rasters for heavy overlays |

### Three-phase delivery
**Phase A — already landing (this week)**:
- Service worker (PR #125) ✅
- PMTiles client supports R2 CDN (PR #126) ✅
- fetchWithTimeout kills hang-forever widgets (PR #129) ✅
- AQI dots + auto-refresh fix (PRs #127, #128) ✅
- Cursor: nightly tippecanoe bake to R2, Legion stub watchdog

**Phase B — next 2 weeks**:
- Remaining 15+ fetch() migrations in CREPDashboardClient (follow-up to #129)
- GPU raster render on 241/249 for Earth-2 + iNat density + signal coverage
- Mapbox/Cloudflare image optimization for every `<Image>` in asset popups
- `useMemo` audit on the 10 most expensive hooks in CREPDashboardClient

**Phase C — month+**:
- Cloud render path for phones (WebRTC H.264 stream of the map from a g6.xlarge, client just shows video)
- MVT worker pipeline on AWS for burst bakes when new data arrives
- Real-time collaborative waypoints (Supabase Realtime)

---

## 2. NAS vs VM vs Cloud — authoritative matrix

### What stays on Mycosoft LAN (187 + 188 + 189 + 241 + 249)
| Asset | Host | Why |
|---|---|---|
| Website Next.js container | 187 (sandbox) | User-facing; Cloudflare tunnel termination |
| MAS orchestrator | 188:8001 | Low-latency agent ops; MYCA lives here |
| MINDEX DB + API | 189:8000 | Source of truth for every entity; co-located with Postgres |
| PersonaPlex Voice | 241:8999 | Latency-sensitive voice loop; GPU local inference |
| Earth-2 NVIDIA Modulus | 249:8220 | GPU-bound weather AI |
| Shinobi NVR | 188:8080 | Local camera feeds, private |
| NAS (raw datasets, raw video, exports) | internal | Bulk, cheap, no egress cost |

### What moves to Cloudflare R2 / AWS
| Asset | Where | Why |
|---|---|---|
| Baked `.pmtiles` archives | Cloudflare R2 | Free egress, global edge cache, 10 ms tile fetch |
| Static geojson fallback (until PMTiles replaces) | R2 | Same |
| Camera registry seed geojsons | R2 | Read-heavy, small, CDN-natural |
| Earth-2 pre-rendered raster PNGs | R2 (nightly bake) | Precomputed once, served to millions |
| iNat density heatmap tiles | R2 | Same |
| Publishing imagery (blog, marketing) | Cloudflare Images / Polish | WebP/AVIF auto-conversion, 40-70% bandwidth save |
| Overflow tile bakes during data refresh | AWS `g6.xlarge` spot | $0.80/hr, 30 min run, terminates itself |
| Training runs for new Earth-2 / Fusarium models | AWS `p4d.24xlarge` | 8× A100, $32/hr, project-by-project |

### Decision rule
- **Hot, private, latency-critical → LAN**
- **Read-heavy, public-safe, cacheable → R2**
- **Burst compute or model training → AWS spot**
- **Never** put MINDEX data on AWS. It's our moat.

---

## 3. Image storage overhaul

Current state: raw JPEGs / PNGs served from origin. Every CREP popup image (iNat photos, cam snapshots, Earth-2 rasters) hits origin bandwidth.

### Proposed: Cloudflare Images + Polish
- **Cloudflare Images**: `$5/month + $1 per 100k delivered images`. Automatic WebP/AVIF conversion per browser, responsive srcset generation, crop/resize on the fly. Drop-in replacement for Next.js `<Image>` — change the `loader` config, done.
- **Polish (already on Cloudflare Pro)**: activate for every page. Lossless WebP conversion for all JPEG/PNG responses.
- **Expected savings**: 40-70% bandwidth per image.

### Implementation
- Add `next.config.js` image loader: `loader: "custom", loaderFile: "./lib/cloudflare-image-loader.ts"` returning `/cdn-cgi/image/width=${w}/{path}` URLs.
- Every existing `<Image>` works unchanged.
- Fallback to origin if path not on CDN (dev, local testing).

Who does it: me, PR #130 when I get back from Vegas doc draft.

---

## 4. Micro-efficiency grab bag

From the audit + past perf work, here are the quick wins we haven't done yet:

| Fix | Effort | Win |
|---|---|---|
| Lazy-import heavy components (`dynamic(() => import())`) for VideoWallWidget, Earth2Layers | S | Shave 200-400 KB off initial bundle |
| Route-split the dashboard at each major section | M | 20-30% TTI improvement |
| Service worker precache the 5 most-used tiles of the default view | S | Zero network for first paint after install |
| Remove the `static` random-jitter "Human & Machines" panel OR wire it to real data | S | Stops showing fake numbers to partners |
| Audit `useMemo` dependencies in CREPDashboardClient — 10+ hooks probably recompute on every render | M | 10-20% fewer React renders |
| Use `React.startTransition` for layer toggles | S | Toggle feels instant even when paint is heavy |
| Move the MINDEX 3D cell-tower geometry to a CDN WebGL worker | L | Frees main thread entirely |

Morgan — I'd prioritize the first 4 for quick wins when you're back from Vegas.

---

## 5. Access audit — homepage → NatureOS → CREP

### Entry points that should lead to CREP today
1. `/` homepage → no CREP link in nav today. **Gap**: add "Earth Simulator" to main nav once rebrand ships.
2. `/natureos` overview → links to `/dashboard/crep`. Works.
3. `/defense/fusarium` → needs a CREP tab once the defense variant is built.
4. Direct URL `/dashboard/crep` → works.

### What needs fixing for public access
- **Auth**: today `/dashboard/crep` is open. Must gate behind Supabase auth for public launch. The auth context exists (`contexts/auth-context.tsx`); needs middleware on the dashboard route.
- **Onboarding**: a public user landing on CREP for the first time sees 224 layers and 3 sidebars. Needs a 3-step welcome overlay (set location → pick interests → tour).
- **Performance**: Phase B must be done before public launch; today's first-load on mobile is too slow for a consumer audience.

---

## 6. "Earth Simulator" public rebrand plan

**Why rename**: "CREP" is mil/gov jargon. "Earth Simulator" is what civilians read on a landing page and understand. Internally + in defense contracts we keep calling it CREP.

### Scope of the rename
| Surface | Old | New |
|---|---|---|
| Public URL path | `/dashboard/crep` | `/earth-simulator` (with `/dashboard/crep` as alias) |
| Page title | "CREP // Common Relevant Environmental Picture" | "Earth Simulator — Real-time planet awareness" |
| Public nav link | (none) | "Earth Simulator" |
| API routes | `/api/crep/*` | Keep as-is. Internal contract unchanged. |
| Component file names | `CREPDashboardClient` | Keep. Internal. |
| Internal docs | "CREP" | "CREP" |
| Defense variant | "CREP" | "CREP" (original name retained) |
| Marketing copy | "CREP" | **"Earth Simulator"** everywhere |

### Implementation
- `app/earth-simulator/page.tsx` → re-exports `CREPDashboardClient`
- `app/dashboard/crep/page.tsx` → stays, server-redirects to `/earth-simulator` for logged-in users
- Top classification banner swaps between "EARTH SIMULATOR" (public) and "CREP // UNCLASSIFIED // FOUO" (defense variant) based on auth role
- SEO: meta title, description, OG image for Earth Simulator
- Logo treatment: Mycosoft mark + "Earth Simulator" wordmark, stacked for nav

Effort: **M**. One PR, no behaviour change in dashboard itself.

---

## 7. NatureOS integration plan

**Goal**: CREP becomes the "Map" tab of NatureOS. NatureOS is the account shell (auth, org management, billing, user preferences, MYCA chat history, waypoints library). CREP is the primary data surface inside that shell.

### Architectural shifts
1. **Single auth source**: NatureOS Supabase Auth → CREP consumes `useAuth()` context, gates features. Already half-wired today; finish the plumbing.
2. **Shared waypoints store**: Supabase table `waypoints` keyed on user_id, synced via `@supabase/realtime-js`. CREP reads + writes, NatureOS other tabs read. Eliminates the current localStorage-only waypoints.
3. **Shared MYCA chat**: one MYCA session per user across all NatureOS tabs. Today CREP has its own MYCAChatWidget; unify to the same provider used by NatureOS root.
4. **Shared MINDEX entitlements**: the `scope` field on API keys already tiers access (public / agent / company / fusarium / ops). NatureOS sets the scope at login based on user tier; CREP reads it to gate layers.
5. **Nav unification**: NatureOS sidebar has Home / Earth Simulator / MYCA / Devices / Waypoints / Settings tabs. Earth Simulator opens the CREP dashboard in full-bleed.

### Migration order
1. Move the global layout (nav, sidebar, top bar) to `app/(natureos)/layout.tsx`
2. Move `/dashboard/crep` to `/(natureos)/earth-simulator/page.tsx`
3. Wire the waypoints context at the NatureOS level, not inside CREP
4. Add scope-based layer gating in CREPDashboardClient using `useAuth().user.tier`
5. Remove CREP's standalone sidebar chrome (top classification banner stays if defense tier)

Effort: **L**. 1-2 weeks of focused work. Can run in parallel with Earth Simulator rebrand.

---

## 8. Fusarium defense variant

**Goal**: Defense version of CREP + Earth Simulator with extra layers + extra auth + restricted-data sources. Shipped as `/defense/fusarium/crep` or `/defense/fusarium/earth-simulator` under the existing `app/defense/fusarium/` tree.

### What makes it different
| Feature | Public Earth Simulator | Fusarium CREP |
|---|---|---|
| Auth | Supabase email+magic link | FedRAMP-aligned SSO (Okta / Entra / CAC) |
| Layer ceiling | Public (weather, infra, iNat, AIS, FR24, satnogs) | + HIFLD classified, NGA OPIR, CJADC2 feeds, DoD CAMO |
| Entity enrichment | Public MINDEX | + classified taxon registry, species dual-use ag-bio tags |
| MYCA tier | Community agent | Ops agent (tool-use + command integration) |
| Export | PNG / GeoJSON | + KML, NITF, Link-16 JSON |
| Data residency | Cloudflare R2 + AWS us-west-2 | Optional GovCloud + on-prem only |
| Top banner | EARTH SIMULATOR | CREP // CONFIDENTIAL // FOUO or higher |
| Collaboration | Waypoints shared to your team | + red/blue annotations, classified chat rooms |

### What to build first (MVP for first defense pilot)
1. Clone `/dashboard/crep` → `/defense/fusarium/crep`. Same component tree, different layout wrapper.
2. Gate at middleware: require `user.tier >= "fusarium"`. Redirect everyone else.
3. Add 3 classified layers wired from MINDEX with scope=fusarium:
   - HIFLD critical infrastructure (full detail)
   - Mil-OPS live track feeds
   - FIRMS thermal anomaly (uncapped rate)
4. Swap top banner to CREP // FOUO.
5. Add "Share red/blue waypoints with team" feature (subset of NatureOS waypoints with classification tag).

### Google AI Studio integration (Morgan's ask)
- Fusarium dashboard lives on Google AI Studio today.
- Wrap the Earth Simulator React app as an iframe embed in AI Studio.
- Shared session: JWT from AI Studio → validates against our backend, grants Fusarium scope.
- 2-3 days of work to set up SSO handshake.

Effort: Defense MVP **L** (2 weeks), AI Studio embed **M** (3 days).

---

## 9. Concrete next-ship list

When Morgan's back from Vegas, here's my proposed first-week sprint:

| Day | Ship |
|---|---|
| Mon | Finish fetchWithTimeout migration in CREPDashboardClient (remaining 15 sites) |
| Tue | `/earth-simulator` route alias + top-bar copy swap for non-auth users |
| Tue | Cloudflare Images loader + swap 5 most-used `<Image>` usages |
| Wed | Lazy-import heavy components (VideoWall, Earth-2 layers, Cesium) |
| Wed | Route-split dashboard subtrees for bundle shrink |
| Thu | Mobile polish — sidebar collapse, touch-friendly controls, no hover-only UI |
| Thu | Waypoint Supabase table + sync (replaces localStorage-only today) |
| Fri | Demo run on phone + tablet + laptop |

Cursor's parallel track during that week:
- Legion firewall + portproxy + NSSM wrap
- First nightly PMTiles bake → R2 → `tiles.mycosoft.com/substations.pmtiles` live
- GPU raster renderer (real, not stub) on 241 + 249
- `AWS_CREP_BAKER_SECRET` + `R2_ACCESS_KEY_ID` in GitHub Actions
- Earth-2 watchdog on 249 (restart :8220 on health failure)

---

## 10. Risks + unknowns

- **Mobile GPU ceiling**: even with all optimizations, a $200 Android with a Mali G52 cannot render MapLibre at 60 fps with 20+ layers. Accept 30 fps target; below that we need the WebRTC cloud-render path.
- **R2 bandwidth bill at scale**: R2 has $0 egress but object storage is $0.015/GB/mo. If we end up with 200 GB of tiles + image assets, that's $3/mo. Fine.
- **Fusarium classification**: we haven't mapped which CREP features cross the UNCLAS/CONF boundary yet. Need a compliance pass before first defense pilot.
- **Dual-maintenance cost**: keeping `/dashboard/crep` alias alongside `/earth-simulator` for a while doubles route surface. Plan to deprecate the alias in ~90 days.

---

## 11. Open questions for Morgan

1. **Earth Simulator public launch date**: are we targeting Q2 2026 (public soft-launch post-Vegas), Q3 (after NatureOS integration lands), or later?
2. **Pricing tier structure**: who gets what layers? Free tier, Pro tier ($29/mo?), Defense tier (enterprise)? Affects scope gating.
3. **AI Studio / Fusarium**: do we build the Earth Simulator iframe embed first, or the standalone defense variant at `/defense/fusarium/crep` first?
4. **Cloud render for phones**: $0.80/hr per concurrent user is meaningful at scale. Do we want a freemium cap (e.g. 15 min/day for free users)?
5. **Data residency**: any defense prospect asking for GovCloud-only deployment in the next 6 months? If yes, start the AWS GovCloud account provisioning now (2-month lead time).

---

Doc owner: Claude. Review + iteration welcome. Cursor: all ops items in §9 are yours; flag anything where the plan conflicts with your infra reality.
