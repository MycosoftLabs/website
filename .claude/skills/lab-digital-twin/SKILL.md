---
description: Navigate and interact with the Digital Twin tool at mycosoft.com for creating virtual replicas of biological organisms and environments.
---

# Digital Twin

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/digital-twin
- **Key Components**: app/natureos/tools/digital-twin/page.tsx, components/natureos/tool-viewport.tsx, digital-twin-content.tsx

## Success Criteria (Eval)
- [ ] A digital twin model loads and renders in the viewport showing a virtual replica of a biological system (organism or environment)
- [ ] Model parameters are modified (e.g., growth rate, nutrient levels) and the twin updates its visualization to reflect changes
- [ ] Real-time or historical data from a physical counterpart is linked and visible in the twin's dashboard panel

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Digital Twin"
6. Wait for tool viewport to load (you'll see a title bar reading "Digital Twin")
7. The digital-twin-content component will render — showing a model selection or active twin view
8. Select or create a digital twin model to begin working with the virtual replica

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Digital Twin" | Top of content area | Confirms tool is loaded |
| Twin model selector/list | Left panel or modal on load | Choose an existing twin or create new |
| Virtual replica visualization | Center of viewport | 3D or 2D representation of the biological system |
| Parameters panel | Right side panel | Adjust model inputs: growth rate, nutrients, temperature, moisture |
| Data sync indicator | Top-right corner or status bar | Shows connection status to physical counterpart data |
| Timeline/history slider | Bottom of viewport | Scrub through historical states of the twin |
| Metrics dashboard | Below or beside the visualization | Real-time readings: biomass, metabolic rate, health score |
| "Create New Twin" button | In model selector or toolbar | Start building a new digital twin from scratch |
| "Sync Data" button | Near data sync indicator | Pull latest sensor data from physical systems |
| Export/Report button | Toolbar | Generate reports or export twin state |
| Comparison view toggle | Toolbar | Side-by-side view of twin vs. physical system data |

## Core Actions
### Action 1: Load and inspect an existing digital twin
**Goal:** Open a previously created digital twin and review its current state
1. When the tool loads, look for a model selector panel or list showing available twins
2. Click on an existing twin model (e.g., "Oyster Mushroom Colony #3" or "Forest Floor Biome")
3. The virtual replica will render in the center — a visual representation of the organism or environment
4. Review the metrics dashboard for current readings: biomass estimate, metabolic rate, growth stage
5. Check the data sync indicator — a green icon means live data is flowing from sensors
6. Use the timeline slider at the bottom to review how the twin has changed over time

### Action 2: Modify twin parameters and observe predictions
**Goal:** Change model inputs and see how the digital twin predicts the system will respond
1. With a twin loaded, locate the parameters panel on the right side
2. Adjust a parameter — e.g., increase "Nutrient Level" slider from 50% to 80%
3. The visualization will update to show the predicted effect — faster growth, denser structures
4. Try adjusting "Temperature" — lowering it may show slower growth, color changes
5. Adjust "Moisture" — the model should reflect hydration effects on the organism
6. The metrics dashboard will update with predicted values based on the new parameters
7. Compare predicted values with the last known physical state to assess accuracy

### Action 3: Create a new digital twin
**Goal:** Build a new virtual replica from scratch or from a template
1. Click "Create New Twin" button in the toolbar or model selector
2. A creation wizard or form will appear — select the type of biological system (organism, environment, colony)
3. Choose a base template if available (e.g., "Generic Fungal Colony", "Soil Microbiome")
4. Set initial parameters: species, starting conditions, environmental factors
5. Optionally link to a physical data source — select a MycoBrain sensor or data feed
6. Click "Create" or "Initialize" — the new twin will render with its initial state
7. The twin is now ready for parameter experimentation and data synchronization

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "No twins available" message in selector | No twins have been created yet or data not loaded | Click "Create New Twin" to start one, or refresh if data should exist |
| Visualization area shows placeholder or loading skeleton | digital-twin-content.tsx still initializing | Wait 3-5 seconds for the component to fully render |
| Data sync indicator shows red/disconnected | Physical sensor data source is offline or not configured | Click "Sync Data" to retry; check that the linked sensor is active |
| Parameter changes have no visible effect | Model may need manual recalculation | Look for an "Update" or "Recalculate" button after changing parameters |
| Timeline slider is empty or shows no history | Twin was just created with no historical data | Run the simulation forward or wait for data to accumulate from sensors |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-growth-analytics (analyze twin growth data), lab-lifecycle-simulator (simulate full lifecycle from twin starting conditions), device-mycobrain-setup (configure sensors that feed twin data)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — twin models, parameters, and history survive page reload
- The digital-twin-content.tsx component handles the main rendering logic
- Digital twins can link to real MycoBrain sensor data for live synchronization
- The tool bridges physical and virtual — changes in the physical system should eventually reflect in the twin (with sync delay)
- Heavy models may take several seconds to render after parameter changes

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
