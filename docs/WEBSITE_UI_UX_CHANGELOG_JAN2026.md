# Mycosoft Website UI/UX Changelog - January 2026

## Master Documentation of All UI/UX Changes

**Last Updated:** January 19, 2026  
**Coverage Period:** January 15-19, 2026

---

## Table of Contents

1. [January 19, 2026](#january-19-2026)
   - [Mushroom 1 Product Page](#mushroom-1-product-page-updates)
   - [Defense Portal](#defense-portal-updates)
   - [Security Operations Center](#security-operations-center-updates)
   - [NatureOS CREP Dashboard](#natureos-crep-dashboard-updates)
2. [January 18, 2026](#january-18-2026)
   - [Core UI Integrations](#core-ui-integrations)
   - [Dashboard & Visualization](#dashboard--visualization-integrations)
3. [January 17, 2026](#january-17-2026)
   - [Super Admin Control Center](#super-admin-control-center)
   - [User Dashboard](#user-dashboard)
4. [January 16, 2026](#january-16-2026)
   - [CREP Dashboard Fixes](#crep-dashboard-fixes)

---

## January 19, 2026

### Mushroom 1 Product Page Updates

**File:** `components/devices/mushroom1-details.tsx`

#### Pricing Updates
| Location | Old Price | New Price |
|----------|-----------|-----------|
| Hero badge | $599 | $2,000 |
| Bottom CTA button | $599 | $2,000 |
| Devices portal listing | $599 | $2,000 |
| Device data config | 599 | 2000 |

#### Bottom CTA Section Enhancement
- **Section Height**: Increased from `py-32 md:py-48 min-h-[600px]` to `py-40 md:py-56 min-h-[800px] md:min-h-[900px]`
- **Inner Container**: Changed from `min-h-[400px]` to `min-h-[600px] md:min-h-[700px]`
- **Video Positioning**: Changed `objectPosition` from `'center 90%'` to `'center 70%'` to show more of the walking video
- **Overlay Opacity**: Reduced from `from-black/80 via-black/50 to-black/40` to `from-black/60 via-black/30 to-black/20`

#### Application Videos Swap
| Application | Previous Video | New Video |
|-------------|----------------|-----------|
| Agriculture & Farming | `d.mp4` | `c.mp4` |
| Defense & Security | `c.mp4` | `d.mp4` |

#### "Why Mushroom 1 Exists" Section
- **Media Change**: Replaced static image with `waterfall 1.mp4` video background
- **Video Config**: Autoplay, muted, loop, playsInline with object-cover

#### Devices Portal Image Update
- **File:** `components/devices/devices-portal.tsx`, `lib/devices.ts`
- **Change**: Updated Mushroom 1 device image to `Main A.jpg`

---

### Defense Portal Updates

**File:** `components/defense/defense-portal.tsx`

#### Mushroom 1D Military Variant
- **Renamed**: "Mushroom1 Quadruped Robot" → "Mushroom1-D Defense Platform"
- **Pricing Added**: $10,000 prominently displayed with "Defense-grade configuration" subtitle
- **Description Enhanced**: Added military features (encrypted C2, SATCOM capability, tactical mesh integration)

**File:** `app/defense/fusarium/page.tsx`
- Added $10,000 pricing to Mushroom1-D description

---

### Security Operations Center Updates

**File:** `app/security/page.tsx`

#### Navigation Enhancement
Added prominent navigation buttons to SOC dashboard header:
- **Incidents** (Orange button with AlertTriangle icon)
- **Red Team** (Red button with 🔴 emoji)
- **Network Monitor** (Cyan button with Network icon)
- **Compliance** (Purple button with Shield icon)

#### Compliance Framework Expansion
**File:** `app/security/compliance/page.tsx`

New frameworks added:
| Framework | Description |
|-----------|-------------|
| NIST 800-53 | Federal security controls (20+ controls) |
| NIST 800-171 | CUI protection (14 control families) |
| CMMC L1/L2/L3 | DoD cybersecurity certification (17 domains) |
| NISPOM | Industrial Security Program (Facility clearance) |
| FOCI | Foreign Ownership/Control (Mitigation controls) |
| SBIR/STTR | Small Business Innovation (Program compliance) |
| ITAR | Arms trafficking regulations (Export controls) |
| EAR | Export Administration (Commerce regulations) |

Features:
- Framework selector dropdown
- Dynamic control family sidebar
- Exostar integration tab
- PDF/CSV export functionality

#### Red Team Network Topology
**File:** `app/security/redteam/page.tsx`
- Layered attack surface visualization (External → Gateway → Internal → Endpoints)
- Real UniFi device data integration
- Risk level indicators (CRITICAL, HIGH, MEDIUM, LOW)
- Quick action buttons (Port Scan, Vuln Scan)
- Scan scheduling with configurable frequency

#### Network Monitor UniFi Integration
**File:** `app/security/network/page.tsx`
- Real device data from Dream Machine Pro Max
- Client information with traffic statistics
- Alarm monitoring
- Interactive topology with clickable nodes
- Live throughput display
- Device detail sidebars
- Traffic flow visualization

#### Authentication Fix
**File:** `components/header.tsx`
- Fixed: Header showed "Sign In" even when logged in
- Changed to use `useSupabaseUser` hook directly for consistent auth state
- Security tab now properly appears when logged in

---

### NatureOS CREP Dashboard Updates

**File:** `components/dashboard/natureos-dashboard.tsx`

#### New Intelligence Widgets Added

##### 1. Fungal Intelligence Network Widget
- Real-time mycelium activity indicator with pulse animation
- Species tracking count (2.4M+ species)
- Active network nodes display (847K nodes)
- Genomic data volume tracking (12.8TB)
- Network health percentage (98.7%)
- Spore detection rate trend (+23%)
- Color Theme: Emerald/Green gradient

##### 2. Global Asset Tracking Widget
- **Aircraft Tracking**: Live count (14,847), ADS-B coverage (98.2%)
- **Satellite Monitoring**: Total tracked (8,421), Starlink active (5,847)
- **Maritime Vessels**: AIS tracking (92,156 vessels), coverage (94.6%)
- Data sources: ADS-B Exchange, Space-Track.org, Marine Traffic
- Color Theme: Sky blue, Purple, Blue gradient
- Update interval: Every 5 seconds

##### 3. Solar Activity Monitor Widget
- Geomagnetic storm level (G1-G5 scale)
- Solar flux index (SFU)
- X-Ray flux classification
- Kp index for geomagnetic activity
- Solar wind speed and proton density
- Aurora probability percentage
- Data Source: NOAA Space Weather Prediction Center
- Color Theme: Yellow/Orange/Red gradient with animated sun icon

---

## January 18, 2026

### Core UI Integrations

#### Animated Icons Component
**File:** `components/ui/animated-icons.tsx`
- 7 animated icons: Settings, Search, Bell, Mail, Heart, Star, Loading
- Framer Motion-based hover and tap animations
- Customizable size and colors
- Spring-based animations for natural feel

#### Virtual Table Component
**File:** `components/ui/virtual-table.tsx`
- Clusterize.js integration for large datasets
- Handles thousands of rows without DOM bloat
- For use in CREP, MINDEX, and species database tables

---

### Dashboard & Visualization Integrations

#### Packery Draggable Grid
**Files:**
- `components/dashboard/draggable-grid.tsx`
- `lib/dashboard/layout-persistence.ts`
- `hooks/use-dashboard-layout.ts`

Features:
- Drag-and-drop widget arrangement
- Layout persistence to Supabase (per user/dashboard)
- Responsive grid with gap-less bin-packing

#### Perspective Analytics Viewer
**File:** `components/analytics/perspective-viewer.tsx`
- WebAssembly-powered data grid
- Streaming data support
- User-configurable pivots, sorts, filters
- Multiple view types (grid, charts)

#### AI Dynamic Widget Renderer
**Files:**
- `lib/ai/json-render-catalog.ts`
- `components/ai/dynamic-widget.tsx`

Catalog components:
- text, metric, chart, table, alert, button, container
- Allows MYCA to generate dashboard widgets from natural language

---

## January 17, 2026

### Super Admin Control Center

**File:** `app/admin/page.tsx`

Complete rebuild with 8 functional tabs:

#### Overview Tab
- Total Users: Aggregate (human + machine)
- Active Devices: Real count from MycoBrain
- Total Database Size: Aggregated from ALL databases (7+ sources)
- API Calls Today: Combined stats
- Service Status Summary by category
- Access Gate Distribution visual

#### API Keys Tab
- 45+ API keys across 11 categories
- Categories: AI, Database, Payments, Maps, Blockchain, Research, Communication, Automation, Infrastructure, Tracking, Cloud

#### Authentication Tab
- OAuth Providers display
- Security Features status (2FA, Hardware Keys, Biometric, etc.)
- Machine & API Authentication section

#### Users & Access Tab
- Clear separation: Humans vs Machines
- Machine account types: ai_agent, service, bot, automation
- Filter by user type

#### SOC Master Tab
- **Kill Switch**: Full system emergency shutdown
- **Lockdown Mode**: Network isolation controls
- 12 Security Metrics display
- Data Sources: UniFi, Proxmox, SOC, Supabase Auth

#### Services Tab
- 21+ services from all docker-compose files
- Always-On Stack (4), MAS Stack (14), Cloud (3), Infrastructure (1)

#### Database Tab
- 7 databases with full details
- Supabase Storage Buckets (5)

#### System Tab
- Functional Super Terminal with commands
- Quick Links: NatureOS Shell, Container Management, Edge Functions
- Edge Functions Stats

---

### User Dashboard

**File:** `app/dashboard/page.tsx`

- Added navigation header (Home, Admin, Billing, Notifications, Sign Out)
- Added purpose explanation card
- Added footer with site navigation links
- Improved responsive design
- Clear separation from Admin dashboard

---

## January 16, 2026

### CREP Dashboard Fixes

**Files:**
- `components/ui/map.tsx`
- `components/crep/markers/fungal-marker.tsx`
- `app/dashboard/crep/page.tsx`

#### Single Popup Behavior
- Fixed: Multiple popups stacking on each other
- Solution: Conditional popup rendering with `isSelected &&`

#### Click-Away to Dismiss
- Implemented document-level `mousedown` event listener
- Checks if click is outside popup, marker, and panels
- Properly dismisses selection state

#### Fungal Marker Theme
- Applied amber/brown theme (was too similar to red Amanita markers)
- Background: `bg-amber-600/90`
- Sepia filter on emoji
- Popup border/header: amber-themed gradients

#### Popup Timing Fix
- Made popup opening deterministic
- Split close callbacks from toggle selection

---

## Files Changed Summary

### Components

| File | Changes |
|------|---------|
| `components/devices/mushroom1-details.tsx` | Pricing, CTA section, videos, waterfall bg |
| `components/devices/devices-portal.tsx` | Pricing, image update |
| `components/defense/defense-portal.tsx` | Mushroom1-D naming and pricing |
| `components/dashboard/natureos-dashboard.tsx` | 3 new intelligence widgets |
| `components/header.tsx` | Auth state fix |
| `components/ui/animated-icons.tsx` | NEW: Animated icons |
| `components/ui/virtual-table.tsx` | NEW: Virtual scrolling |
| `components/ui/map.tsx` | Popup fixes |
| `components/dashboard/draggable-grid.tsx` | NEW: Packery grid |
| `components/analytics/perspective-viewer.tsx` | NEW: Analytics viewer |
| `components/ai/dynamic-widget.tsx` | NEW: AI widget renderer |
| `components/crep/markers/fungal-marker.tsx` | Amber theme, popup fixes |

### App Routes

| File | Changes |
|------|---------|
| `app/admin/page.tsx` | Complete rebuild with 8 tabs |
| `app/dashboard/page.tsx` | Navigation, layout improvements |
| `app/dashboard/crep/page.tsx` | Click-away handler, panel attributes |
| `app/security/page.tsx` | Navigation buttons |
| `app/security/compliance/page.tsx` | Multi-framework compliance |
| `app/security/incidents/page.tsx` | Real DB incidents |
| `app/security/redteam/page.tsx` | Network topology |
| `app/security/network/page.tsx` | UniFi integration |
| `app/defense/fusarium/page.tsx` | Mushroom1-D pricing |

### Libraries

| File | Changes |
|------|---------|
| `lib/devices.ts` | Pricing update, image update |
| `lib/security/compliance-frameworks.ts` | NEW: Framework definitions |
| `lib/security/database.ts` | Compliance functions |
| `lib/dashboard/layout-persistence.ts` | NEW: Layout persistence |
| `lib/ai/json-render-catalog.ts` | NEW: Widget catalog |
| `lib/ai/tonl-adapter.ts` | NEW: Token optimization |
| `lib/email/mailer.ts` | NEW: Email service |
| `lib/clusterize-adapter.ts` | NEW: Virtual scroll adapter |

---

## Visual Design Summary

### Color Themes Applied

| Component | Theme |
|-----------|-------|
| Fungal markers (CREP) | Amber/Brown |
| Fungal Intelligence Widget | Emerald/Green |
| Asset Tracking Widget | Sky Blue/Purple |
| Solar Activity Widget | Yellow/Orange/Red |
| Security Incidents | Orange |
| Red Team | Red |
| Network Monitor | Cyan |
| Compliance | Purple |
| Defense/Military | Orange accent |

### Animation Additions

- Mycelium activity pulse animation (CREP)
- Sun rotation animation (Solar widget)
- Spring-based icon hover animations
- Progress bar animations
- Popup open/close transitions

---

*Document compiled: January 19, 2026*  
*Total UI/UX changes documented: 50+ across 25+ files*
