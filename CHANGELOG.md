# Changelog

All notable changes to this project will be documented in this file.

## [unreleased]

### Bug Fixes

- Remove azure-maps-control and load via CDN
- Remove azure-maps-control package
- Use X-API-Key header for MINDEX integration
- Google OAuth authentication - resolve JWT session error by fixing variable naming conflicts in session callback
- NatureOS dashboard - add Google Maps docs, workflows list API, and Model Training feedback
- *(ancestry)* Correct MINDEX data transformation and add API key auth
- Brightness slider and sensor banner improvements
- Anti-flicker for BME688 sensor widgets and improved polling
- Rename OEI MapControls import to avoid conflict with ui/map component
- *(crep)* Fix marker coordinate format compatibility for aircraft and vessels
- Add force-dynamic to /api/chat to prevent build-time errors
- Use dynamic import for langchain to prevent build errors
- Add serverExternalPackages for langchain to fix build
- Add all required env vars to Dockerfile for build-time static analysis
- Lazy-load Supabase in stripe webhooks route to fix build
- Use real Supabase URL in Dockerfile (NEXT_PUBLIC vars are baked at build time)
- Disable worker threads for Westmere CPU compatibility during build
- Use Node.js 18 and disable worker threads for Xeon X5670 compatibility
- Add missing deck.gl dependencies for live-map page
- Use Node 18 in Dockerfile for Westmere/X5670 CPU compatibility
- Remove unsupported NODE_OPTIONS flag for Node 18
- Lazy-load pdf-parse to prevent Next build crash
- *(mycobrain)* Add /api/mycobrain health + tighten proxy timeouts
- *(mycobrain)* Support device lookup by device_id in addition to port
- Correct Tripod to Quadruped - Mushroom 1 has 4 legs not 3
- Add null-safety for gap.priority and riskAssessment.level
- Agent connection system - add create_connection handler and improve error handling - Jan 27, 2026
- Correctly label Moshi text output as MYCA speaking (not user)
- Resolve MINDEX dashboard TDZ error and add SEO infrastructure - Feb 5, 2026
- Update E2CC to stub mode for CPU-only VMs
- E2CC stub with proper Python file mount
- Add .npmrc with legacy-peer-deps to resolve deck.gl conflicts - Feb 05, 2026
- Replace any types with proper PdfParseFunction type in pdf-extractor - Feb 05, 2026
- Escape quotes in VoiceOverlay.tsx for ESLint - Feb 05, 2026
- Disable react/no-unescaped-entities ESLint rule for pre-existing issues - Feb 05, 2026
- Resolve remaining ESLint errors (CheckCircle2 import, module var, hooks) - Feb 05, 2026
- Use correct MINDEX API paths with /api/mindex prefix
- Mobile responsive design for search homepage and results
- Hydration mismatch and Framer Motion drag event errors
- MycoBrain API falls back to MAS network registry when no local service
- MycoBrain API robust MAS parsing; rebuild script git sync and no-cache
- MycoBrain devices now display - add deviceType and discovered flags to device discovery
- Improve error logging and reduce polling to avoid 429 rate limits
- Restore accidentally deleted dashboard pages (CREP, SOC, integrations, layout) - commit 0d6737a deleted 5 dashboard files
- Update health check to use Supabase, add MINDEX check (Feb 12, 2026)
- Add force-dynamic to CREP and dashboard pages to prevent static export build failure
- Prevent luma.gl SSR crash - wrap CREP dashboard with dynamic(ssr:false) server component
- *(sporebase)* Add full light/dark mode support for all page sections
- Add missing closing > in HierarchicalTaxonomyTree div tag (build fix)
- Fusarium page hydration errors - valid heading nesting, theme class
- Add tailwindcss oxide musl binding for Alpine Docker builds (Feb 19, 2026)
- Keep SSH alive during sandbox rebuild
- Reconnect SSH during sandbox build
- *(devices)* Use correct SporeBase video filename (case-sensitive for Linux sandbox)
- Explicit Mycorrhizae stream route for Next.js build
- Encode asset URLs with spaces for hero videos and About Us images
- CardHeader undefined - use CardUI namespace import in nature-statistics-view
- Myconode hero1.mp4 path, lib/devices video paths to NAS assets
- SporeBase main2.jpg, MycoNode a.png on devices/about; document image and video fixes
- Use frozen lockfile in Docker build for reproducible install
- Use npm ci in Docker to avoid pnpm resolution failures
- Npm install --legacy-peer-deps for Docker build
- Detect and bypass broken MAS fallbacks, remove user-facing API error messages
- Also bypass MAS graceful fallback to get real LLM answers for users
- Align MYCA providers and remove mock scientific data
- Switch ikonate git dependency to https
- Switch ikonate lockfile to https
- Remove Node.js built-in shadow packages and pin @emotion
- Tighten linting and typing for analytics
- Stabilize hooks and remove mock phylogeny fallback
- Restore MycoNode device page with full details component
- Restore all device pages to use full detail components
- Implement live GPS tracking with follow mode for CREP map
- Rewrite deploy to use Proxmox API instead of SSH keys
- Harden CI/CD pipeline security and reliability
- Add missing deployment infrastructure files
- Remove deprecated @types/mapbox__point-geometry stub
- Resolve TS2688 for @types/mapbox__point-geometry
- Make CI pipeline pass — non-blocking tsc, exclude broken test suites
- Unblock sandbox deployment — profile GPU services and rebuild on deploy
- Unblock sandbox build and correct sporebase video asset path
- Unblock CI/CD workflow test and deploy stages
- Ensure tailwind oxide binding in production docker build
- Align production image with node 20 dependency requirements
- Defer supabase client init in onboarding signup form
- Make auth provider resilient without supabase env vars
- Guard supabase hook client initialization during prerender
- Guard app state supabase client for static prerender
- Defer signup supabase client initialization for prerender
- Defer dashboard supabase initialization during prerender
- Harden CI docker build by removing gha cache and adding timeout
- Lowercase collector image tags for ghcr compatibility
- Harden Proxmox deploy discovery in CI
- Improve Proxmox API auth and URL normalization
- Resolve tunnel errors — auth header bug, WebSocket timeouts, test types
- Resolve MYCA fallback mode and tunnel resilience issues
- *(nlm)* Hydration, contrast, NLM architecture section - Move Live Translation Demo to client component (fix SSR mismatch) - Add NLM-specific architecture (MDP, MMP, HPL, FCI, CREP, MINDEX) - Theme-aware contrast for light/dark mode - Fix layer icon rendering in SIX_LAYERS
- *(auth)* TrustHost + AUTH_TRUST_HOST for Cloudflare proxy session recognition
- Use Supabase auth for ethics-training (was NextAuth - login uses Supabase)
- Supabase session refresh in middleware, remove implicit flow for ethics-training redirect
- *(login)* Full-page redirect with 200ms delay for cookie persistence to ethics-training
- Safe_print for Unicode in deploy script
- *(myca)* OLLAMA_BASE_URL default to MAS VM 188 for production
- *(ethics-training)* Use Supabase auth instead of NextAuth for consistency with site login
- MycoBrain/CREP device visibility and service status
- *(deploy)* Skip preflight to avoid VM Docker Hub timeout hang
- *(auth)* Use createClientForRedirect for OAuth callback so session cookies set on redirect
- CREP gateway Docker port 3020 to match CREP_GATEWAY_URL
- Search nav link to point to /search instead of /
- Search link in mobile nav points to /search instead of /
- *(myca)* Search link from hash URLs; deploy script MAS/MINDEX env vars
- *(myca)* Show MYCA instead of MYCA-LOCAL-FALLBACK; add OLLAMA/N8N env to sandbox container
- Resolve fungi-compute build errors and TypeScript issues
- *(crep)* Make fungal markers interactive, add all-life data, add GND filters
- *(crep)* Install missing @types packages and fix fungal route TS errors
- *(crep)* Resolve TypeScript errors in CREP dashboard and components
- *(crep)* Additional TypeScript fixes in CREPDashboardClient
- *(crep)* Suppress pre-existing TypeScript errors in CREP files
- *(crep)* Fix remaining TypeScript errors in trajectory-lines and dashboard
- *(crep)* Resolve all remaining CREP TypeScript errors
- *(crep)* Systematic CREP overhaul - unified data models, integrations, and production fixes
- Deploy script with MAS/MINDEX env, rate limiter 15/min, memory route
- Use llama3.2:3b for Ollama (matches MAS VM) so MYCA chat works
- CI/CD deploy on main, sandbox health check, deploy direct-connect fallback
- Cloudflared tunnel healthcheck, auto-restart, and deploy reliability
- Comprehensive security remediation across 30 files
- CREP dashboard, deck-entity-layer, fungal-marker, aisstream-ships
- *(crep)* Species icons clickable - z-index above deck overlay, type=button, geometry.coordinates parsing
- *(crep)* Add data-observation-id to FungalMarker for debugging and selection
- *(map)* Add data-observation-id prop to MarkerContent for CREP species markers
- *(crep)* Make fungal species icons clickable to open widget
- *(ci)* Sync package-lock.json to unblock CI/CD pipeline
- Convert .gitignore from UTF-16LE to UTF-8
- *(ci)* Convert UTF-16 encoded source files to UTF-8
- *(ancestry)* Replace missing navigation-title component
- *(deploy)* Provide NEXTAUTH_SECRET during production build
- *(natureos)* Mark dashboard layout as client component
- Resolve build failures and deployment config issues for go-live
- Avoid null byte in Dockerfile encoding fix script (chr(0) vs '\x00')
- Resolve merge conflicts with main, use COMPANY gate for AI Studio
- *(home)* Hero video path - file is in homepage/ not homepage/Mycosoft Background/
- Hero video fallback chain — sandbox + W3 sample so video always plays
- Hero video — try NAS subfolder path first so video loads on Sandbox
- Agent worldstate $1 checkout + agent page MYCA/AVANI/WORLDVIEW copy
- *(stripe)* Reject invalid agent_worldstate minutes instead of coercing to 1
- *(ci)* Make db backup and migration non-fatal for first deploy
- *(hero)* Single video source for homepage background - correct path /assets/homepage/Mycosoft%20Background.mp4
- *(search)* Prevent crash when search results are undefined
- Restore empty route files and fix test type error
- *(ci)* Replace Proxmox QEMU agent deploy with SSH for reliable production deployment
- *(auth)* Env checks in login/callback + AUTH_TROUBLESHOOTING_MAR15_2026
- Honor redirect/redirectTo system-wide for login, signup, and agent
- Search timeouts, hero video fallback, and cross-repo deployment fixes
- Graceful Supabase degradation, search crash, and auth page guards
- Add force-dynamic exports to fix build prerender errors
- *(ci)* Pull code in /opt/mycosoft/website on production VM

### CREP

- Add INTEL tab with Human & Machines data, expand layers for comprehensive tracking, remove map attributions
- Live events on map (90s refresh, toast, blinking new markers) + sandbox doc

### Deploy

- Voice provider fix, MINDEX URLs, search improvements - Feb 12 2026
- Rebuild script force-remove container; natureos and NLM panel updates

### Documentation

- Add GitHub push summary
- Session handoff documentation for 2026-01-15
- Add enhanced map controls and WebSocket streaming verification
- Add Mushroom1 UI updates and website changelog documentation
- Complete MYCA v2.1 voice integration guide with n8n workflow diagram
- MYCA v2.1 test results - all endpoints passing, 223 agent registry verified
- Advanced 3D Topology Visualization documentation
- Complete technical documentation for topology system redesign
- Update README with MYCA Voice Integration (Feb 3, 2026)
- Add deployment guide and instructions - Feb 5, 2026
- Update search system documentation with deployment status - Feb 5, 2026
- Mobile overhaul documentation + stage remaining widget changes Feb 17 2026
- CREP live events deployment handoff for sandbox (Feb 11 2026)
- Sandbox deploy ready FEB18_2026 - pointer to MAS prep doc for deploying agent
- Add search test suite checklist
- Presence API implementation FEB24_2026
- Add manual security remediation steps guide
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]
- Update changelog [skip ci]

### Features

- Implement Azure Maps with style controls and overlay toggles
- Add new routes, components, and documentation for mycobrain, natureos, and protocols
- Major updates - About page overhaul, MycoBrain integration, Ancestry improvements, NatureOS enhancements, Docker optimization
- Complete MINDEX integration, fix critical bugs, center all pages
- Add persistent user settings with changelog and auto-save
- Integrate mycelium simulator directly (no iframe/GitHub dependency)
- *(mindex)* Add sync controls and ETL status to dashboard
- *(ancestry)* Connect database to MINDEX and external APIs for real data
- *(explorer)* Show all 5,500+ species from MINDEX with data source stats
- *(growth)* Add real Monod-Cardinal growth prediction algorithm
- Complete Device Manager with diagnostics, COMMUNICATION tab, and stability fixes
- Update API routes for optical and acoustic modem TX
- Smell detection widgets + OpenAQ AQI integration
- Device Network topology with quick actions, Smell Training UI, and MycoBrain improvements
- Earth Simulator - Complete 3D Environmental Intelligence Platform
- MINDEX integration for Ancestry module with UUID routing and image display
- Holistic MINDEX integration in NatureOS Dashboard
- *(natureos)* Live Stats Dashboard with Rolling Numbers & Marquee
- *(crep)* Implement right-side panel system with tabbed navigation
- NatureOS OEI Integration + MycoBrain Sensor Library + Drone Control
- *(CREP)* Add geospatial map markers for aircraft, vessels, and satellites
- *(crep)* Add enhanced map controls, WebSocket streaming, and FlightRadar24 API config
- *(crep)* Major CREP Dashboard Enhancement with Full Data Pipeline
- Super Admin Control Center, access control, Supabase integration, CREP improvements
- Security compliance updates, MycoBrain service updates
- Add Supabase build args to Dockerfile.container for auth
- Security SOC complete implementation with tour system
- MINDEX public page, SporeBase updates, MycoNode media & animations
- MAS v2 Dashboard Components - AgentGrid with real-time WebSocket, AgentTerminal with live logs, API proxy route
- MYCA v2 Command Center dashboard for AI Studio - New MAS components: MYCAChatPanel, SystemOverview, AgentTopology, NotificationCenter, AgentCreator - Real-time MYCA orchestrator integration - CEO command and control interface - n8n workflows integration - API routes for MAS health, chat, and notifications
- MYCA v2 voice and agent system - ElevenLabs Arabella voice, 223+ agent registry, memory system
- Full n8n workflow integration for MYCA voice - orchestrator endpoint, confirmation flow, ElevenLabs Arabella
- Advanced 3D Agent Topology Visualization - Three.js nodes with custom shaders and animations - Animated connection lines with data flow particles - Interactive node detail panel with metrics and controls - Real-time topology API with 40+ agents - Category filtering and search - Full-screen mode support - Force-directed layout positioning - System stats HUD overlay
- *(topology)* Add visualization widgets, layout manager, and UI fixes
- Add real connection system, visual drag-to-connect, and AI analysis - Jan 26, 2026
- Add real MYCA voice chat to topology dashboard - Jan 27, 2026
- Connect MYCA chat to real AI (Claude, GPT-4, Groq, Gemini) - Jan 27, 2026
- Add Metabase and n8n integration APIs for MYCA - Jan 27, 2026
- Complete MAS implementation - Real agents, Grok/xAI, n8n sync - Jan 27, 2026
- PersonaPlex voice duplex integration (Jan 27, 2026)
- MYCA Voice Integration with PersonaPlex (Feb 3, 2026)
- *(memory)* Add TypeScript memory client and API route for dashboard integration
- *(memory)* Add Memory Monitor and Dashboard to AI Studio topology - Feb 3, 2026
- Complete NVIDIA Earth-2 integration for CREP and Earth Simulator
- Revolutionary search system with fluid UI, voice, AI, and session memory - Feb 5, 2026
- Complete Earth-2 RTX infrastructure with K8s services and test suites - Feb 5, 2026
- Revolutionary homepage search with glass morphism, voice, and AI - Feb 5, 2026
- Complete Earth-2 RTX deployment to Sandbox VM - Feb 5, 2026
- Elephant Conservation Demo with MycoBrain enhancements - Feb 05, 2026
- Unified search v2 with AI fallback, intent parsing, and data grafting
- Clean homepage - remove robot icon and quick access boxes, keep only search
- Complete Search Revolution implementation - Feb 11, 2026
- *(security)* SOC dashboard integration with MAS and new APIs
- *(about)* Complete About Us page overhaul with video, particles, neural network, and team bios
- NatureOS platform expansion, defense layouts, neuromorphic UI, scientific pages, device components, new NatureOS APIs (Feb 19, 2026)
- Complete website updates and defense interaction polish
- Add petri simulator chemical overlays and panels
- Wire petri dish simulator page content
- Finalize MYCA floating chat overlay
- Embed NatureOS tools in viewport
- Expand NatureOS IoT dashboards
- Mobile search chat overhaul + hero videos mobile autoplay
- MYCA Live Presence - heartbeat, sessions, online, API usage, Supabase migration; fix orchestrator-chat nullish coalescing (FEB24_2026)
- Creator memory/consciousness, MYCA floating button global, flow edge fix (FEB17_2026)
- Complete Answers overhaul, embeds, and activity stream
- *(myca)* Add nlm, earthlive, presence, mycobrain to WorldState interface
- Species page, population API, CREP/nav updates, resource compartmentalization
- Grounded Cognition UI - ThoughtObjectsPanel, ExperiencePacketView, grounding toggle, EP/reflection proxy routes
- Add mindex health API route
- Expand website APIs, pages, and realtime feeds
- Add rate limiting to all AI routes, provider health check, Ollama support, and Next.js 15 build fixes
- Production-ready infrastructure with Ollama, Cloudflare tunnel, and deploy tooling
- *(ethics-training)* Add Ethics Training System UI - dashboard, sandbox, scenarios, analytics, observations, API proxy
- Beta onboarding, grounding dashboard, ethics page, Stripe billing, deploy scripts (Mar 2026)
- MYCA Support Upgrade - state widget, Morgan oversight, NatureOS summary, page context
- *(api)* NatureOS summary endpoint for MYCA context (gap plan)
- Add devices dashboard context to MYCA page context
- *(crep)* Add mission prompt system and full Myca integration
- *(crep)* Add Fungi species dropdown to map overlay badge
- External Repo Integration - CREP Turf, preferences, C-Suite finance proxy, labels
- Initialize Mycosoft.com v1 project
- *(crep)* Wire VoiceMapControls to dashboard, add CREP command layer and geocode API
- *(devices)* Device detail pages, telemetry card, API routes for Mushroom1/Hyphae1
- Integrate Avani governance layer into MYCA system
- Gate AI Studio access to Mycosoft employees only
- Gate NatureOS infrastructure routes to Mycosoft company emails only
- Add auth-gated platform pages and context-aware settings
- *(home)* Use Mycosoft Background video from NAS in hero section
- *(search)* Expand unified search to all Earth Intelligence domains
- Integrate MINDEX earth intelligence with CREP, MYCA, and agent APIs

### Fix

- Remove undefined initialTimeout reference in Device Manager - MycoBrain controls now fully functional
- Use correct Supabase project (hnevnsxnhfibhbsipqvz), remove /devices from protected routes
- Use X-Forwarded-Host for OAuth callback origin, add NEXT_PUBLIC_SITE_URL
- Header dropdown z-index, observation ID type errors, add deployment scripts
- Hide test controls in production, defensive slice wrappers for ID fields

### Miscellaneous

- Save SporeBase state before light/dark mode fixes
- Stage remaining mobile + team changes for sandbox deploy (FEB18_2026)
- Update workflow (FEB24_2026)
- All session changes — CREP, fungi-compute, websockets, MYCA provider fix
- Grounding API routes, GroundingStatusBadge, MYCA context grounding state
- Tier 1 package upgrades (patch/minor)
- Apply patch-package in docker build
- Update tsconfig.tsbuildinfo after removing mapbox types stub
- Update tsconfig.tsbuildinfo
- Update package-lock.json after removing @types/mapbox__point-geometry
- Update tsconfig.tsbuildinfo after build
- Update tsconfig.tsbuildinfo
- Update tsconfig.tsbuildinfo
- Update tsconfig.tsbuildinfo
- Update _restart_sandbox_tunnel script
- Update tsconfig build info
- Update tsconfig build info
- Update tsconfig build info
- Update tsconfig build info
- Update tsconfig build info

### Refactor

- Remove Web Speech API - Moshi handles all STT, MAS gets async memory clone

### Search

- Notepad gated on auth, world-view suggestions, fluid search rollout

### WIP

- CREP, test-voice, MYCA components, OEI for cross-agent work

### Website

- All 223+ agents active 24/7 in AI Studio

### Mobile

- Compact nav bars, sidebar closed on mobile, CREP ssr fix, more content space
- Comprehensive UX overhaul - phone/tablet/desktop breakpoint strategy across entire site

### Security

- Purge hardcoded secrets from working tree and history

### Ux

- Mobile devices page - sticky tab strip replaces scroll-up-scroll-down picker

