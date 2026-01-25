# Agent Topology System - Technical Documentation

**Date**: 2026-01-25  
**Version**: 2.0 (MVP/Draft)  
**Status**: Needs Redesign  
**Author**: Cursor Agent for Morgan

---

## Table of Contents

1. [System Overview](#system-overview)
2. [File Architecture](#file-architecture)
3. [Backend API](#backend-api)
4. [Frontend Components](#frontend-components)
5. [Data Types](#data-types)
6. [Current Limitations](#current-limitations)
7. [Required Improvements](#required-improvements)
8. [Integration Points](#integration-points)

---

## System Overview

### What It Is

The Agent Topology System is a 3D visualization of the Multi-Agent System (MAS) using Three.js and React Three Fiber. It displays:

- **Nodes**: Agents, services, databases, integrations, workflows, queues, and users
- **Connections**: Data flow paths between nodes
- **Packets**: Animated data flowing along connections
- **Metrics**: CPU, memory, messages/sec, uptime per node

### Current Access

**URL**: `http://localhost:3010/natureos/ai-studio` → **Topology** tab

### Technology Stack

| Layer | Technology |
|-------|------------|
| 3D Rendering | Three.js v0.171, React Three Fiber v9.4 |
| Post-processing | @react-three/postprocessing (Bloom) |
| UI Components | Shadcn UI, Tailwind CSS |
| API | Next.js API Routes |
| State | React useState/useCallback |

---

## File Architecture

```
website/
├── app/
│   └── api/
│       └── mas/
│           └── topology/
│               └── route.ts          # Backend API (315 lines)
│
├── components/
│   └── mas/
│       └── topology/
│           ├── index.ts              # Module exports
│           ├── types.ts              # TypeScript types (214 lines)
│           ├── advanced-topology-3d.tsx  # Main component (662 lines)
│           ├── topology-node.tsx     # 3D node component (228 lines)
│           ├── topology-connection.tsx   # Connection lines (275 lines)
│           └── node-detail-panel.tsx # Info popup (415 lines)
│
└── app/
    └── natureos/
        └── ai-studio/
            └── page.tsx              # Integration page
```

---

## Backend API

### File: `app/api/mas/topology/route.ts`

### GET /api/mas/topology

Returns complete topology data for 3D visualization.

**Query Parameters:**
- `packets` (optional): Set to `"false"` to exclude data packets

**Response Structure:**

```typescript
{
  nodes: TopologyNode[],      // 40 nodes currently
  connections: TopologyConnection[],  // ~65 connections
  packets: DataPacket[],      // Up to 60 packets
  stats: {
    totalNodes: number,
    activeNodes: number,
    totalConnections: number,
    activeConnections: number,
    messagesPerSecond: number,
    avgLatencyMs: number,
    systemLoad: number,
    uptimeSeconds: number
  },
  lastUpdated: string  // ISO timestamp
}
```

### Current Node Registry (40 nodes)

| Category | Nodes |
|----------|-------|
| Core | myca-orchestrator, memory-manager, task-router, scheduler-agent |
| Financial | cfo-agent, mercury-agent, stripe-agent, accounting-agent, treasury-agent |
| Communication | elevenlabs-agent, email-agent, sms-agent |
| Infrastructure | docker-agent, proxmox-agent, network-agent, unifi-agent, firewall-agent, redis-broker, website-frontend |
| Security | soc-agent, watchdog-agent, guardian-agent |
| Data | mindex-agent, etl-agent, search-agent, analytics-agent, postgres-db, qdrant-db |
| Device | mycobrain-coordinator, sensor-agent, camera-agent, environment-agent |
| Integration | n8n-agent, openai-agent, github-agent, devops-agent |
| Mycology | species-classifier, taxonomy-agent, cultivation-agent |
| User | user-morgan |

### Position Generation Algorithm

Currently uses a **simple polar coordinate system** with category-based clustering:

```typescript
// Each category gets an angle (in radians)
const categoryAngles = {
  core: 0,
  financial: Math.PI / 4,
  communication: Math.PI / 2,
  infrastructure: (3 * Math.PI) / 4,
  // ... etc
}

// Nodes positioned at radius ~12-16 from center
// with random height offset (-3 to +3)
// Orchestrator fixed at [0, 0, 0]
// User fixed at [0, 5, -8]
```

**PROBLEM**: This creates a flat, circular layout without true force-directed physics.

### Metrics Generation

**All metrics are currently RANDOM/SIMULATED:**

```typescript
function generateMetrics() {
  return {
    cpuPercent: Math.random() * 60 + 5,      // 5-65%
    memoryMb: Math.floor(Math.random() * 512 + 64),  // 64-576 MB
    tasksCompleted: Math.floor(Math.random() * 50000 + 1000),
    tasksQueued: Math.floor(Math.random() * 10),
    messagesPerSecond: Math.random() * 100 + 10,  // 10-110/s
    errorRate: Math.random() * 0.05,  // 0-5%
    uptime: Math.floor(Math.random() * 86400 * 7 + 3600),
    lastActive: new Date(Date.now() - Math.random() * 60000).toISOString(),
  }
}
```

**IMPROVEMENT NEEDED**: Connect to real MAS orchestrator at `192.168.0.188:8001`

### POST /api/mas/topology

Executes an action on a node.

**Request:**
```json
{
  "nodeId": "docker-agent",
  "action": "restart",
  "params": {}
}
```

**Actions Supported:**
- `start` - Start an agent
- `stop` - Stop an agent
- `restart` - Restart an agent
- `configure` - Open configuration
- `command` - Send direct command

**Current Status**: Actions are SIMULATED - just returns success message.

---

## Frontend Components

### 1. AdvancedTopology3D (Main Component)

**File**: `components/mas/topology/advanced-topology-3d.tsx`  
**Lines**: 662

**Props:**
```typescript
interface AdvancedTopology3DProps {
  className?: string
  fullScreen?: boolean
  onToggleFullScreen?: () => void
}
```

**State Management:**
```typescript
// View state
const [viewState, setViewState] = useState<TopologyViewState>({
  zoom: 30,
  rotation: [0, 0, 0],
  center: [0, 0, 0],
  selectedNodeId: null,
  hoveredNodeId: null,
  detailLevel: "overview",
  animationSpeed: 1,
  particleEnabled: true,
})

// Filter state
const [filter, setFilter] = useState<TopologyFilter>({
  categories: [],
  types: [],
  statuses: [],
  searchQuery: "",
  showInactive: true,
  showConnections: true,
  showLabels: true,
  showMetrics: false,
})
```

**Sub-components:**
- `CameraController` - Smooth camera animations
- `GridFloor` - Reference grid plane
- `AmbientParticles` - Atmospheric dust particles (500 points)
- `SystemStatsHUD` - Top-left metrics display
- `CategoryLegend` - Bottom-left category filter
- `ControlPanel` - Right-side controls
- `TopologyScene` - Main 3D scene container

**Data Fetching:**
```typescript
// Fetches from /api/mas/topology every 5 seconds when playing
useEffect(() => {
  if (!isPlaying) return
  const interval = setInterval(fetchData, 5000)
  return () => clearInterval(interval)
}, [isPlaying, fetchData])
```

### 2. TopologyNode3D (Node Component)

**File**: `components/mas/topology/topology-node.tsx`  
**Lines**: 228

**Features:**
- Custom GLSL shader for glow effect
- Shape based on node type (sphere, box, octahedron, cylinder, torus)
- Color based on category
- Status ring indicator
- Hover/select animations
- Billboard text labels
- HTML metrics tooltip

**Shader Code:**
```glsl
// Vertex Shader
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader
uniform vec3 glowColor;
uniform float intensity;
uniform float time;
varying vec3 vNormal;
void main() {
  float pulse = sin(time * 2.0) * 0.15 + 0.85;
  float glow = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
  gl_FragColor = vec4(glowColor, glow * intensity * pulse);
}
```

**Node Shapes:**
```typescript
const NODE_TYPE_CONFIG = {
  orchestrator: { shape: "octahedron", scale: 2.5 },
  agent: { shape: "sphere", scale: 1 },
  service: { shape: "box", scale: 1.2 },
  database: { shape: "cylinder", scale: 1.3 },
  integration: { shape: "torus", scale: 0.9 },
  user: { shape: "sphere", scale: 0.8 },
  device: { shape: "box", scale: 0.9 },
  workflow: { shape: "octahedron", scale: 1.1 },
  queue: { shape: "cylinder", scale: 0.8 },
}
```

### 3. TopologyConnection3D (Connection Component)

**File**: `components/mas/topology/topology-connection.tsx`  
**Lines**: 275

**Features:**
- Quadratic bezier curves between nodes
- Dashed line animation
- Additive blend glow effect
- Data packet particles traveling along path
- Bidirectional support (dual lines)
- Connection type coloring

**Particle Animation:**
```typescript
useFrame((_, delta) => {
  progressRef.current += delta * animationSpeed * (0.3 + connection.intensity * 0.5)
  if (progressRef.current >= 1) progressRef.current = 0
  
  const t = progressRef.current
  // Quadratic bezier interpolation
  pos.x = (1 - t) * (1 - t) * sourcePos.x + 2 * (1 - t) * t * midPoint.x + t * t * targetPos.x
  // ... y, z
})
```

**Connection Colors:**
```typescript
const CONNECTION_COLORS = {
  data: "#22c55e",      // Green
  message: "#3b82f6",   // Blue
  command: "#f97316",   // Orange
  query: "#14b8a6",     // Teal
  stream: "#8b5cf6",    // Purple
  sync: "#eab308",      // Yellow
}
```

### 4. NodeDetailPanel (Info Popup)

**File**: `components/mas/topology/node-detail-panel.tsx`  
**Lines**: 415

**Tabs:**
1. **Overview** - Description, quick stats (CPU, RAM, uptime, msgs/s), task stats
2. **Metrics** - Detailed gauges with progress bars
3. **Connections** - List of connected nodes with traffic stats
4. **Terminal** - Simulated terminal for commands

**Action Buttons:**
- Start/Stop/Restart (conditional on node capabilities)
- Configure (opens settings)

---

## Data Types

### File: `components/mas/topology/types.ts`

### NodeType
```typescript
type NodeType = 
  | "orchestrator" | "agent" | "service" | "database"
  | "integration" | "user" | "device" | "workflow" | "queue"
```

### NodeCategory
```typescript
type NodeCategory =
  | "core" | "financial" | "mycology" | "research" | "dao"
  | "communication" | "data" | "infrastructure" | "simulation"
  | "security" | "integration" | "device" | "chemistry" | "nlm"
```

### NodeStatus
```typescript
type NodeStatus = 
  | "active" | "busy" | "idle" | "offline" | "error" | "starting" | "stopping"
```

### ConnectionType
```typescript
type ConnectionType =
  | "data" | "message" | "command" | "query" | "stream" | "sync"
```

### TopologyNode (Full Interface)
```typescript
interface TopologyNode {
  id: string
  name: string
  shortName: string
  type: NodeType
  category: NodeCategory
  status: NodeStatus
  description: string
  position: [number, number, number]
  metrics: {
    cpuPercent: number
    memoryMb: number
    tasksCompleted: number
    tasksQueued: number
    messagesPerSecond: number
    errorRate: number
    uptime: number
    lastActive: string
  }
  connections: string[]
  size: number
  priority: number
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  canConfigure: boolean
}
```

---

## Current Limitations

### Visual Design Issues

1. **Layout is Too Flat**
   - Simple polar coordinates, not force-directed
   - Nodes don't respond to connections
   - No hierarchical structure visible
   - All nodes roughly same distance from center

2. **Connections are Basic**
   - Simple bezier curves, no routing
   - Overlapping lines create visual noise
   - No bundling of parallel connections
   - Hard to trace paths visually

3. **Scale Problems**
   - 40 nodes creates clutter
   - 223 full agents would be overwhelming
   - No level-of-detail system
   - Can't zoom into sub-systems

4. **Animation Limitations**
   - Particles are simple spheres
   - No differentiation between packet types
   - Fixed animation speeds per connection
   - No real-time data correlation

5. **Interactivity Issues**
   - Click detection can be finicky
   - No drag-and-drop for layout
   - Can't manually position nodes
   - Limited keyboard navigation

### Backend Issues

1. **All Data is Simulated**
   - No connection to real MAS orchestrator
   - Metrics are random numbers
   - Status doesn't reflect reality
   - Packets are generated, not captured

2. **Static Node Registry**
   - Hardcoded 40 nodes
   - Doesn't reflect true 223 agents
   - No dynamic discovery
   - No WebSocket for live updates

3. **No Real Actions**
   - Start/stop/restart are simulated
   - Commands don't execute
   - No feedback from actual systems

---

## Required Improvements

### Phase 1: Visual Overhaul

#### 1.1 Force-Directed Layout
- Implement D3-force or custom physics
- Nodes repel each other
- Connections act as springs
- Hierarchical layers (user → orchestrator → agents → services)
- Stable equilibrium positions

#### 1.2 Hierarchical Levels
- **Level 0**: User (Morgan) at top
- **Level 1**: Orchestrator (MYCA) 
- **Level 2**: Category hubs (Core, Financial, Security, etc.)
- **Level 3**: Individual agents within categories
- **Level 4**: Services, databases, integrations

#### 1.3 Connection Improvements
- Edge bundling for cleaner visuals
- Curved routing to avoid overlaps
- Arrow indicators for direction
- Animated pulses showing data direction
- Thickness based on traffic volume
- Color gradients for latency

#### 1.4 Node Visual Improvements
- Custom 3D models instead of primitives
- Icons inside nodes
- Real-time activity indicators
- Error/warning halos
- Group containers for categories

#### 1.5 Level of Detail
- Overview mode: Category clusters only
- Category mode: Agents within selected category
- Detail mode: Single agent with all connections
- Smooth transitions between levels

### Phase 2: Real Data Integration

#### 2.1 MAS Orchestrator Connection
- Connect to `http://192.168.0.188:8001`
- Real agent status from Docker
- Actual CPU/memory metrics
- Live message passing data

#### 2.2 WebSocket Real-time Updates
- Persistent connection for live data
- Push-based status changes
- Real packet visualization
- Instant error notifications

#### 2.3 Proper Actions
- Actually start/stop containers
- Execute real commands
- Live log streaming
- Configuration editing

### Phase 3: Operational Controls

#### 3.1 Agent Management
- Deploy new agents from UI
- Clone agent configurations
- Scale agent instances
- View and edit environment variables

#### 3.2 Workflow Integration
- Trigger n8n workflows from nodes
- Visualize workflow execution paths
- Show workflow status on nodes

#### 3.3 Incident Integration
- Link to Security Incident system
- Show affected nodes during incidents
- Trace attack paths visually

### Phase 4: Advanced Visualizations

#### 4.1 Data Flow Traces
- Click to trace data path
- Highlight route user → orchestrator → agent → database
- Show latency at each hop
- Bottleneck identification

#### 4.2 Time-based Views
- Historical playback
- Compare current vs. past states
- Anomaly highlighting
- Trend visualization

#### 4.3 Custom Layouts
- Save/load layouts
- Manual node positioning
- Category arrangement presets
- Focus views for different roles

---

## Integration Points

### Current Integrations

| System | Status | Notes |
|--------|--------|-------|
| MAS Orchestrator | Simulated | Should connect to 192.168.0.188:8001 |
| Redis | Not connected | Shown as node only |
| PostgreSQL | Not connected | Shown as node only |
| n8n | Not connected | Should show workflow status |
| Docker | Not connected | Should show container status |

### Required API Endpoints (MAS Orchestrator)

```
GET  /topology           - Full topology data
GET  /agents             - All agent status
GET  /agents/:id         - Single agent details
GET  /agents/:id/metrics - Real metrics
POST /agents/:id/start   - Start agent
POST /agents/:id/stop    - Stop agent
POST /agents/:id/restart - Restart agent
WS   /topology/stream    - Real-time updates
```

### Required Database Tables

```sql
-- For historical data
CREATE TABLE topology_snapshots (
  id UUID PRIMARY KEY,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For saved layouts
CREATE TABLE topology_layouts (
  id UUID PRIMARY KEY,
  name TEXT,
  user_id UUID,
  positions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Summary for Redesign

### What Works
- Basic 3D rendering with Three.js
- Node selection and detail panel
- Category filtering
- Animation system foundation
- Control panel structure

### What Needs Complete Redesign
1. **Layout Algorithm** - Replace polar with force-directed
2. **Visual Design** - More sophisticated node/connection rendering
3. **Data Source** - Connect to real MAS instead of simulation
4. **Interactivity** - Path tracing, drag-drop, keyboard nav
5. **Level of Detail** - Hierarchical zoom system
6. **Real-time** - WebSocket instead of polling

### Recommended Approach
1. Create detailed visual mockups/designs first
2. Specify exact interaction flows
3. Build layout engine separately
4. Implement real data layer
5. Add advanced visualizations incrementally

---

*This document captures the current implementation state for planning the redesign.*

*Last Updated: 2026-01-25*
