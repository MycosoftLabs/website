---
description: Navigate and interact with the Petri Dish Simulator at mycosoft.com for virtual culture growth simulation of mushrooms, mycelium, bacteria, and other organisms.
---

# Petri Dish Simulator

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/petri-dish
- **Key Components**: app/natureos/tools/petri-dish/page.tsx, components/natureos/tool-viewport.tsx, LazyPetriDishSimulator

## Success Criteria (Eval)
- [ ] Circular Petri dish renders with at least one organism culture visible (colored colony spots or filament networks)
- [ ] Environmental parameters (temperature, humidity, pH) are adjusted and the simulation responds with changed growth patterns
- [ ] Time slider is used to advance the simulation and visible growth changes are observed in the dish

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Petri Dish"
6. Wait for tool viewport to load (you'll see a title bar reading "Petri Dish Simulator")
7. A circular Petri dish visualization will appear in the center of the viewport â€” a round dish shape with a light agar-colored background
8. Use the controls panel to add organisms and adjust environmental parameters
9. Use the time slider to advance the simulation

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Petri Dish Simulator" | Top of content area | Confirms tool is loaded |
| Circular Petri dish (round dish with agar background) | Center of viewport | Main simulation area â€” organisms grow here |
| Organism selector/palette | Left side or top toolbar | Click to choose organism type to add (mushroom, mycelium, virus, bacteria, mold, mildew) |
| Growth controls panel | Right side or bottom panel | Adjust simulation speed, add organisms, reset |
| Time slider bar | Bottom of viewport or below dish | Drag left/right to scrub through simulation time |
| Temperature slider/input | In environmental parameters panel | Adjust temperature (affects growth rate and patterns) |
| Humidity slider/input | In environmental parameters panel | Adjust humidity level |
| pH slider/input | In environmental parameters panel | Adjust acidity/alkalinity of medium |
| Organism colonies (colored spots/networks) | Inside the Petri dish circle | Growing cultures â€” click for details |
| Play/Pause button | Near time slider | Start or pause the simulation |
| Reset button | In controls panel | Clear the dish and start fresh |

## Core Actions
### Action 1: Seed a culture and observe growth
**Goal:** Place an organism in the Petri dish and watch it grow over simulated time
1. Locate the organism selector â€” look for labeled buttons or a dropdown with organism types
2. Click on "Mycelium" (or another organism type like "Bacteria" or "Mold")
3. Click on a spot inside the circular Petri dish to place the organism â€” a small colored dot or filament will appear at the click location
4. Click the Play button near the time slider to start the simulation
5. Watch as the organism grows outward from the seeding point â€” mycelium will form branching white/gray networks, bacteria will form expanding colored colonies
6. Use the time slider to fast-forward and see the full growth pattern

### Action 2: Adjust environmental parameters
**Goal:** Change temperature, humidity, or pH and observe the effect on culture growth
1. Locate the environmental parameters panel (usually right side or a collapsible section)
2. Find the Temperature slider â€” drag it to increase or decrease temperature (e.g., from 25C to 37C)
3. Observe the simulation â€” higher temperatures may accelerate bacterial growth but slow mycelium
4. Adjust the Humidity slider â€” drag it to change moisture levels
5. Adjust the pH slider â€” acidic environments favor fungi, neutral favors bacteria
6. The simulation should update in real-time or after a brief recalculation

### Action 3: Simulate organism interactions
**Goal:** Place multiple organisms to observe competition, symbiosis, or inhibition
1. Select "Mycelium" from the organism palette and click to place it on the left side of the dish
2. Select "Bacteria" and click to place it on the right side of the dish
3. Click Play and advance the time slider
4. Watch as both colonies grow toward each other â€” at the meeting zone, you may see inhibition zones (clear areas), overgrowth, or boundary formation
5. Try adding "Mold" near the bacteria to see three-way interaction dynamics

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Empty dish with no organisms appearing after clicking | Organism type not selected before clicking | Select an organism from the palette first, then click inside the dish |
| Simulation not advancing despite Play being clicked | Time scale may be set to zero or paused | Check time slider position; ensure it is not at the end of the range |
| Parameters panel is collapsed or not visible | Panel may be minimized by default | Look for a gear icon or "Parameters" tab to expand the panel |
| Organisms placed but no growth occurs | Environmental parameters may be extreme (e.g., 0C temperature) | Reset parameters to defaults (25C, 70% humidity, pH 7) |
| Dish appears but is completely dark or blank | Lazy-loaded component failed to render | Refresh the page and wait for LazyPetriDishSimulator to initialize |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-compound-simulator (analyze compounds produced by cultures), lab-lifecycle-simulator (model full lifecycle), lab-growth-analytics (track growth metrics)

## Computer Use Notes
- Tool viewport shows loading state before content appears â€” wait for title bar
- State persists via Supabase â€” organism placements and parameters survive page reload
- Heavy components are lazy-loaded via LazyPetriDishSimulator â€” may take 2-5 seconds to render
- The Petri dish is a 2D circular visualization â€” interactions happen via click events on the dish surface
- Multiple organism types can coexist: mushroom, mycelium, virus, bacteria, mold, mildew
- Time slider allows both forward and backward scrubbing through the simulation timeline

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
