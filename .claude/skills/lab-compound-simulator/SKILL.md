---
description: Navigate and interact with the Compound Simulator at mycosoft.com for chemical compound simulation, molecular structure visualization, and interaction modeling.
---

# Compound Simulator

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/compound-sim
- **Key Components**: app/natureos/tools/compound-sim/page.tsx, components/natureos/tool-viewport.tsx, chemical-params-panel.tsx

## Success Criteria (Eval)
- [ ] A molecular structure is loaded and rendered as a 2D/3D ball-and-stick or space-filling model in the viewport
- [ ] Compound properties (molecular weight, formula, solubility, etc.) are displayed in a properties panel
- [ ] Chemical parameters are adjusted via chemical-params-panel and the simulation reflects updated interaction results

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Compound Simulator"
6. Wait for tool viewport to load (you'll see a title bar reading "Compound Simulator")
7. A molecular visualization area will appear in the center with a parameters panel on the side
8. Use the compound search/selector to load a molecule, then adjust parameters to simulate interactions

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Compound Simulator" | Top of content area | Confirms tool is loaded |
| Molecular structure visualization (ball-and-stick model) | Center of viewport | Main display — rotate by dragging, zoom with scroll |
| Compound search bar or selector dropdown | Top of viewport or left panel | Type compound name or select from library |
| Chemical parameters panel (chemical-params-panel) | Right side panel | Adjust temperature, pressure, concentration, solvent |
| Properties panel (molecular weight, formula, LogP, etc.) | Below or beside the structure | Read-only compound data |
| Interaction mode toggle | Top toolbar or parameters panel | Switch between single compound view and interaction mode |
| Atom labels on structure | Overlaid on molecular model | Shows element symbols (C, H, O, N, etc.) |
| Bond type indicators | Between atoms in the model | Single, double, or triple bonds shown with line count |
| Export/Save button | Top-right toolbar | Save current simulation state or export data |
| Reset button | In toolbar | Clear current compound and parameters |

## Core Actions
### Action 1: Load and visualize a compound
**Goal:** Search for a chemical compound and display its molecular structure
1. Locate the compound search bar at the top of the viewport or in the left panel
2. Type a compound name (e.g., "psilocybin" or "chitin") and press Enter or click the search icon
3. Select the compound from the results dropdown
4. The molecular structure will render in the center — a ball-and-stick model with colored atoms (gray=Carbon, white=Hydrogen, red=Oxygen, blue=Nitrogen)
5. Click and drag on the structure to rotate it in 3D; scroll to zoom
6. Review the properties panel showing molecular weight, chemical formula, and physical properties

### Action 2: Adjust chemical parameters
**Goal:** Modify simulation conditions using the chemical parameters panel
1. Locate the chemical-params-panel on the right side of the viewport
2. Find the Temperature slider — adjust it to change reaction temperature (e.g., 25C to 100C)
3. Find the Pressure input — modify atmospheric pressure conditions
4. Adjust Concentration if available — changes the molarity for interaction calculations
5. Select a Solvent from the dropdown (water, ethanol, DMSO, etc.)
6. The visualization and properties may update to reflect the new conditions (e.g., solubility changes)

### Action 3: Model compound interactions
**Goal:** Simulate how two compounds interact under given conditions
1. Load the first compound using the search bar
2. Switch to interaction mode — look for an "Add Compound" button or "Interaction Mode" toggle
3. Search for and add a second compound
4. Both structures will appear in the viewport, possibly side by side or overlapping
5. Adjust parameters in the chemical-params-panel to set reaction conditions
6. Run the simulation — look for a "Simulate" or "Calculate" button
7. Review interaction results: binding affinity, reaction products, energy diagrams

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Search returns no results for a compound name | Compound not in the library or misspelled | Try the chemical formula instead of common name; try alternate spellings |
| Structure renders but appears flat or distorted | 3D rendering mode may not be active | Look for a 2D/3D toggle and switch to 3D mode |
| Parameters panel is empty or grayed out | No compound loaded yet | Load a compound first before adjusting parameters |
| Interaction simulation hangs or shows "calculating" indefinitely | Complex interaction taking too long | Try simpler compounds or reduce parameter ranges; refresh if stuck |
| Viewport shows placeholder text instead of structure | Component failed to load | Refresh the page and try loading the compound again |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-alchemy (advanced molecular analysis), lab-retrosynthesis (plan synthesis routes for compounds), lab-compound-simulator interactions feed into lab-petri-dish experiments

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — loaded compounds and parameters survive page reload
- The chemical-params-panel.tsx component controls all simulation parameters — it is the primary interaction surface aside from the molecular viewer
- Molecular structures are interactive — drag to rotate, scroll to zoom, click atoms for details
- Some compounds may have limited data — not all properties are available for every molecule

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
