---
description: Navigate and interact with the Alchemy Lab at mycosoft.com for advanced molecular modeling, reaction simulation, and compound library management.
---

# Alchemy Lab

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/alchemy-lab
- **Key Components**: app/natureos/tools/alchemy-lab/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] Alchemy Lab workspace loads with molecular modeling canvas and compound library panel visible
- [ ] A reaction simulation is configured with reactants and conditions, and the predicted products are displayed
- [ ] A compound is selected from the library and its detailed molecular analysis view is opened

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Alchemy Lab"
6. Wait for tool viewport to load (you'll see a title bar reading "Alchemy Lab")
7. The workspace will display a molecular modeling canvas in the center, a compound library panel on the left, and reaction controls on the right
8. Use the compound library to load molecules, drag them onto the canvas, and configure reactions

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Alchemy Lab" | Top of content area | Confirms tool is loaded |
| Molecular modeling canvas | Center of viewport | Main workspace — drag molecules here, view structures |
| Compound library panel | Left side panel | Browse, search, and select compounds from the library |
| Compound search field | Top of library panel | Type to filter compounds by name or formula |
| Compound categories/folders | In library panel | Click to expand categories (mycological, pharmaceutical, organic, etc.) |
| Reaction simulation controls | Right side panel | Set reactants, conditions, catalysts, run simulation |
| Reactant slots (labeled A, B, etc.) | In reaction panel | Drag compounds here or click to assign |
| Conditions panel (temperature, pressure, solvent) | In reaction panel below reactant slots | Set reaction environment |
| "Run Reaction" button | Bottom of reaction panel | Click to execute the simulation |
| Products display area | Below canvas or in results drawer | Shows predicted products after simulation runs |
| Molecular analysis view | Expands from selected compound | Detailed properties, spectra, stability data |
| Save/Export toolbar | Top-right of viewport | Save workspace state or export results |

## Core Actions
### Action 1: Browse and select from compound library
**Goal:** Find a compound in the library and load it onto the modeling canvas
1. Locate the compound library panel on the left side
2. Use the search field at the top to type a compound name (e.g., "ergosterol")
3. Results will filter as you type — click on the matching compound
4. The compound's molecular structure will appear on the modeling canvas in the center
5. Click on the structure to see a detailed analysis popup with molecular weight, formula, known reactions, and stability data
6. Alternatively, browse by category — expand folders like "Mycological Compounds" to see curated lists

### Action 2: Configure and run a reaction simulation
**Goal:** Set up two or more reactants and simulate a chemical reaction
1. Load a first compound from the library onto the canvas (see Action 1)
2. Drag the compound to the "Reactant A" slot in the reaction simulation panel on the right
3. Load a second compound and drag it to "Reactant B"
4. In the conditions panel, set temperature (e.g., 80C), pressure (1 atm), and solvent (e.g., water)
5. Optionally add a catalyst by searching for one and dragging to the "Catalyst" slot
6. Click "Run Reaction" at the bottom of the reaction panel
7. Wait for the simulation — a progress indicator will appear briefly
8. Predicted products will display in the products area with yield percentages and molecular structures

### Action 3: Analyze molecular properties in detail
**Goal:** Open the detailed molecular analysis view for a compound
1. Click on any compound structure on the canvas or in the library
2. A detailed analysis panel will expand showing: 3D structure, spectral data (IR, NMR, Mass Spec), thermodynamic properties, toxicity predictions, and biological activity data
3. Use tabs or scroll within the analysis view to navigate between property sections
4. Compare with other compounds by opening multiple analysis views side by side

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Library panel shows "Loading compounds..." indefinitely | Database fetch failed | Refresh the page; check network connection |
| "Run Reaction" button is grayed out | Missing required inputs (reactants or conditions) | Ensure at least two reactants are assigned and conditions are set |
| Canvas is empty after selecting a compound | Compound has no available structure data | Try a different compound; some entries may be data-only without 3D models |
| Reaction simulation returns "No products predicted" | Reaction conditions are incompatible with reactants | Adjust temperature, solvent, or try a catalyst; some combinations simply do not react |
| Workspace does not persist after refresh | Supabase state save may have failed | Check for a save indicator; manually click Save before navigating away |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-compound-simulator (focused single-compound analysis), lab-retrosynthesis (plan synthesis pathways), lab-petri-dish (test compounds on cultures)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — workspace layout, loaded compounds, and reaction results survive page reload
- The Alchemy Lab is a comprehensive workspace — it combines compound library browsing, molecular modeling, and reaction simulation in one tool
- Drag-and-drop is used extensively — compounds move from library to canvas to reaction slots
- The compound library may contain hundreds of entries — use search and category filters to find compounds efficiently

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
