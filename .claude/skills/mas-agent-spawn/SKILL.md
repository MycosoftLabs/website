---
description: Spawn new MAS agents from the topology viewer, including ephemeral voice session nodes, at mycosoft.com/natureos/mas/topology.
---

# MAS Agent Spawn

## Identity
- **Category**: mas
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard, platform-authentication, mas-topology-viewer
- **Route**: /natureos/mas/topology
- **Key Components**: app/natureos/mas/topology/page.tsx, components/natureos/agent-spawn-modal.tsx, components/natureos/topology-bottom-bar.tsx

## Success Criteria (Eval)
- [ ] Spawn Agent button in the topology bottom control bar is clickable and opens a spawn modal
- [ ] Spawn modal displays agent configuration options (category, name, resource allocation, transport)
- [ ] Successfully spawned agent appears as a new node in the 3D topology view
- [ ] Voice session nodes appear as ephemeral nodes during active sessions and disappear when sessions end

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "MAS" section
5. Click "Topology" to open the topology viewer
6. Wait for 3D canvas to initialize (nodes and edges visible)
7. Locate the bottom control bar
8. Click the "Spawn Agent" button -- spawn modal appears

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Spawn Agent button | Bottom control bar, left area | Click to open spawn configuration modal |
| Spawn modal dialog | Center of screen, overlay | Configure new agent parameters |
| Agent category dropdown | In spawn modal | Select from 14 categories (core, financial, mycology, etc.) |
| Agent name input field | In spawn modal | Enter a name for the new agent |
| Resource allocation sliders (CPU, memory) | In spawn modal | Set resource limits for the new agent |
| Voice transport selector | In spawn modal (for voice agents) | Choose: PersonaPlex, ElevenLabs, or Web Speech |
| Ephemeral toggle | In spawn modal | Toggle for voice session nodes (ephemeral by default) |
| Priority/queue settings | In spawn modal | Configure task priority and queue depth |
| Confirm/Spawn button | Bottom of spawn modal | Click to create the agent |
| Cancel button | Bottom of spawn modal | Close modal without spawning |
| New agent node (animated entry) | In 3D canvas after spawn | Newly spawned agent appears with entry animation |
| Ephemeral voice nodes | In 3D canvas during active sessions | Appear/disappear dynamically with voice sessions |

## Core Actions
### Action 1: Spawn a new persistent agent
**Goal:** Create a new long-running agent in the MAS topology
1. Click "Spawn Agent" in the bottom control bar
2. In the modal, select agent category from the dropdown
3. Enter a descriptive agent name
4. Adjust resource allocation sliders if needed (defaults are usually adequate)
5. Leave "Ephemeral" toggle off for persistent agents
6. Click "Spawn" to create the agent
7. Modal closes and the new node appears in the 3D topology with an entry animation
8. The right panel updates to show the new agent in the category breakdown

### Action 2: Spawn an ephemeral voice session agent
**Goal:** Create a temporary voice agent that exists only during an active session
1. Click "Spawn Agent" in the bottom control bar
2. Select the appropriate category (e.g., communication, NLM)
3. Toggle "Ephemeral" to ON
4. Select voice transport: PersonaPlex, ElevenLabs, or Web Speech
5. Configure session parameters if applicable
6. Click "Spawn"
7. The ephemeral node appears in the 3D canvas with a distinctive visual (e.g., pulsing glow)
8. When the voice session ends, the node automatically disappears from the topology

### Action 3: Spawn via MYCA query
**Goal:** Use natural language to spawn agents
1. In the MYCA query bar (bottom control bar, center), type a spawn command
2. Example: "Spawn security agent" or "Create new mycology research agent"
3. Press Enter -- MYCA interprets the request and opens the spawn modal pre-filled
4. Review the pre-filled configuration and adjust if needed
5. Click "Spawn" to confirm

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Spawn Agent button is grayed out | System at max agent capacity or insufficient permissions | Check active agent count in stats bar; verify permissions |
| Modal opens but category dropdown is empty | Agent category data failed to load | Close modal and reopen; refresh page if persistent |
| Spawn succeeds but node does not appear | 3D canvas needs refresh or category is filtered out | Click Refresh button; check that the category filter is enabled in left panel |
| "Spawn failed" error message | Resource limits exceeded or backend error | Check error details in modal; try reducing resource allocation |
| Voice node does not disappear after session | WebSocket disconnect during session end | Refresh the topology page; node will be cleaned up on reconnect |
| MYCA spawn query not recognized | Query phrasing not matched | Use explicit terms: "spawn" or "create agent" followed by category name |

## Composability
- **Prerequisite skills**: platform-authentication, mas-topology-viewer (must be in topology view to spawn)
- **Next skills**: mas-agent-management (monitor newly spawned agents), mas-topology-viewer (visualize new agent in context)

## Computer Use Notes
- AUTHENTICATED access required -- spawning may require additional permissions for certain categories
- Voice session nodes use three transport options: PersonaPlex (highest quality), ElevenLabs (fast synthesis), Web Speech (browser-native)
- Ephemeral nodes are not persisted -- they exist only in memory during active sessions
- Spawn modal is a standard dialog with role="dialog" and aria-modal="true"
- After spawning, the topology animates the new node into position (takes 1-2 seconds)
- Maximum agent count may be limited by system resources -- check stats bar for current count vs. capacity

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
