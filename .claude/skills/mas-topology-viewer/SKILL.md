---
description: Visualize and interact with the 227-agent MAS topology in 3D using Three.js/React Three Fiber at mycosoft.com/natureos/mas/topology.
---

# MAS Topology Viewer

## Identity
- **Category**: mas
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Route**: /natureos/mas/topology
- **Key Components**: app/natureos/mas/topology/page.tsx, components/natureos/mas-topology-canvas.tsx, components/natureos/compact-stats-bar.tsx, components/natureos/topology-left-panel.tsx, components/natureos/topology-right-panel.tsx, components/natureos/topology-bottom-bar.tsx
- **Reference**: docs/MAS_TOPOLOGY_V2.2_REDESIGN_JAN26_2026.md

## Success Criteria (Eval)
- [ ] 3D topology canvas renders with visible agent nodes and connection edges using Three.js/React Three Fiber
- [ ] CompactStatsBar displays active/total nodes, messages/sec, latency, and system load
- [ ] Left panel category filters (14 categories) toggle agent visibility by category with distinct colors
- [ ] MYCA natural language query bar in bottom control bar accepts and processes queries
- [ ] Right panel shows system health gauges (CPU, Memory, Health%) and category breakdown

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "MAS" section
5. Click "Topology" or "Topology Viewer"
6. Wait for 3D canvas to initialize -- spinning/orbiting view of agent nodes connected by edges appears
7. The view has: stats bar (top center), left panel, right panel, bottom control bar

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| 3D canvas with agent nodes and edges | Center, fills most of viewport | Click-drag to rotate, scroll to zoom, right-drag to pan (OrbitControls) |
| CompactStatsBar (active/total, msg/sec, latency, load) | Top center, horizontal bar | Read-only real-time stats overview |
| Left panel (collapsible) | Left side of screen | Search agents, filter by 14 categories, view security incidents, toggle display options |
| Search input field | Top of left panel | Type agent name to search and highlight in 3D view |
| 14 category filter buttons with colors | Left panel, below search | Click to toggle visibility of agent categories (core, financial, mycology, etc.) |
| Security incidents list | Left panel, below filters | Shows recent security events affecting agents |
| Display toggles (labels, edges, etc.) | Left panel, bottom area | Toggle visual elements on/off |
| Right panel (collapsible) | Right side of screen | System health gauges, status LEDs, category breakdown, node details |
| CPU gauge | Right panel, top section | Circular gauge showing CPU utilization percentage |
| Memory gauge | Right panel, top section | Circular gauge showing memory utilization percentage |
| Health% gauge | Right panel, top section | Circular gauge showing overall system health score |
| Status LEDs | Right panel | Colored LED indicators for subsystem status |
| Category breakdown | Right panel, middle | Lists agent counts per category |
| Node details | Right panel, bottom | Shows details when a specific node is selected |
| Bottom control bar | Bottom of screen, full width | Action buttons and MYCA query bar |
| Path Tracer button | Bottom bar, left area | Click to activate path tracing between agents |
| Spawn Agent button | Bottom bar, left area | Click to open agent spawn modal |
| Timeline button | Bottom bar, left area | Click to open historical timeline view |
| MYCA query bar | Bottom bar, center | Natural language input for topology queries |
| Connection status indicator | Bottom bar, right area | Shows WebSocket connection state |
| Play/Pause button | Bottom bar, right area | Toggle real-time updates |
| Refresh button | Bottom bar, right area | Force refresh topology data |
| Fullscreen button | Bottom bar, right area | Toggle fullscreen mode |

## Core Actions
### Action 1: Explore the 3D topology
**Goal:** Navigate the 3D view to understand agent relationships and cluster patterns
1. Wait for the 3D canvas to finish loading (nodes and edges visible, stats bar shows numbers)
2. Click and drag on the canvas to rotate the view (OrbitControls)
3. Scroll to zoom in/out -- zoom in to see individual agent labels
4. Right-click and drag to pan the view
5. Click on an individual node to select it -- right panel updates with node details
6. Connected edges to the selected node may highlight

### Action 2: Filter agents by category
**Goal:** Isolate specific agent groups using category filters
1. Open the left panel if collapsed (click expand arrow/handle on left edge)
2. Locate the 14 category filter buttons: core (10 agents), financial (12), mycology (25), research (15), DAO (40), communication, data, infrastructure, simulation, security, integration, device, chemistry, NLM
3. Each button has a distinct color matching node colors in the 3D view
4. Click a category button to toggle its visibility -- disabled categories fade or hide their nodes
5. Use multiple filters to compare relationships between specific categories

### Action 3: Query topology with MYCA
**Goal:** Use natural language to navigate and analyze the topology
1. Locate the MYCA query bar in the center of the bottom control bar
2. Click on the query bar to focus it
3. Type a query such as:
   - "Show path from X to Y" -- highlights shortest path between two agents
   - "Spawn security agent" -- opens spawn modal pre-configured for security category
   - "Find agents with high CPU" -- highlights agents exceeding CPU thresholds
   - "Show timeline" -- opens historical timeline view
4. Press Enter to execute the query
5. Results appear as visual highlights on the 3D canvas and/or panel updates

### Action 4: Trace paths between agents
**Goal:** Visualize communication paths between two specific agents
1. Click the "Path Tracer" button in the bottom control bar
2. Click on the source agent node in the 3D view (or type its name)
3. Click on the destination agent node
4. The path highlights on the canvas showing intermediate nodes and edges
5. Path details (hop count, latency per hop) appear in the right panel

### Action 5: Monitor system health
**Goal:** Check overall MAS health via right panel gauges
1. Open the right panel if collapsed
2. Review the three main gauges: CPU, Memory, Health%
3. Check status LEDs for subsystem states (green=healthy, yellow=degraded, red=critical)
4. Review the category breakdown for agent counts and per-category health
5. Note any categories with elevated error counts or degraded agents

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Black canvas with no nodes | WebGL/Three.js failed to initialize | Refresh page; ensure browser supports WebGL2 |
| Nodes visible but no edges/connections | Connection data still loading or WebSocket disconnected | Check connection status indicator in bottom bar; wait or refresh |
| CompactStatsBar shows all zeros | Data feed not connected | Check connection status indicator; refresh page |
| Left/right panels missing | Panels may be collapsed | Look for expand arrows on screen edges; click to expand |
| MYCA query returns no results | Query not recognized or no matching agents | Rephrase query; use simpler terms; check agent names in search |
| 3D view is very slow or laggy | Too many nodes rendered or GPU limitations | Use category filters to reduce visible nodes; close other GPU-heavy tabs |
| "Spawn Agent" button disabled | Insufficient permissions or system at capacity | Verify permissions; check active agent count vs. maximum |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard, platform-authentication
- **Next skills**: mas-agent-management (drill into individual agent details), mas-agent-spawn (create new agents from topology)

## Computer Use Notes
- AUTHENTICATED access required -- any logged-in user can view the topology
- 3D canvas uses Three.js with React Three Fiber -- OrbitControls for camera manipulation
- 227 total agents across 14 categories -- rendering is GPU-intensive
- WebSocket connection provides real-time updates -- check connection status LED in bottom bar
- Left and right panels are collapsible -- may start collapsed on smaller screens
- MYCA query bar supports natural language -- no special syntax required
- Voice session nodes are ephemeral -- they appear only during active voice sessions
- Fullscreen mode (F11 or fullscreen button) recommended for best visualization experience

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
