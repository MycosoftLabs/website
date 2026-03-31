---
description: Navigate and interact with the Symbiosis tool at mycosoft.com for modeling mutualistic, parasitic, and commensal relationships between organisms using network visualization.
---

# Symbiosis

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/symbiosis
- **Key Components**: app/natureos/tools/symbiosis/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] Network visualization loads showing organism nodes connected by relationship edges with type indicators (mutualistic, parasitic, commensal)
- [ ] A new organism is added to the network and at least one relationship edge is created connecting it to an existing node
- [ ] A relationship edge is selected and its detail panel shows interaction type, strength, resource flow, and ecological impact

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Symbiosis"
6. Wait for tool viewport to load (you'll see a title bar reading "Symbiosis")
7. A network graph visualization will appear showing organisms as nodes and relationships as edges
8. Add organisms, create relationships, and explore the network to understand symbiotic dynamics

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Symbiosis" | Top of content area | Confirms tool is loaded |
| Network graph visualization | Center of viewport, large area | Nodes and edges forming a relationship network — drag to rearrange, click for details |
| Organism nodes (circles with species names/icons) | Scattered in network graph | Each circle represents an organism — color may indicate kingdom or type |
| Relationship edges (lines connecting nodes) | Between organism nodes | Color-coded: green=mutualistic, red=parasitic, gray/blue=commensal |
| Edge thickness variation | On relationship lines | Thicker lines indicate stronger interactions |
| Edge direction arrows | On relationship lines | Show directionality of resource flow |
| "Add Organism" button | Top toolbar or left panel | Click to add a new organism node to the network |
| Organism search/selector | Popup after clicking Add Organism | Search for species to add |
| "Add Relationship" button or drag-to-connect mode | Top toolbar | Create a new edge between two organisms |
| Relationship type selector | In relationship creation dialog | Choose: Mutualistic, Parasitic, Commensal |
| Node detail panel | Right side panel (on node click) | Shows species info, role in ecosystem, connected relationships |
| Edge detail panel | Right side panel (on edge click) | Shows interaction type, strength, resource flow, ecological impact |
| Network layout controls | Top toolbar or bottom-right | Switch between force-directed, hierarchical, circular layouts |
| Legend panel | Bottom-left of canvas | Color key for relationship types and node categories |
| Zoom/Pan controls | Mouse scroll and drag | Navigate large networks |

## Core Actions
### Action 1: Explore an existing symbiotic network
**Goal:** Navigate the network graph and understand relationships between organisms
1. The network graph will display with organism nodes and relationship edges
2. Use mouse scroll to zoom in/out of the network
3. Click and drag on empty space to pan across the network
4. Click on an organism node (circle) to select it — it will highlight and connected edges will emphasize
5. The node detail panel on the right will show: species name, kingdom, ecological role, number of connections
6. Click on a relationship edge (line between two nodes) to see: interaction type (mutualistic/parasitic/commensal), interaction strength, resource exchange details, ecological impact score
7. Reference the legend panel at the bottom-left for color meanings

### Action 2: Add a new organism and create relationships
**Goal:** Introduce a new species to the network and define its symbiotic relationships
1. Click "Add Organism" in the toolbar
2. In the popup, search for a species (e.g., "Armillaria mellea" or "Quercus robur")
3. Select the species — a new node will appear in the network
4. To create a relationship, click "Add Relationship" or enter drag-to-connect mode
5. Click the new organism node, then click an existing node to define a connection
6. A relationship dialog will appear — select the type:
   - **Mutualistic** (both benefit, green edge): e.g., mycorrhizal fungus + tree root
   - **Parasitic** (one benefits at other's expense, red edge): e.g., Armillaria on a weakened tree
   - **Commensal** (one benefits, other unaffected, gray/blue edge): e.g., epiphytic fungus on bark
7. Set interaction strength (weak/moderate/strong) and describe the resource flow
8. Click "Create" — the new edge will appear connecting the two nodes

### Action 3: Analyze network patterns
**Goal:** Identify key organisms and relationship patterns in the network
1. Look for hub nodes — organisms with many connections are ecological keystones
2. Switch network layout using the layout controls: try "Force-Directed" for organic clustering, "Circular" for clear overview, "Hierarchical" for trophic levels
3. Look for clusters of green edges (mutualistic zones) vs. red edges (parasitic pressure points)
4. Click on a hub organism to see all its relationships listed in the detail panel
5. Identify organisms that have both mutualistic and parasitic relationships — these may be context-dependent interactors
6. Look for isolated nodes (no connections) — these may need relationships added or may be independent species

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Empty canvas with no nodes or edges | No symbiotic network has been created yet | Click "Add Organism" to start building a network from scratch |
| Nodes are overlapping and edges are tangled | Network layout not optimized | Switch to a different layout (force-directed, circular); drag nodes apart manually |
| "Add Relationship" does not connect nodes | Must click source node first, then target node | Click the first organism, then click the second — order matters for directional relationships |
| Edge colors all appear the same | Relationship types not set or all same type | Click on edges to verify types; ensure different relationship types are being created |
| Network is very slow to respond | Too many nodes/edges rendering | Zoom out to reduce rendering load; filter by relationship type to reduce visible edges |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-petri-dish (simulate organism interactions in culture), lab-lifecycle-simulator (model how symbiotic relationships affect lifecycle), lab-earth-simulator (see geographic distribution of symbiotic networks)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — network graph, nodes, edges, and layout survive page reload
- The network graph is the primary interaction surface — it supports click (select), drag (move nodes), scroll (zoom), and drag on empty space (pan)
- Relationship edges are color-coded: green=mutualistic, red=parasitic, gray or blue=commensal
- Edge thickness indicates interaction strength — thicker lines mean stronger interactions
- Network layout algorithms may take a moment to settle after adding or rearranging nodes
- Large networks (50+ nodes) may benefit from filtering or sub-network views

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
