# MAS Topology Visualization v2.1 - Feature Documentation

**Date:** January 26, 2026  
**Version:** 2.1  
**Status:** Implemented and Tested

## Overview

The MAS Topology Visualization v2.1 is a comprehensive 3D command center for visualizing and managing the Mycosoft Multi-Agent System (MAS). This document covers all implemented features, including the latest UI improvements and integrations.

## Core Features

### 1. 3D Agent Topology Visualization
- **247 agents** displayed across **14 categories**
- Force-directed layout using Cytoscape.js for natural node positioning
- Real-time WebSocket updates (with graceful fallback to polling)
- Interactive 3D navigation using Three.js and React Three Fiber

### 2. Agent Categories
- Core, Financial, Mycology, Research, DAO
- Communication, Data, Infrastructure, Simulation
- Security, Integration, Device, Chemistry, NLM

## New Feature Integrations (January 26, 2026)

### Grafana-Style Time-Series Charts (MetricsChart)

**Location:** `components/mas/topology/metrics-chart.tsx`

**Features:**
- Real-time CPU, Memory, Messages/sec, and Error Rate metrics
- Mini sparkline charts for quick trend visualization
- Full-size interactive line charts with tooltips
- Trend indicators (up/down/stable with percentage change)
- Auto-refresh every 30 seconds
- Historical data simulation with seeded randomness for consistency

**Usage:**
```tsx
import { MetricsChart } from "@/components/mas/topology/metrics-chart"

<MetricsChart node={selectedNode} />
```

### Metabase-Style Natural Language Query (AgentQuery)

**Location:** `components/mas/topology/agent-query.tsx`

**Supported Queries:**
- "agents with high cpu" / "high memory"
- "show all [status] agents" (active, idle, error, offline)
- "[category] agents" (e.g., "financial agents", "dao agents")
- "agents connected to [node name]"
- "system stats" / "status"
- "top 5 agents by cpu" / "top 10 agents by memory"
- "search [query]" / "find [query]"

**Features:**
- AI-style processing animation
- Result highlighting with node count
- Click-to-select nodes from results
- Highlight multiple nodes in the 3D view
- Example queries panel
- Closable panel with toggle button

### Serial-Studio Inspired Telemetry Widgets (TelemetryWidgets)

**Location:** `components/mas/topology/telemetry-widgets.tsx`

**Features:**
- Circular gauge displays for CPU, Health, and Errors
- LED status indicators for System OK, Agents Active, Error Level, Data Flow
- Status bars for Active Agents, Memory, and Messages/sec
- Category-level statistics with progress bars
- Node-specific telemetry when an agent is selected
- Collapsible and closable panel

### Custom Layout Save/Load (LayoutManager)

**Location:** `components/mas/topology/layout-manager.tsx`

**Features:**
- Save current view state as named layouts
- Store layouts in localStorage (persists across sessions)
- Set a default layout to auto-load on page open
- Mark layouts as favorites for quick access
- Export layouts as JSON file
- Import layouts from JSON file
- Delete and manage saved layouts
- Layout includes: zoom level, animation speed, filters, display options

## UI Improvements (January 26, 2026)

### Widget Improvements
1. **Closable Panels:** All floating panels (AgentQuery, TelemetryWidgets) now have close buttons
2. **Toggle Buttons:** When closed, a small button appears to reopen the panel
3. **Max Height Constraints:** Panels are constrained to 50-60% viewport height
4. **Scroll Support:** Long content scrolls within the panel
5. **Overflow Prevention:** Main container has `overflow-hidden` to prevent page scrolling issues

### Fixed Issues
- Widgets no longer go off-screen
- Page scrolling up/down issue resolved
- Better z-index layering for overlapping elements
- Improved positioning for right-side widgets

## File Structure

```
components/mas/topology/
├── advanced-topology-3d.tsx     # Main 3D visualization component
├── agent-query.tsx              # Natural language query interface
├── agent-registry.ts            # Complete agent definitions (247 agents)
├── agent-spawner.tsx            # Agent spawning from templates
├── cytoscape-layout.tsx         # Force-directed layout engine
├── incident-overlay.tsx         # Security incident visualization
├── index.ts                     # Module exports
├── layout-manager.tsx           # Custom layout save/load
├── lod-system.tsx               # Level-of-detail rendering
├── metrics-chart.tsx            # Grafana-style time-series charts
├── node-detail-panel.tsx        # Agent details popup
├── path-tracer.tsx              # Path finding visualization
├── telemetry-widgets.tsx        # Serial-Studio style widgets
├── timeline-player.tsx          # Historical playback
├── topology-connection.tsx      # 3D connection rendering
├── topology-node.tsx            # 3D node rendering
├── types.ts                     # TypeScript type definitions
└── use-topology-websocket.ts    # WebSocket/SSE data hooks
```

## Environment Variables

```env
# MAS API Configuration
MAS_API_URL=http://192.168.0.188:8001
NEXT_PUBLIC_MAS_API_URL=http://192.168.0.188:8001

# WebSocket Configuration (optional, defaults to true)
NEXT_PUBLIC_MAS_WS_URL=ws://192.168.0.188:8001/ws/topology
NEXT_PUBLIC_MAS_WS_ENABLED=true

# SSE Log Stream Configuration (optional, defaults to true)
NEXT_PUBLIC_MAS_SSE_URL=http://192.168.0.188:8001/stream/logs
NEXT_PUBLIC_MAS_SSE_ENABLED=true
```

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mas/agents` | GET | List all agents |
| `/api/mas/topology` | GET | Get topology data |
| `/api/mas/stats` | GET | System statistics |
| `/api/mas/incidents` | GET | Active incidents |
| `/api/mas/gaps` | GET | Detected gaps |
| `/api/mas/agents/{id}/action` | POST | Execute agent action |

## Usage

### Accessing the Topology

1. **Embedded View:** Navigate to `/natureos/mas` and select the "Topology" tab
2. **Fullscreen View:** Click "Fullscreen" button or navigate to `/natureos/mas/topology`

### Controls

- **Mouse Drag:** Rotate the 3D view
- **Scroll:** Zoom in/out
- **Click Agent:** Open detail panel
- **Category Buttons:** Filter by agent category
- **Search Box:** Find agents by name or ID

### Saving Layouts

1. Configure your preferred view (zoom, filters, display options)
2. Click "Layouts" button
3. Click the "+" icon
4. Enter a name and optional description
5. Click "Save Layout"

### Loading Layouts

1. Click "Layouts" button
2. Click on any saved layout to apply it
3. Use the menu icon for additional options (favorite, set as default, delete)

## Testing Results

| Feature | Status | Notes |
|---------|--------|-------|
| 3D Visualization | ✅ Passed | 247 agents rendered correctly |
| System Metrics | ✅ Passed | Real-time updates working |
| Ask MYCA Query | ✅ Passed | All query patterns functional |
| Telemetry Widgets | ✅ Passed | Gauges and LEDs display correctly |
| Layout Manager | ✅ Passed | Save/load/export working |
| Close Buttons | ✅ Passed | All panels closable |
| Overflow Fixed | ✅ Passed | No page scrolling issues |

## Known Limitations

1. **WebSocket:** Falls back to polling when MAS API is unavailable
2. **Historical Data:** Currently simulated; will use real data when available
3. **AI Query:** Pattern-based matching; future version will use LLM
4. **Layout Positions:** Custom node positions not yet saved (layout state only)

## Future Enhancements

1. Drag-and-drop widget positioning
2. Resizable widget panels
3. Custom dashboard builder
4. Real AI-powered natural language queries
5. Historical data from time-series database
6. Collaborative layout sharing

---

**Author:** MYCA Development Team  
**Last Updated:** January 26, 2026
