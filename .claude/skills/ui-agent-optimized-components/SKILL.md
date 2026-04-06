---
description: Specification for agent-friendly component patterns including loading states, route confirmation, tool states, live regions, and modal accessibility attributes.
---

# UI Agent-Optimized Components

## Identity
- **Category**: ui
- **Access Tier**: N/A (development specification)
- **Depends On**: ui-semantic-labels, ui-data-testid-map
- **Route**: N/A (cross-cutting concern)
- **Key Components**: All async components, page containers, tool viewports, modals, and dynamic content regions

## Success Criteria (Eval)
- [ ] All async/lazy-loaded components have `data-loading="true/false"` attributes
- [ ] Page containers have `data-route="/current/path"` for route confirmation
- [ ] Tool viewports have `data-tool-state="loading|ready|error"` attributes
- [ ] Dynamic content regions use `aria-live="polite"` for update announcements
- [ ] All modals have `role="dialog"` and `aria-modal="true"`
- [ ] Loading skeletons have `aria-busy="true"` during load

## Navigation Path (Computer Use)
1. This is a development specification -- no runtime navigation needed
2. Apply attributes during component development or as a batch update
3. Verify attributes using browser DevTools or Computer Use agent testing

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Lazy-loaded components (tools, dashboards) | Main content area | Add `data-loading` attribute to wrapper |
| Page containers | Root of each route | Add `data-route` attribute |
| Tool viewports | Content area for each tool | Add `data-tool-state` attribute |
| Dynamic content panels (stats, metrics, alerts) | Various dashboard locations | Add `aria-live="polite"` |
| Modal dialogs | Center overlay | Add `role="dialog"`, `aria-modal="true"` |
| Loading skeletons/spinners | During component load | Add `aria-busy="true"` |
| Error states | When component fails to load | Set `data-tool-state="error"` |

## Core Actions
### Action 1: Add data-loading to async components
**Goal:** Allow agents to detect when lazy-loaded content is still loading vs. ready
1. Identify all lazy-loaded components (React.lazy, dynamic imports, Suspense boundaries)
2. Add `data-loading="true"` to the wrapper element during loading
3. Change to `data-loading="false"` when content has rendered
4. Components to modify:
   - LazyEarthSimulator wrapper
   - LazyCREPDashboard wrapper
   - LazyPetriDish wrapper
   - LazyCompoundSimulator wrapper
   - LazyTopologyViewer wrapper
   - LazyGrowthAnalytics wrapper
   - LazySpeciesExplorer wrapper
   - LazyAncestryExplorer wrapper
   - LazyMINDEXDatabase wrapper
   - LazyFUSARIUM wrapper
   - LazySOCDashboard wrapper
   - LazyMonitoringDashboard wrapper
   - LazyStorageDashboard wrapper
   - LazySporeBaseMonitor wrapper
   - LazyGroundStation wrapper
   - All other lazy-loaded tool components
5. Implementation pattern:
   - Suspense fallback renders with `data-loading="true"`
   - Loaded component renders with `data-loading="false"`

### Action 2: Add data-route to page containers
**Goal:** Allow agents to confirm they have navigated to the correct route
1. Identify the root container element for each page/route
2. Add `data-route` with the current route path as the value
3. Routes to tag:
   - `data-route="/natureos"` -- NatureOS dashboard
   - `data-route="/natureos/tools/earth-simulator"` -- Earth Simulator
   - `data-route="/natureos/defense/crep"` -- CREP Dashboard
   - `data-route="/natureos/defense/oei"` -- OEI Monitoring
   - `data-route="/natureos/defense/fusarium"` -- FUSARIUM
   - `data-route="/natureos/defense/soc"` -- SOC Dashboard
   - `data-route="/natureos/mas/topology"` -- MAS Topology
   - `data-route="/natureos/mas"` -- MAS Agent Management
   - `data-route="/natureos/monitoring"` -- Monitoring
   - `data-route="/natureos/storage"` -- Storage
   - `data-route="/natureos/sporebase"` -- SporeBase
   - `data-route="/natureos/ground-station"` -- Ground Station
   - `data-route="/natureos/lab/petri-dish"` -- Petri Dish
   - `data-route="/natureos/lab/growth-analytics"` -- Growth Analytics
   - `data-route="/natureos/lab/compound-simulator"` -- Compound Simulator
   - `data-route="/natureos/science/species-explorer"` -- Species Explorer
   - `data-route="/natureos/science/mindex"` -- MINDEX Database
   - `data-route="/natureos/science/ancestry"` -- Ancestry Explorer
   - All other page routes
4. Implementation: read route from Next.js `usePathname()` hook and apply to container

### Action 3: Add data-tool-state to tool viewports
**Goal:** Allow agents to know when a tool is loading, ready, or in error state
1. Identify the tool-viewport wrapper component
2. Add `data-tool-state` with one of three values:
   - `"loading"` -- tool content is initializing (Suspense fallback, API fetching)
   - `"ready"` -- tool is fully loaded and interactive
   - `"error"` -- tool failed to load or encountered a runtime error
3. Apply to every tool viewport:
   - Earth Simulator viewport: `data-tool-state`
   - CREP Dashboard viewport: `data-tool-state`
   - MAS Topology viewport: `data-tool-state`
   - All other tool viewports
4. State transitions:
   - Initial render: `"loading"`
   - Lazy component loaded + initial data fetched: `"ready"`
   - Error boundary caught: `"error"`

### Action 4: Add aria-live regions for dynamic content
**Goal:** Announce dynamic content updates to agents and screen readers
1. Identify all content areas that update without page navigation:
   - Real-time metrics panels (CPU, memory, latency displays)
   - Alert feeds (OEI alerts, AlertManager alerts)
   - Agent status updates in MAS views
   - Telemetry data streams
   - Chat message containers (MYCA chat)
   - Notification areas
2. Add `aria-live="polite"` to these container elements
3. Use `aria-live="assertive"` only for critical alerts that need immediate attention
4. Ensure updates are meaningful -- do not announce every metric tick, only significant changes

### Action 5: Add modal and loading accessibility attributes
**Goal:** Make modals and loading states detectable by agents
1. All modal dialogs must have:
   - `role="dialog"`
   - `aria-modal="true"`
   - `aria-labelledby` pointing to the modal title element
   - Focus trapped within the modal when open
2. Modals to update:
   - Agent spawn modal
   - Device registration modal
   - Confirmation dialogs (delete, flush cache, etc.)
   - Report preview modal
   - Alert detail modal
   - Settings/configuration modals
3. Loading skeletons and spinners must have:
   - `aria-busy="true"` on the container during load
   - `aria-busy="false"` (or remove attribute) when content loads
   - Optional: `aria-label="Loading [component name]"` on skeleton elements

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Agent interacts with loading skeleton | `data-loading` or `aria-busy` not checked before interaction | Agent should wait for `data-loading="false"` before proceeding |
| Agent on wrong page but does not detect it | `data-route` not applied to page container | Add `data-route` attribute; agent should check route after navigation |
| Agent clicks behind a modal | Modal lacks `aria-modal="true"` or focus trap | Add proper modal attributes and focus management |
| Agent misses dynamic content update | `aria-live` region not configured | Add `aria-live="polite"` to the updating container |
| Tool state shows `ready` but content is still loading | State set too early (before async data fetch) | Delay `"ready"` state until both component AND initial data are loaded |

## Composability
- **Prerequisite skills**: ui-semantic-labels (aria-labels must be in place), ui-data-testid-map (testids for element selection)
- **Next skills**: Any tool-specific skill (all tools benefit from these optimizations)

## Computer Use Notes
- These attributes are the foundation for reliable Computer Use agent interaction
- Agent workflow: check `data-route` -> wait for `data-loading="false"` -> check `data-tool-state="ready"` -> interact
- `aria-live` regions should be used sparingly to avoid notification overload
- `data-tool-state` is the single source of truth for whether a tool is interactive
- Modals with `aria-modal="true"` signal that the agent should interact only within the modal
- `aria-busy="true"` on loading skeletons tells agents to wait before attempting interaction
- These patterns work alongside `data-testid` and `aria-label` for a complete agent interaction model

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
