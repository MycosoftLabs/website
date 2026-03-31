---
description: Navigate and interact with the Genetic Circuit tool at mycosoft.com for designing and analyzing biological computation pathways using a visual circuit builder.
---

# Genetic Circuit

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/genetic-circuit
- **Key Components**: app/natureos/tools/genetic-circuit/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] The visual circuit builder canvas loads with a component palette and at least one genetic part is placed on the canvas
- [ ] A complete circuit is assembled by connecting multiple genetic parts (promoter, gene, terminator) with visible wire/connection lines
- [ ] The circuit is simulated and output expression levels or logic states are displayed in a results panel

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Genetic Circuit"
6. Wait for tool viewport to load (you'll see a title bar reading "Genetic Circuit")
7. A visual circuit builder will appear with a blank canvas in the center and a component palette on the left
8. Drag genetic parts from the palette onto the canvas and connect them to build circuits

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Genetic Circuit" | Top of content area | Confirms tool is loaded |
| Circuit builder canvas (blank grid/workspace) | Center of viewport | Main workspace — drag parts here, draw connections |
| Component palette / parts library | Left side panel | Lists available genetic parts (promoters, RBS, genes, terminators, reporters) |
| Part categories in palette | Grouped in left panel | Expand categories to see specific parts |
| Promoter parts (arrow-shaped icons) | In palette under "Promoters" | Drag to canvas to add transcription start points |
| Gene parts (rectangular block icons) | In palette under "Genes" | Drag to canvas to add coding sequences |
| Terminator parts (T-shaped icons) | In palette under "Terminators" | Drag to canvas to end transcription |
| Reporter parts (colored circle icons) | In palette under "Reporters" | Drag to canvas to add GFP, RFP, or other outputs |
| Connection wires between parts | On canvas between placed parts | Click output port of one part, drag to input port of another |
| Properties inspector | Right side panel | Shows details of selected part — name, parameters, sequence |
| "Simulate" button | Top toolbar or bottom of right panel | Run the circuit simulation |
| Simulation results panel | Bottom drawer or right panel | Shows expression levels, logic truth table, time-series output |
| Undo/Redo buttons | Top toolbar | Revert or replay canvas actions |
| Save/Load buttons | Top toolbar | Persist or restore circuit designs |

## Core Actions
### Action 1: Build a basic genetic circuit
**Goal:** Assemble a simple gene expression circuit from parts
1. In the component palette on the left, expand the "Promoters" category
2. Drag a constitutive promoter (arrow icon) onto the center of the canvas
3. Expand "Genes" and drag a gene part (rectangle) to the right of the promoter on the canvas
4. Expand "Terminators" and drag a terminator (T-shape) to the right of the gene
5. Connect the parts: click the output port (small circle) on the right side of the promoter, then drag to the input port on the left side of the gene — a wire line will appear
6. Connect the gene output to the terminator input the same way
7. You now have a basic expression cassette: Promoter → Gene → Terminator

### Action 2: Add a reporter and simulate
**Goal:** Add a reporter output and run the simulation to see expression levels
1. From the palette, expand "Reporters" and drag a GFP reporter onto the canvas
2. Connect the gene's protein output to the reporter's input
3. Click the "Simulate" button in the toolbar
4. Wait for the simulation to complete — a results panel will appear
5. Review the output: expression level bar chart, time-series curve showing GFP production over time
6. Adjust promoter strength in the properties inspector (click the promoter, change "Strength" parameter) and re-simulate to compare

### Action 3: Design a logic gate circuit
**Goal:** Build a biological AND or OR gate using multiple inputs
1. Place two different inducible promoters on the canvas (e.g., IPTG-inducible and Arabinose-inducible)
2. Connect both to intermediate gene parts
3. Add a logic gate component from the palette (if available) or wire the outputs through a shared regulatory element
4. Connect the gate output to a reporter
5. Simulate the circuit — the results should show a truth table: output is ON only when both inputs are active (AND gate) or when either is active (OR gate)
6. Toggle input states in the simulation panel to test different combinations

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Parts placed on canvas but no connection wires form | Ports not correctly clicked — must click the small port circles | Zoom in on the parts; precisely click the output port dot, then drag to input port dot |
| "Simulate" button is grayed out | Circuit is incomplete — missing connections or required parts | Ensure all parts are connected in a valid chain (Promoter → Gene → Terminator minimum) |
| Simulation returns errors or warnings | Incompatible parts connected or invalid topology | Check the error message; ensure parts are connected in biologically valid order |
| Canvas is cluttered and hard to navigate | Too many parts without organization | Use zoom out (scroll) and pan (click-drag on empty space) to navigate; rearrange parts by dragging |
| Palette is empty or shows no parts | Component library failed to load | Refresh the page; the parts database should load with the tool |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-digital-twin (create twin of designed circuit), lab-lifecycle-simulator (model organism with circuit), lab-compound-simulator (analyze compounds produced by circuit)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — circuit designs and simulation results survive page reload
- The circuit builder uses drag-and-drop heavily — precision clicking on small port circles is required for connections
- Parts have directional flow (left-to-right by convention): input ports on left, output ports on right
- The canvas supports zoom (scroll) and pan (drag empty space) for navigating large circuits
- Simulation results may include time-series data, steady-state values, and logic truth tables

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
