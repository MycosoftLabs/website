---
description: Navigate the MYCA Command Center (AI Studio) at mycosoft.com/natureos/ai-studio — multi-agent system orchestration with 227+ agents, 3D topology visualization, real-time activity monitoring, and PersonaPlex voice control.
---

# AI Studio (MYCA Command Center)

## Identity
- **Category**: ai
- **Access Tier**: COMPANY (listed in PREMIUM but gated via COMPANY per access-tiers)
- **Depends On**: platform-natureos-dashboard
- **Route**: /natureos/ai-studio
- **Key Components**: app/natureos/ai-studio/page.tsx, app/natureos/ai-studio/layout.tsx, app/natureos/ai-studio/_components/, components/mas/AgentTopology.tsx, components/mas/AgentGrid.tsx, components/mas/AgentCreator.tsx, components/mas/NotificationCenter.tsx, components/mas/topology/agent-registry.ts, components/myca/MYCAChatWidget.tsx, components/myca2/Myca2PsiloPanel.tsx, components/voice/

## Success Criteria (Eval)
- [ ] AI Studio page loads with "MYCA Command Center v2" header showing orchestrator status indicator (green=online, red=offline, yellow=checking)
- [ ] System tab displays MYCA chat widget (left 2/3), notification center (right 1/3), quick action grid (6 buttons), agent category overview with real counts from registry, and full agent grid
- [ ] Topology tab renders 3D agent topology visualization (AdvancedTopology3D) with Psilo panel sidebar and full-screen toggle
- [ ] Activity tab shows ActivityTopologyView with circulatory system data (routes, APIs, memory, workflows, devices, DB)
- [ ] Quick stats bar in header shows Active agents count, Total agents (from COMPLETE_AGENT_REGISTRY), and Tasks queued — all from real MAS API data

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in (company-level access required)
2. Open the NatureOS dashboard at /natureos
3. In the sidebar, expand "AI & Agents" section and click "AI Studio", or navigate directly to /natureos/ai-studio
4. Alternatively, from the /myca page, click the "AI Studio" button in the hero section
5. The MYCA Command Center loads with a sticky header showing the Brain icon, orchestrator status dot, agent stats, Refresh button, and "Create Agent" button
6. Three tabs below the header: System, Topology, Activity

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "MYCA Command Center" heading with Brain icon and v2 badge | Top-left, sticky header | Confirms you are on AI Studio |
| Orchestrator status dot (green/red/yellow) | On the Brain icon, bottom-right corner | Green = MAS orchestrator online; Red = offline; Yellow = checking |
| Quick stats: Active / Agents / Queued | Top-right header area (desktop only, hidden on mobile) | Real-time counts from MAS API and agent registry |
| "Refresh" button | Top-right, next to stats | Fetches fresh data from /api/mas/health, /api/mas/agents, and orchestrator diagnostics |
| "Create Agent" button | Top-right, rightmost | Opens AgentCreator modal to spawn a new MAS agent |
| System / Topology / Activity tabs | Below the sticky header, full-width tab bar | Switch between the three main views |
| MYCA Chat widget | System tab, left 2/3 of first row | Embedded MYCAChatWidget (500px height) for direct MYCA interaction |
| Notification Center | System tab, right 1/3 of first row | Real-time notifications from MAS (500px height) |
| Quick Actions grid (6 buttons) | System tab, below chat row | Links to MAS API Docs, n8n Workflows, Proxmox VE, Devices, MINDEX DB, Security |
| Agent Categories grid (14 categories) | System tab, card below quick actions | Shows real agent counts per category (Core, Financial, Mycology, Research, DAO, Comms, Data, Infra, Simulation, Security, Integration, Device, Chemistry, NLM) |
| AgentGrid | System tab, bottom | Full agent list with 15s auto-refresh from /api/mas |
| 3D Topology (AdvancedTopology3D) | Topology tab, right 3/4 | Interactive Three.js/React Three Fiber 3D visualization of agent network |
| Psilo Panel (Myca2PsiloPanel) | Topology tab, left 1/4 sidebar | Psilocybin-themed consciousness panel |
| Full Screen button | Topology tab, top-right of section | Expands 3D topology to full-screen overlay |
| Legacy Grid View (details/summary) | Topology tab, below 3D view | Collapsible fallback to flat AgentTopology grid |
| ActivityTopologyView | Activity tab | Circulatory system view of routes, APIs, memory, sitemap, workflows, devices, DB |
| PersonaPlex voice indicator | Bottom-right corner (desktop only) | Shows voice connection status; click to start/stop listening |

## Core Actions
### Action 1: Monitor system health and agent status
**Goal:** Check the state of the MAS orchestrator and all 227+ agents
1. Navigate to /natureos/ai-studio
2. Check the orchestrator status dot on the Brain icon (green = healthy)
3. View the quick stats in the header: Active count, Total agents, Tasks queued
4. On the System tab, scroll to the Agent Categories card to see per-category breakdown
5. Scroll further to the AgentGrid for individual agent status, health metrics, and actions
6. Click "Refresh" to force a fresh fetch from the MAS API

### Action 2: Explore agent topology in 3D
**Goal:** Visualize the multi-agent system network and relationships
1. Click the "Topology" tab
2. The 3D topology renders in the main area — agents appear as nodes, connections as edges
3. Use mouse/touch to rotate, zoom, and pan the 3D view
4. The Psilo Panel on the left shows consciousness-related metrics
5. Click "Full Screen" for an immersive view; press Escape or the close button to exit
6. Optionally expand "Show Legacy Grid View" for a flat topology

### Action 3: Create a new agent
**Goal:** Spawn a new specialized agent in the MAS
1. Click the "Create Agent" button in the top-right header
2. The AgentCreator modal opens
3. Configure the agent properties (name, category, capabilities)
4. Submit to create — the agent is registered via /api/mas
5. The stats and grid auto-refresh to show the new agent

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Orchestrator status dot is red, stats show "degraded" | MAS VM orchestrator at ${MAS_VM_HOST}:8001 is unreachable | Check that the MAS VM is running; the page falls back to registry data for agent counts |
| 3D topology is blank or loading spinner persists | WebGL not supported or Three.js failed to initialize | Try a different browser; ensure hardware acceleration is enabled; fall back to Legacy Grid View |
| Agent counts show 0 Active | /api/mas/agents endpoint returned error | Click Refresh; if persistent, the MAS API may be down — registry total still shows correctly |
| "Create Agent" modal submits but no agent appears | MAS API rejected the creation request | Check browser console for error details; ensure company-level access |
| Voice commands not working | PersonaPlex not connected or on mobile | Voice requires desktop + edge node; check the voice indicator in bottom-right |
| Quick action links (Proxmox, n8n) fail to load | Local network services not accessible | These link to internal IPs (${PROXMOX_HOST}, localhost:5678) — only work on the local network |

## Composability
- **Prerequisite skills**: platform-natureos-dashboard (for sidebar navigation and NatureOS layout)
- **Next skills**: ai-explainer (transformer architecture education), ai-model-training (NLM training pipeline), mas-topology-viewer (dedicated topology page), mas-agent-management (agent CRUD), ai-workflows (n8n workflow management)
- **Used by workflows**: workflow-research-pipeline (AI Studio as orchestration hub)

## Computer Use Notes
- The page auto-refreshes data every 30 seconds (orchestrator health + stats); during active use the interval runs continuously
- Agent registry (COMPLETE_AGENT_REGISTRY) provides ground-truth counts — MAS API data augments with live status
- The 3D topology in the Topology tab can be resource-intensive; the legacy grid is a lighter alternative
- PersonaPlex voice commands recognized: "show command/system", "show topology", "show memory/activity/workflows", "create agent/new agent", "refresh/update"
- The System tab is the default selected tab on page load
- Quick action buttons link to both internal routes (/natureos/devices/network, /natureos/mindex, /natureos/monitoring) and external services (MAS API docs, n8n, Proxmox)
- Data polling switches to 3-second intervals during active training (via model-training integration)

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
