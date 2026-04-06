---
description: Navigate the NatureOS dashboard — the central hub for all 38+ apps, tools, devices, AI, and infrastructure in mycosoft.com
---

# NatureOS Dashboard

## Identity
- **Category**: platform
- **Access Tier**: AUTHENTICATED (basic), COMPANY (infrastructure section and select items)
- **Depends On**: platform-navigation, platform-authentication
- **Route**: `/natureos`
- **Key Components**:
  - `app/natureos/page.tsx` — main dashboard page (renders DashboardShell, DashboardHero, DashboardHeader, NatureOSWelcome)
  - `app/natureos/layout.tsx` — metadata layout (title: "NatureOS | Mycosoft")
  - `app/natureos/NatureOSLayoutClient.tsx` — client layout with SidebarProvider, TopNav, DashboardNav, AutoGateWrapper
  - `components/dashboard/nav.tsx` — sidebar navigation with 6 collapsible sections (39 items total)
  - `components/dashboard/header.tsx` — DashboardHeader component (heading + description text)
  - `components/dashboard/shell.tsx` — DashboardShell layout wrapper (max-w-7xl container)
  - `components/natureos/natureos-welcome.tsx` — welcome content: fleet health cards, MINDEX species stats, quick action buttons
  - `components/dashboard/top-nav.tsx` — top navigation bar
  - `components/dashboard/navigation-title.tsx` — sidebar title

## Success Criteria (Eval)
- [ ] Land on NatureOS dashboard after login at `/natureos`
- [ ] See DashboardHero with display name and DashboardHeader ("NatureOS Dashboard")
- [ ] See NatureOSWelcome cards: Total Devices, Online Now, Fleet Uptime, Last Update
- [ ] See Nature & Species stats: Total Species, Observations, Genomes, With Images
- [ ] See Quick Actions: Device Registry, Telemetry Dashboard, Alert Center, Device Map, Fleet Management, Insights, MINDEX Explorer
- [ ] Navigate to any app via sidebar (all 6 sections)
- [ ] Understand which sections are available at which access tier
- [ ] Expand/collapse sidebar sections via chevron toggle
- [ ] Navigate to any of the 39 sidebar items
- [ ] Sidebar overlay mode on mobile (Sheet), push mode on desktop

## Navigation Path (Computer Use)
1. Navigate to `mycosoft.com` and log in (AUTHENTICATED required)
2. Click "NatureOS" in the top navigation or navigate directly to `/natureos`
3. The dashboard loads with the sidebar (collapsed by default on mobile, open on desktop)
4. On mobile/tablet: tap the SidebarTrigger hamburger button to reveal the sidebar overlay
5. The main content area shows: DashboardHero greeting, DashboardHeader ("NatureOS Dashboard"), and NatureOSWelcome with fleet health stats, species stats, and quick action buttons
6. Use sidebar sections to navigate to any of the 39 items across 6 categories
7. Sidebar sections expand/collapse via chevron buttons; active route auto-expands its section

## Screen Elements Map

### Sidebar Navigation (39 items across 6 sections)

#### Apps (10 items, default: open)
| # | Title | Route | Icon | Access |
|---|-------|-------|------|--------|
| 1 | Overview | `/natureos` | Home | ALL |
| 2 | Nature Statistics | `/natureos/species` | Leaf | ALL |
| 3 | Fungi Compute | `/natureos/fungi-compute` | Brain | ALL |
| 4 | Earth Simulator | `/natureos/tools/earth-simulator` | Globe | ALL |
| 5 | Petri Dish Simulator | `/natureos/tools/petri-dish` | PipetteIcon | ALL |
| 6 | Mushroom Simulator | `/natureos/tools/mushroom-sim` | Microscope | COMPANY |
| 7 | Compound Analyzer | `/natureos/tools/compound-sim` | FlaskConical | ALL |
| 8 | Spore Tracker | `/natureos/tools/spore-tracker` | Globe | COMPANY |
| 9 | Ancestry Database | `/ancestry` | Database | ALL |
| 10 | Growth Analytics | `/natureos/tools/growth-analytics` | LineChart | COMPANY |

#### AI (3 items, default: open)
| # | Title | Route | Icon | Access |
|---|-------|-------|------|--------|
| 11 | Myca AI Studio | `/natureos/ai-studio` | Bot | COMPANY |
| 12 | NLM Training Dashboard | `/natureos/model-training` | Cpu | ALL |
| 13 | Workflows | `/natureos/workflows` | Workflow | COMPANY |

#### Tools (9 items, default: collapsed)
| # | Title | Route | Icon | Access |
|---|-------|-------|------|--------|
| 14 | MATLAB Tools | `/natureos/tools/matlab` | Wrench | ALL |
| 15 | Genetics Tools | `/natureos/genetics` | Microscope | ALL |
| 16 | Lab Tools | `/natureos/lab-tools` | FlaskConical | ALL |
| 17 | Data Explorer | `/natureos/data-explorer` | Database | ALL |
| 18 | Simulation | `/natureos/simulation` | Cpu | ALL |
| 19 | Biotech Suite | `/natureos/biotech` | PipetteIcon | ALL |
| 20 | Reports | `/natureos/reports` | FileText | ALL |
| 21 | Smell Training | `/natureos/smell-training` | Activity | ALL |
| 22 | WiFiSense | `/natureos/wifisense` | Wifi | ALL |

#### Development (4 items, default: collapsed)
| # | Title | Route | Icon | Access |
|---|-------|-------|------|--------|
| 23 | API Gateway | `/natureos/api` | Code | ALL |
| 24 | Functions | `/natureos/functions` | Binary | ALL |
| 25 | SDK | `/natureos/sdk` | Braces | ALL |
| 26 | Cloud Shell | `/natureos/shell` | Terminal | ALL |

#### Infrastructure (10 items, default: collapsed)
| # | Title | Route | Icon | Access |
|---|-------|-------|------|--------|
| 27 | Device Network | `/natureos/devices` | Network | COMPANY |
| 28 | MycoBrain Console | `/natureos/mycobrain` | Cpu | COMPANY |
| 29 | SporeBase Monitor | `/natureos/sporebase` | Droplets | COMPANY |
| 30 | FCI Monitor | `/natureos/fci` | Brain | COMPANY |
| 31 | CREP Dashboard | `/natureos/crep` | Activity | ALL |
| 32 | FUSARIUM | `/natureos/fusarium` | Shield | COMPANY |
| 33 | MINDEX | `/natureos/mindex` | Database | COMPANY |
| 34 | Storage | `/natureos/storage` | Layers | COMPANY |
| 35 | Containers | `/natureos/containers` | Boxes | COMPANY |
| 36 | Monitoring | `/natureos/monitoring` | Activity | COMPANY |

#### Platform (3 items, default: collapsed)
| # | Title | Route | Icon | Access |
|---|-------|-------|------|--------|
| 37 | Cloud Services | `/natureos/cloud` | Cloud | COMPANY |
| 38 | Integration Hub | `/natureos/integrations` | Layers | COMPANY |
| 39 | Settings | `/natureos/settings` | Settings | ALL |

### Dashboard Main Content (NatureOSWelcome)

#### Devices & Fleet Section (4 stat cards)
| Card | Data Source | Format |
|------|------------|--------|
| Total Devices | `fleetHealth.total_devices` | Integer |
| Online Now | `onlineCount` (from device registry) | Integer (emerald-500) |
| Fleet Uptime | `fleetHealth.uptime_pct` | Percentage |
| Last Update | `fleetHealth.timestamp` | Locale date string |

#### Nature & Species Section (4 stat cards + MINDEX link)
| Card | Data Source | Format |
|------|------------|--------|
| Total Species | `mindexStats.total_taxa` | Localized number (cyan-500) |
| Observations | `mindexStats.total_observations` | Localized number |
| Genomes | `mindexStats.genome_records` | Localized number |
| With Images | `mindexStats.observations_with_images` | Localized number |

#### Quick Actions (7 buttons)
| Button | Route | Description |
|--------|-------|-------------|
| Device Registry | `/natureos/devices/registry` | View all devices |
| Telemetry Dashboard | `/natureos/devices/telemetry` | Live signals |
| Alert Center | `/natureos/devices/alerts` | Triage issues |
| Device Map | `/natureos/devices/map` | Geospatial view |
| Fleet Management | `/natureos/devices/fleet` | Groups & firmware |
| Insights | `/natureos/devices/insights` | Analytics summary |
| MINDEX Explorer | `/natureos/mindex` | Species & biodiversity |

### API Endpoints (polled by NatureOSWelcome)
| Endpoint | Refresh | Purpose |
|----------|---------|---------|
| `/api/iot/insights/fleet-health` | 30s | Fleet health stats |
| `/api/devices/network?include_offline=true` | 30s | Device registry list |
| `/api/natureos/mindex/stats` | 30s | MINDEX species/genome stats |

## Core Actions

### Action 1: Navigate sidebar sections
1. Locate the sidebar on the left (desktop: always visible; mobile: tap SidebarTrigger)
2. Sidebar contains 6 collapsible sections: Apps, AI, Tools, Development, Infrastructure, Platform
3. Click any item to navigate to its route
4. Active item is highlighted; its section auto-expands on load

### Action 2: Expand/collapse sidebar sections
1. Each section header shows a chevron icon (ChevronDown when expanded, ChevronRight when collapsed)
2. Click the section title row to toggle expand/collapse
3. Default state: Apps and AI are open; Tools, Development, Infrastructure, Platform are collapsed
4. Sections with an active route item auto-expand regardless of default

### Action 3: Access Apps section tools
1. Apps section is open by default with 10 items
2. Includes core tools: Overview, Nature Statistics, Fungi Compute, Earth Simulator, Petri Dish Simulator, Compound Analyzer, Ancestry Database
3. COMPANY-only items (hidden for non-company users): Mushroom Simulator, Spore Tracker, Growth Analytics
4. Note: Ancestry Database links to `/ancestry` (outside `/natureos` path)

### Action 4: Access Development tools
1. Expand the Development section (collapsed by default)
2. Contains 4 items: API Gateway, Functions, SDK, Cloud Shell
3. All items are available to any authenticated user (no COMPANY restriction)

### Action 5: Access Infrastructure (COMPANY-only)
1. Expand the Infrastructure section (collapsed by default)
2. 9 of 10 items require COMPANY access: Device Network, MycoBrain Console, SporeBase Monitor, FCI Monitor, FUSARIUM, MINDEX, Storage, Containers, Monitoring
3. Only CREP Dashboard is available to all authenticated users
4. Non-company users see only CREP Dashboard in this section
5. The section is hidden entirely if no items are visible (but CREP Dashboard keeps it visible for all users)

## Common Failure Modes

### Authentication required
- **Symptom**: Redirect to login page or gate screen when navigating to `/natureos`
- **Cause**: User is not authenticated; `AutoGateWrapper` in the layout enforces auth
- **Fix**: Log in first, then navigate to `/natureos`

### Sidebar collapsed on mobile
- **Symptom**: No sidebar visible; only main content area shown
- **Cause**: `SidebarProvider defaultOpen={false}` starts sidebar closed on mobile
- **Fix**: Tap the SidebarTrigger button (hamburger icon) to open the sidebar overlay (Sheet mode)
- **Note**: On tablet (sm-lg breakpoints), a secondary trigger bar appears at the top with "Toggle Menu" label

### COMPANY-only sections hidden
- **Symptom**: Infrastructure items missing, AI Studio not visible, certain Apps items absent
- **Cause**: Items with `companyOnly: true` are filtered out for non-company users via `useGateAccess(AccessGate.COMPANY)`
- **Fix**: Requires company-level access; cannot be bypassed by regular authenticated users
- **Affected items**: 16 of 39 items are COMPANY-only (Mushroom Simulator, Spore Tracker, Growth Analytics, Myca AI Studio, Workflows, Device Network, MycoBrain Console, SporeBase Monitor, FCI Monitor, FUSARIUM, MINDEX, Storage, Containers, Monitoring, Cloud Services, Integration Hub)

### Fleet health data not loading
- **Symptom**: Stat cards show "0" or "--" values
- **Cause**: API endpoints (`/api/iot/insights/fleet-health`, `/api/devices/network`, `/api/natureos/mindex/stats`) failing or returning errors
- **Fix**: Check API server health; data auto-refreshes every 30 seconds via SWR

### Section appears empty
- **Symptom**: A sidebar section heading is visible but contains no items
- **Cause**: All items in that section are `companyOnly` and user lacks COMPANY access
- **Fix**: The code hides sections with zero visible items (`visibleItems.length === 0` returns null), so this should not normally occur

## Composability
- **Sidebar nav** (`DashboardNav`) is shared across all `/natureos/*` routes via `NatureOSLayoutClient`
- **DashboardShell** and **DashboardHeader** are reused by sub-pages for consistent layout
- **DashboardHero** provides a personalized greeting; currently hardcoded as "Explorer" with `isSuperAdmin={false}`
- **NatureOSWelcome** uses SWR for real-time data polling (30s intervals) with `cache: "no-store"`
- **AutoGateWrapper** wraps all children in the layout, enforcing access control at the layout level
- **TopNav** sits above the sidebar/content split and is always visible

## Computer Use Notes
- The sidebar uses `SidebarMenuButton` with `tooltip={item.title}` — in collapsed sidebar mode, hovering shows the item title as a tooltip
- Active route detection: exact match on `pathname === item.href` OR prefix match on `pathname.startsWith(item.href + "/")`
- The layout uses `min-h-dvh` and `100dvh` units for mobile browser chrome compatibility
- Sidebar transition: `transition-all duration-300` on the flex container
- Section expand/collapse: `transition-all duration-200` with `max-h-0` / `max-h-[500px]` overflow hidden
- Background color: `bg-[#0A1929]` (dark navy), text: `text-white`

## Iteration Log
- **v1** (2026-03-31): Initial skill document created from source analysis of nav.tsx (39 sidebar items across 6 sections), page.tsx, natureos-welcome.tsx, header.tsx, shell.tsx, layout.tsx, and NatureOSLayoutClient.tsx.
