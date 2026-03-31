---
description: Comprehensive data-testid attribute map for the entire UI, providing unique testids for every key element following the section-component-action pattern.
---

# UI Data TestID Map

## Identity
- **Category**: ui
- **Access Tier**: N/A (development specification)
- **Depends On**: None (applies to all UI components)
- **Route**: N/A (cross-cutting concern)
- **Key Components**: All component files across the application

## Success Criteria (Eval)
- [ ] Every key interactive and structural element has a unique `data-testid` attribute
- [ ] TestIDs follow the pattern: `{section}-{component}-{action}`
- [ ] No duplicate testids exist across the entire application
- [ ] Computer Use and automated tests can reliably locate elements by testid
- [ ] All ~200 testids are implemented across all page sections

## Navigation Path (Computer Use)
1. This is a development specification -- no runtime navigation needed
2. Apply testids during component development or as a batch update
3. Verify testids using browser DevTools or automated test selectors

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Header dropdowns | Top header bar | Apply header-dropdown-[section] testids |
| Sidebar navigation | Left sidebar | Apply sidebar-nav-[tool] testids |
| Tool viewports | Main content area | Apply tool-viewport-[tool] testids |
| Dashboard panels | Within tool viewports | Apply [tool]-panel-[name] testids |
| Map controls | Map-based tools | Apply [tool]-[control]-[action] testids |
| Form elements | Various locations | Apply [form]-field-[name] testids |
| Modal dialogs | Overlay when triggered | Apply modal-[name]-[element] testids |
| Table rows/cells | Data tables | Apply [table]-row-[index] or [table]-cell-[column] testids |

## Core Actions
### Action 1: Apply header testids
**Goal:** Tag all header navigation elements
1. Header dropdown triggers:
   - `header-dropdown-defense` -- Defense dropdown trigger
   - `header-dropdown-science` -- Science dropdown trigger
   - `header-dropdown-lab` -- Lab tools dropdown trigger
   - `header-dropdown-devices` -- Devices dropdown trigger
   - `header-dropdown-ai` -- AI dropdown trigger
   - `header-dropdown-platform` -- Platform dropdown trigger
   - `header-dropdown-infrastructure` -- Infrastructure dropdown trigger
2. Header dropdown menu items:
   - `header-item-crep-dashboard` -- CREP Dashboard link
   - `header-item-oei-monitoring` -- OEI Monitoring link
   - `header-item-fusarium` -- FUSARIUM link
   - `header-item-soc-dashboard` -- SOC Dashboard link
   - `header-item-earth-simulator` -- Earth Simulator link
   - `header-item-petri-dish` -- Petri Dish link
   - `header-item-growth-analytics` -- Growth Analytics link
   - `header-item-compound-simulator` -- Compound Simulator link
   - `header-item-species-explorer` -- Species Explorer link
   - `header-item-mindex-database` -- MINDEX Database link
   - `header-item-ancestry-explorer` -- Ancestry Explorer link
3. Header utility elements:
   - `header-search-input` -- Global search input
   - `header-search-submit` -- Search submit button
   - `header-user-menu` -- User profile menu trigger
   - `header-notifications` -- Notifications bell icon
   - `header-natureos-link` -- NatureOS dashboard link

### Action 2: Apply sidebar testids
**Goal:** Tag all sidebar navigation elements
1. Sidebar section expanders:
   - `sidebar-section-defense` -- Defense section toggle
   - `sidebar-section-science` -- Science section toggle
   - `sidebar-section-lab` -- Lab section toggle
   - `sidebar-section-devices` -- Devices section toggle
   - `sidebar-section-ai` -- AI section toggle
   - `sidebar-section-mas` -- MAS section toggle
   - `sidebar-section-infrastructure` -- Infrastructure section toggle
2. Sidebar navigation items (examples):
   - `sidebar-nav-earth-simulator` -- Earth Simulator nav item
   - `sidebar-nav-crep-dashboard` -- CREP Dashboard nav item
   - `sidebar-nav-oei-monitoring` -- OEI Monitoring nav item
   - `sidebar-nav-fusarium` -- FUSARIUM nav item
   - `sidebar-nav-soc-dashboard` -- SOC Dashboard nav item
   - `sidebar-nav-petri-dish` -- Petri Dish nav item
   - `sidebar-nav-growth-analytics` -- Growth Analytics nav item
   - `sidebar-nav-compound-simulator` -- Compound Simulator nav item
   - `sidebar-nav-species-explorer` -- Species Explorer nav item
   - `sidebar-nav-mindex-database` -- MINDEX Database nav item
   - `sidebar-nav-ancestry-explorer` -- Ancestry Explorer nav item
   - `sidebar-nav-myca-chat` -- MYCA Chat nav item
   - `sidebar-nav-topology-viewer` -- MAS Topology Viewer nav item
   - `sidebar-nav-agent-management` -- Agent Management nav item
   - `sidebar-nav-monitoring` -- Infrastructure Monitoring nav item
   - `sidebar-nav-storage` -- Storage nav item
   - `sidebar-nav-sporebase` -- SporeBase nav item
   - `sidebar-nav-ground-station` -- Ground Station nav item
   - `sidebar-nav-device-registry` -- Device Registry nav item
   - `sidebar-nav-device-telemetry` -- Device Telemetry nav item
   - `sidebar-nav-device-fleet` -- Device Fleet nav item
   - `sidebar-nav-mycobrain-setup` -- MycoBrain Setup nav item

### Action 3: Apply tool viewport testids
**Goal:** Tag all tool viewport containers and controls
1. Tool viewport containers:
   - `tool-viewport-earth-simulator` -- Earth Simulator viewport
   - `tool-viewport-crep-dashboard` -- CREP Dashboard viewport
   - `tool-viewport-petri-dish` -- Petri Dish viewport
   - `tool-viewport-growth-analytics` -- Growth Analytics viewport
   - `tool-viewport-compound-simulator` -- Compound Simulator viewport
   - `tool-viewport-species-explorer` -- Species Explorer viewport
   - `tool-viewport-mindex-database` -- MINDEX Database viewport
   - `tool-viewport-ancestry-explorer` -- Ancestry Explorer viewport
   - `tool-viewport-topology-viewer` -- MAS Topology viewport
   - `tool-viewport-fusarium` -- FUSARIUM viewport
   - `tool-viewport-soc-dashboard` -- SOC Dashboard viewport
   - `tool-viewport-monitoring` -- Monitoring viewport
   - `tool-viewport-storage` -- Storage viewport
   - `tool-viewport-sporebase` -- SporeBase viewport
   - `tool-viewport-ground-station` -- Ground Station viewport
2. Viewport action buttons:
   - `tool-viewport-maximize-[tool]` -- Maximize button for each tool
   - `tool-viewport-minimize-[tool]` -- Minimize button for each tool
   - `tool-viewport-close-[tool]` -- Close button for each tool
   - `tool-viewport-refresh-[tool]` -- Refresh button for each tool

### Action 4: Apply tool-specific testids
**Goal:** Tag interactive elements within each tool
1. CREP Dashboard:
   - `crep-layer-toggle-fungal` -- Fungal layer toggle
   - `crep-layer-toggle-seismic` -- Seismic layer toggle
   - `crep-layer-toggle-weather` -- Weather layer toggle
   - `crep-layer-toggle-volcanic` -- Volcanic layer toggle
   - `crep-layer-toggle-transport` -- Transport layer toggle
   - `crep-event-list` -- Events list container
   - `crep-event-item-[id]` -- Individual event items
   - `crep-map-canvas` -- Map canvas element
2. Earth Simulator:
   - `earth-sim-globe-canvas` -- 3D globe canvas
   - `earth-sim-layer-panel` -- Layer control panel
   - `earth-sim-tile-info` -- Selected tile info panel
   - `earth-sim-snapshot-btn` -- Snapshot capture button
3. MAS Topology:
   - `topology-canvas-3d` -- Three.js 3D canvas
   - `topology-stats-bar` -- CompactStatsBar
   - `topology-left-panel` -- Left filter panel
   - `topology-right-panel` -- Right health panel
   - `topology-bottom-bar` -- Bottom control bar
   - `topology-myca-query` -- MYCA query input
   - `topology-btn-path-tracer` -- Path Tracer button
   - `topology-btn-spawn-agent` -- Spawn Agent button
   - `topology-btn-timeline` -- Timeline button
   - `topology-btn-play-pause` -- Play/Pause toggle
   - `topology-btn-refresh` -- Refresh button
   - `topology-btn-fullscreen` -- Fullscreen button
   - `topology-connection-status` -- Connection status indicator
   - `topology-category-filter-[name]` -- Category filter buttons (14 categories)
   - `topology-search-input` -- Agent search input
4. Monitoring:
   - `monitoring-gauge-cpu` -- CPU gauge
   - `monitoring-gauge-memory` -- Memory gauge
   - `monitoring-gauge-disk` -- Disk gauge
   - `monitoring-gauge-network` -- Network gauge
   - `monitoring-alerts-panel` -- AlertManager panel
   - `monitoring-time-range` -- Time range selector
5. Storage:
   - `storage-card-supabase` -- Supabase storage card
   - `storage-card-redis` -- Redis cache card
   - `storage-card-sqlite` -- SQLite card
   - `storage-card-postgresql` -- PostgreSQL card
   - `storage-file-browser` -- File browser container
   - `storage-cache-flush` -- Cache flush button
6. General patterns for remaining tools:
   - `[tool]-panel-[name]` -- Named panels within tools
   - `[tool]-btn-[action]` -- Action buttons within tools
   - `[tool]-input-[name]` -- Input fields within tools
   - `[tool]-table-[name]` -- Data tables within tools
   - `[tool]-status-[name]` -- Status indicators within tools

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Test selector finds no element | Testid not applied or misspelled | Check component source; verify exact testid string |
| Multiple elements match same testid | Duplicate testids exist | Search codebase for duplicates; add context to make unique |
| Testid exists but element not interactable | Element may be hidden, disabled, or overlaid | Check element visibility and state; wait for loading to complete |
| Testid pattern inconsistent | Developer used wrong naming convention | Audit and correct to match `{section}-{component}-{action}` pattern |

## Composability
- **Prerequisite skills**: None
- **Next skills**: ui-semantic-labels (add aria-labels alongside testids), ui-agent-optimized-components (add state attributes)

## Computer Use Notes
- `data-testid` attributes are invisible to end users but essential for automated interaction
- TestIDs should be stable across deployments -- do not include dynamic values (timestamps, random IDs)
- The pattern `{section}-{component}-{action}` ensures uniqueness and readability
- Approximately 200 testids cover the full application -- prioritize interactive elements first
- TestIDs complement aria-labels: use aria-labels for accessibility, testids for automation
- When both exist, Computer Use agents should prefer `data-testid` for precision

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
