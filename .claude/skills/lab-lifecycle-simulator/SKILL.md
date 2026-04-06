---
description: Navigate and interact with the Lifecycle Simulator at mycosoft.com for modeling complete biological lifecycles from spore to fruiting body to decomposition.
---

# Lifecycle Simulator

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/lifecycle-sim
- **Key Components**: app/natureos/tools/lifecycle-sim/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] Lifecycle simulator loads and displays a visual lifecycle diagram showing distinct stages (spore, germination, growth, fruiting, decomposition)
- [ ] A specific stage is selected and its detailed parameters and visual representation are shown
- [ ] The simulation is advanced through at least two lifecycle stages with visible transitions and updated metrics

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Lifecycle Simulator"
6. Wait for tool viewport to load (you'll see a title bar reading "Lifecycle Simulator")
7. A lifecycle diagram will appear showing circular or linear progression through biological stages
8. Select an organism, configure environment, and run the simulation to watch lifecycle progression

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Lifecycle Simulator" | Top of content area | Confirms tool is loaded |
| Lifecycle stage diagram (circular or linear flow) | Center-top of viewport | Visual overview — current stage is highlighted |
| Stage nodes (Spore, Germination, Mycelium Growth, Primordia, Fruiting Body, Sporulation, Decomposition) | Around the lifecycle diagram | Click a stage to inspect details |
| Current stage highlight (glowing border or color) | On the active stage node | Shows where the organism currently is in its lifecycle |
| Stage detail panel | Right side or below diagram | Shows parameters, duration, visual for the selected stage |
| Organism selector | Top of viewport or left panel | Choose species to simulate (e.g., Pleurotus, Amanita, Psilocybe) |
| Environment configuration panel | Left or right side panel | Set temperature, humidity, substrate, light cycle |
| Simulation timeline/progress bar | Bottom of viewport | Shows elapsed time and total lifecycle duration |
| Play/Pause/Step buttons | Near timeline | Control simulation speed and advancement |
| Speed multiplier selector (1x, 10x, 100x) | Near play controls | Accelerate simulation time |
| Metrics panel (biomass, energy, nutrients consumed) | Below or beside the stage detail | Numerical data for current simulation state |
| Stage transition animation area | Center of viewport | Visual animation plays when transitioning between stages |

## Core Actions
### Action 1: Configure and start a lifecycle simulation
**Goal:** Set up an organism and environment, then begin the lifecycle simulation
1. Locate the organism selector at the top of the viewport
2. Click and select a species (e.g., "Pleurotus ostreatus — Oyster Mushroom")
3. In the environment configuration panel, set substrate type (e.g., "Hardwood"), temperature (22C), humidity (85%), and light cycle (12h on/12h off)
4. The lifecycle diagram will initialize showing the starting stage: "Spore"
5. Click the Play button near the timeline to start the simulation
6. Watch as the current stage highlight moves from "Spore" to "Germination" — a transition animation may play
7. The metrics panel will update with biomass, energy expenditure, and nutrient consumption data

### Action 2: Inspect a specific lifecycle stage
**Goal:** View detailed information and visuals for a particular stage
1. Click on a specific stage node in the lifecycle diagram (e.g., "Fruiting Body")
2. The stage detail panel will expand showing: expected duration, optimal conditions, visual representation of the organism at that stage
3. Review the parameter requirements — what temperature, humidity, and nutrients the stage needs
4. If the simulation is running, clicking a future stage shows predicted conditions
5. Compare current environment settings with the stage's optimal range to identify mismatches

### Action 3: Advance through the full lifecycle
**Goal:** Run the simulation from spore to decomposition and record results
1. Start the simulation from "Spore" stage (see Action 1)
2. Set the speed multiplier to "100x" for faster progression
3. Watch the lifecycle progress through each stage: Spore → Germination → Mycelium Growth → Primordia → Fruiting Body → Sporulation → Decomposition
4. At each transition, the stage highlight moves and a brief animation plays
5. The metrics panel accumulates data — total biomass produced, lifecycle duration, nutrient efficiency
6. When the simulation reaches "Decomposition" or "Sporulation," the full cycle is complete
7. Review the summary report that appears — total cycle time, peak biomass, and efficiency metrics

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Lifecycle diagram shows but simulation won't start | Organism or environment not fully configured | Ensure an organism is selected and all environment parameters are set |
| Simulation stuck on one stage for a long time | Environmental conditions are suboptimal for that stage | Check the stage detail panel for optimal conditions and adjust the environment panel |
| "Organism died" or lifecycle terminated early | Extreme environment settings caused mortality | Reset the simulation; use moderate conditions (20-25C, 70-90% humidity) |
| Stage transitions happen instantly with no animation | Speed multiplier set too high | Reduce speed to 1x or 10x to see transitions |
| Metrics panel shows all zeros | Simulation has not been started | Click the Play button to begin |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-petri-dish (observe early growth stages in detail), lab-growth-analytics (chart lifecycle metrics), lab-mushroom-simulator (3D visualization of fruiting stage), lab-digital-twin (create twin from lifecycle model)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — simulation progress and parameters survive page reload
- The lifecycle diagram is the primary navigation element — stages are clickable nodes
- Simulation speed can be adjusted without pausing — the speed multiplier takes effect immediately
- Different organisms have different numbers of stages and durations
- Environmental parameters affect stage duration and can cause early termination if too extreme

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
