# Advanced 3D Agent Topology Visualization

**Date**: 2026-01-25  
**Status**: Complete  
**Version**: 2.0

---

## Overview

A next-generation 3D visualization system for the Multi-Agent System (MAS) that provides real-time monitoring, control, and operational capabilities for all 40+ agents, services, databases, and integrations.

---

## Key Features

### 3D Visualization Engine
- **Three.js / React Three Fiber** - Hardware-accelerated 3D rendering
- **Custom GLSL Shaders** - Glow effects and pulsing animations
- **Real-time Updates** - Auto-refresh every 5 seconds
- **Post-processing** - Bloom and chromatic aberration effects

### Node Types
| Type | Shape | Description |
|------|-------|-------------|
| Orchestrator | Octahedron | MYCA central brain (largest) |
| Agent | Sphere | Individual AI agents |
| Service | Box | Running services |
| Database | Cylinder | Data stores |
| Integration | Torus | External API integrations |
| User | Sphere | Human operators |
| Workflow | Octahedron | n8n workflows |
| Queue | Cylinder | Message queues |

### Animated Data Flow
- **Particle System** - Data packets flowing along connections
- **Connection Types**: Data, Message, Command, Query, Stream, Sync
- **Traffic Visualization** - High-traffic connections show more particles
- **Bidirectional Indicators** - Dual lines for two-way communication

### Interactive Controls
- **Click Node** - Open detailed info panel
- **Hover** - Show quick metrics tooltip
- **Orbit Controls** - Rotate, zoom, pan the view
- **Full-screen Mode** - Immersive experience

---

## File Structure

```
components/mas/topology/
├── index.ts                    # Module exports
├── types.ts                    # TypeScript interfaces
├── advanced-topology-3d.tsx    # Main 3D canvas component
├── topology-node.tsx           # 3D node component
├── topology-connection.tsx     # Animated connections
└── node-detail-panel.tsx       # Info popup widget

app/api/mas/topology/
└── route.ts                    # Topology data API
```

---

## Node Categories

| Category | Color | Count | Description |
|----------|-------|-------|-------------|
| Core | Purple | 4 | Orchestrator, Memory, Router, Scheduler |
| Financial | Blue | 5 | CFO, Mercury, Stripe, Accounting, Treasury |
| Communication | Pink | 3 | Voice, Email, SMS |
| Infrastructure | Orange | 5 | Docker, Proxmox, Network, UniFi, Firewall |
| Security | Red | 3 | SOC, Watchdog, Guardian |
| Data | Teal | 4 | MINDEX, ETL, Search, Analytics |
| Device | Lime | 4 | MycoBrain, Sensors, Cameras, Environment |
| Integration | Violet | 4 | n8n, OpenAI, GitHub, DevOps |
| Mycology | Green | 3 | Species Classifier, Taxonomy, Cultivation |

---

## Control Panel Features

### Animation Controls
- **Play/Pause** - Toggle auto-refresh
- **Speed Slider** - 0.1x to 3x animation speed
- **Reset View** - Return camera to default position

### Display Toggles
- **Show Labels** - Node name labels
- **Show Metrics** - Hover tooltips with CPU/RAM
- **Show Connections** - Connection lines visibility
- **Data Particles** - Animated data flow particles
- **Show Inactive** - Include offline nodes

### Filtering
- **Search** - Filter by node name/ID
- **Category** - Click legend to toggle categories

---

## Node Detail Panel

### Overview Tab
- Status indicator
- CPU and memory gauges
- Uptime and message throughput
- Task completed/queued counts
- Error rate warnings

### Metrics Tab
- Detailed resource graphs
- Message throughput chart
- Error rate history
- Uptime tracking

### Connections Tab
- List of connected nodes
- Traffic statistics per connection
- Latency and bandwidth
- Connection type indicators

### Terminal Tab
- Agent command interface
- Quick command buttons
- Log viewer
- Configuration access

### Actions
- **Start/Stop/Restart** - Control agent lifecycle
- **Configure** - Open settings
- **Send Command** - Direct agent commands

---

## API Reference

### GET /api/mas/topology

Returns complete topology data including nodes, connections, and packets.

**Response:**
```json
{
  "nodes": [
    {
      "id": "myca-orchestrator",
      "name": "MYCA Orchestrator",
      "shortName": "MYCA",
      "type": "orchestrator",
      "category": "core",
      "status": "active",
      "position": [0, 0, 0],
      "metrics": {
        "cpuPercent": 12.5,
        "memoryMb": 256,
        "tasksCompleted": 145892,
        "tasksQueued": 3,
        "messagesPerSecond": 45.2,
        "errorRate": 0.001,
        "uptime": 259200
      },
      "connections": ["memory-manager", "task-router"]
    }
  ],
  "connections": [
    {
      "id": "myca-orchestrator--memory-manager",
      "sourceId": "myca-orchestrator",
      "targetId": "memory-manager",
      "type": "message",
      "traffic": {
        "messagesPerSecond": 25.5,
        "bytesPerSecond": 5000,
        "latencyMs": 2.5,
        "errorRate": 0.0001
      },
      "animated": true,
      "active": true,
      "intensity": 0.8,
      "bidirectional": true
    }
  ],
  "packets": [...],
  "stats": {
    "totalNodes": 40,
    "activeNodes": 38,
    "totalConnections": 65,
    "activeConnections": 60,
    "messagesPerSecond": 1250,
    "avgLatencyMs": 5.2,
    "systemLoad": 0.35,
    "uptimeSeconds": 259200
  }
}
```

### POST /api/mas/topology

Execute action on a node.

**Request:**
```json
{
  "nodeId": "docker-agent",
  "action": "restart",
  "params": {}
}
```

**Response:**
```json
{
  "success": true,
  "nodeId": "docker-agent",
  "action": "restart",
  "message": "Action restart queued for docker-agent"
}
```

---

## Usage

### Access
**URL**: http://localhost:3010/natureos/ai-studio → Topology Tab

### Keyboard Shortcuts
- **Escape** - Close detail panel / Exit full-screen
- **Space** - Toggle animation
- **R** - Reset camera view

### Performance Tips
- Disable particles for better performance on older hardware
- Reduce animation speed if experiencing lag
- Use category filters to show fewer nodes

---

## Visual Design

### Color Scheme
- **Background**: Deep space black with stars
- **Grid**: Slate blue reference plane
- **Nodes**: Category-colored with glow
- **Connections**: Type-colored lines
- **UI**: Glassmorphism panels

### Effects
- **Bloom**: Soft glow on active nodes
- **Particles**: Floating ambient dust
- **Pulsing**: Busy nodes pulse
- **Rotation**: Active nodes slowly rotate

---

## Integration Points

### Real Data Sources
- MAS Orchestrator: `http://192.168.0.188:8001/topology`
- Falls back to generated data when MAS offline

### Connected Systems
- Agent Grid component
- MYCA Chat Panel
- System Overview
- n8n Workflows

---

*Last Updated: 2026-01-25*
