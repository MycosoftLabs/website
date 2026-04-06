---
description: Navigate and interact with the Physics Simulator at mycosoft.com for modeling fluid dynamics, diffusion, and mechanical forces in biological systems.
---

# Physics Simulator

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/physics-sim
- **Key Components**: app/natureos/tools/physics-sim/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] Physics simulation canvas loads and displays a biological system with active physics (particles, fluid flow, or force vectors visible)
- [ ] A simulation type is selected (fluid dynamics, diffusion, or mechanical forces) and its parameters are configured
- [ ] The simulation is run and visual output shows physically accurate behavior (e.g., nutrient diffusion gradient, fluid flow through hyphae)

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Physics Simulator"
6. Wait for tool viewport to load (you'll see a title bar reading "Physics Simulator")
7. A simulation canvas will appear with a simulation type selector and parameter controls
8. Select a simulation type, configure the biological context, and run the physics model

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Physics Simulator" | Top of content area | Confirms tool is loaded |
| Simulation canvas (2D/3D rendering area) | Center of viewport | Main visualization — shows particles, flow lines, force vectors |
| Simulation type selector (tabs or dropdown) | Top of viewport or left panel | Choose: Fluid Dynamics, Diffusion, Mechanical Forces |
| Biological context selector | Below simulation type | Choose system: hyphae network, cell membrane, spore dispersal, soil matrix |
| Parameter controls panel | Right side panel | Adjust viscosity, diffusion rate, force magnitude, boundary conditions |
| Viscosity slider | In parameters panel (Fluid Dynamics) | Controls fluid thickness — affects flow speed |
| Diffusion coefficient input | In parameters panel (Diffusion) | Sets how fast molecules spread |
| Force magnitude slider | In parameters panel (Mechanical Forces) | Controls strength of applied forces |
| Boundary condition toggles | In parameters panel | Set walls, periodic boundaries, or open boundaries |
| Play/Pause/Step controls | Below canvas or in toolbar | Run, pause, or step through simulation |
| Time step display | Near play controls | Shows current simulation time |
| Velocity/concentration color legend | Side of canvas | Maps colors to values (blue=low, red=high) |
| Vector field overlay toggle | In toolbar | Show/hide directional arrows on the canvas |
| Export data button | Top-right toolbar | Save simulation frames or data |

## Core Actions
### Action 1: Simulate nutrient diffusion through a mycelium network
**Goal:** Model how nutrients diffuse through a hyphal network
1. Select "Diffusion" from the simulation type selector
2. In the biological context selector, choose "Hyphae Network"
3. The canvas will show a branching network structure representing mycelium
4. In the parameters panel, set the diffusion coefficient (e.g., 1.0 x 10^-9 m2/s for small molecules)
5. Click on a point in the network to place a nutrient source — a bright colored dot will appear
6. Click "Play" to start the simulation
7. Watch as color gradients spread outward from the source through the network — brighter colors represent higher concentration
8. The concentration legend on the side maps colors to nutrient levels

### Action 2: Model fluid flow through biological structures
**Goal:** Simulate fluid dynamics in a biological context
1. Select "Fluid Dynamics" from the simulation type selector
2. Choose a biological context like "Cell Membrane" or "Soil Matrix"
3. The canvas will display the structural geometry with inlet and outlet regions
4. Set viscosity in the parameters panel — lower values create faster, more turbulent flow
5. Set boundary conditions — walls for solid structures, periodic for repeating patterns
6. Click "Play" to start the fluid simulation
7. Flow lines or particle tracers will appear showing fluid movement through the structure
8. Toggle the vector field overlay to see directional arrows indicating flow direction and speed

### Action 3: Analyze mechanical forces on biological structures
**Goal:** Apply forces to a biological structure and observe deformation or stress
1. Select "Mechanical Forces" from the simulation type selector
2. Choose a biological context like "Fruiting Body" or "Spore Wall"
3. The canvas will show the structure with force application points
4. Adjust force magnitude and direction in the parameters panel
5. Click on the structure to apply a force at that point — an arrow will appear showing force direction
6. Click "Play" to run the simulation
7. The structure will deform or show stress coloring — red for high stress, blue for low
8. Step through the simulation frame by frame to observe deformation progression

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Canvas shows grid but no biological structure | Biological context not selected | Select a context from the biological context selector |
| Simulation runs but nothing visible changes | Parameters too small or diffusion too slow | Increase diffusion coefficient, force magnitude, or flow velocity; try larger values |
| Simulation becomes unstable (flickering, NaN values) | Time step too large for the physics parameters | Reduce parameter values or let the tool auto-adjust; refresh if NaN persists |
| "Play" button does not respond | Simulation type or context not fully configured | Ensure both simulation type and biological context are selected |
| Color legend shows uniform color across canvas | No gradient has developed yet | Wait longer or increase source strength; initial conditions may need time to evolve |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-digital-twin (incorporate physics into twin models), lab-petri-dish (understand physical diffusion in culture dishes), lab-compound-simulator (model compound transport physics)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — simulation setup and parameters survive page reload
- Physics simulations can be computationally intensive — frame rate may drop for complex models
- Three simulation modes serve different biological questions: fluid dynamics (transport), diffusion (nutrient/signal spread), mechanical forces (structural integrity)
- Color legends are essential for interpreting quantitative results — always reference the legend
- Vector field overlays add directional information but can clutter the view — toggle as needed

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
