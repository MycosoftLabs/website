---
description: Navigate and interact with the Mushroom Simulator at mycosoft.com for 3D mushroom visualization and growth modeling using Three.js (COMPANY-only access).
---

# Mushroom Simulator

## Identity
- **Category**: lab-tools
- **Access Tier**: COMPANY
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/mushroom-sim
- **Key Components**: app/natureos/tools/mushroom-sim/page.tsx, components/natureos/tool-viewport.tsx, mushroom-sim-content.tsx, LazyMushroomSimulator

## Success Criteria (Eval)
- [ ] A 3D mushroom model renders in the viewport via Three.js with visible cap, stem, and gills that can be rotated by mouse drag
- [ ] Growth parameters (moisture, temperature, substrate) are adjusted and the 3D model updates its size, shape, or color accordingly
- [ ] Growth simulation is run and the mushroom visually grows from primordia to full fruiting body in the 3D view

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in with a COMPANY-tier account (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Mushroom Simulator"
6. Wait for tool viewport to load (you'll see a title bar reading "Mushroom Simulator")
7. Wait for LazyMushroomSimulator to initialize — a 3D canvas with a mushroom model will appear
8. Use mouse to rotate/zoom the 3D model; use parameter controls to adjust growth conditions

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Mushroom Simulator" | Top of content area | Confirms tool is loaded |
| 3D mushroom model (Three.js canvas) | Center of viewport, large area | Click-drag to rotate, scroll to zoom, right-drag to pan |
| Mushroom cap (dome/convex shape, textured) | Top of the 3D model | Part of the mushroom — color and shape change with species/conditions |
| Mushroom stem (cylindrical shape) | Below the cap in 3D model | Grows taller during simulation |
| Mushroom gills (radial lines under cap) | Underside of cap when rotated | Visible when viewing from below; detail level varies |
| Species selector dropdown | Top of viewport or left panel | Choose mushroom species to model |
| Growth parameters panel | Right side panel | Sliders and inputs for moisture, temperature, substrate type, light |
| Moisture slider | In parameters panel | Drag to adjust water availability (0-100%) |
| Temperature slider | In parameters panel | Drag to set ambient temperature |
| Substrate type selector | In parameters panel | Dropdown: hardwood, straw, compost, grain, etc. |
| Growth simulation controls (Play/Pause/Reset) | Below the 3D canvas or in toolbar | Control the growth animation |
| Growth stage indicator | Near simulation controls | Text or progress showing: primordia, pin, button, mature |
| Time elapsed display | Near simulation controls | Shows simulated days elapsed |
| Measurement overlay (height, cap diameter) | Overlaid on 3D model or in info panel | Dimensional measurements of the current mushroom |

## Core Actions
### Action 1: Visualize a mushroom species in 3D
**Goal:** Load a specific mushroom species and explore its 3D model
1. Locate the species selector dropdown at the top of the viewport
2. Click and select a species (e.g., "Amanita muscaria", "Pleurotus ostreatus", "Psilocybe cubensis")
3. The 3D model will update to show the characteristic shape and coloring of that species
4. Click and drag on the 3D canvas to rotate the model — observe cap shape, stem proportions, gill structure
5. Scroll to zoom in for detail — see surface texture, color gradients, and structural features
6. Right-click and drag to pan the view if needed

### Action 2: Adjust growth parameters and see effects
**Goal:** Modify environmental conditions and observe how the 3D model responds
1. In the growth parameters panel on the right, locate the Moisture slider
2. Drag Moisture to a high value (e.g., 90%) — the mushroom model may appear more hydrated, larger, or with smoother texture
3. Adjust Temperature — higher temps may produce taller, thinner stems; lower temps may produce compact growth
4. Change the Substrate type from the dropdown — different substrates affect coloring and growth patterns
5. The 3D model updates in real-time or near-real-time to reflect parameter changes
6. Review the measurement overlay to see how height and cap diameter change with different conditions

### Action 3: Run a growth simulation
**Goal:** Watch a mushroom grow from primordia to mature fruiting body in 3D
1. Set the desired species and growth parameters
2. Click the "Reset" button to return the model to the primordia stage (tiny bump on substrate)
3. Click "Play" to start the growth simulation
4. Watch the 3D model animate: primordia → pin (small vertical protrusion) → button (cap forming) → mature (full cap expansion, gills visible)
5. The growth stage indicator will update at each transition
6. The time elapsed display shows simulated days
7. Click "Pause" at any point to freeze the animation and inspect the current state
8. Use mouse rotation while paused to examine the mushroom from all angles

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Access Denied" or "Insufficient Permissions" | Account is not COMPANY tier | Log in with a COMPANY-tier account; this tool requires elevated access |
| Black canvas or no 3D model visible | WebGL failed to initialize or Three.js error | Refresh the page; ensure browser supports WebGL; check for GPU driver issues |
| Model loads but appears flat or 2D | Three.js scene lighting may not have initialized | Try rotating the view with mouse drag; if still flat, refresh |
| Growth simulation starts but mushroom doesn't visually change | Parameter extremes may prevent visible growth | Use moderate values: 20-25C, 80% moisture, hardwood substrate |
| LazyMushroomSimulator shows loading for more than 10 seconds | Heavy 3D assets still downloading | Wait up to 15 seconds; if still loading, refresh the page |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-lifecycle-simulator (model full lifecycle beyond just fruiting), lab-growth-analytics (chart growth data from simulations), lab-petri-dish (observe early mycelial stages)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — species selection and parameters survive page reload
- Heavy components are lazy-loaded via LazyMushroomSimulator — may take 2-5 seconds to render
- This is a 3D WebGL tool using Three.js — look for a `<canvas>` element as the main interaction surface
- mushroom-sim-content.tsx contains the primary rendering logic
- Mouse interactions: left-click-drag to rotate, scroll to zoom, right-click-drag to pan
- COMPANY-only access — ensure the logged-in account has COMPANY tier permissions
- 3D model quality and detail depend on the selected species — some have more detailed meshes than others

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
