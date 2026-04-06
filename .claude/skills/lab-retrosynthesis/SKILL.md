---
description: Navigate and interact with the Retrosynthesis tool at mycosoft.com for planning chemical synthesis pathways backward from a target molecule using tree-based visualization.
---

# Retrosynthesis

## Identity
- **Category**: lab-tools
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-natureos-dashboard
- **Route**: /natureos/tools/retrosynthesis
- **Key Components**: app/natureos/tools/retrosynthesis/page.tsx, components/natureos/tool-viewport.tsx

## Success Criteria (Eval)
- [ ] A target molecule is entered and the retrosynthesis tree visualization renders showing at least one level of disconnection (target → precursors)
- [ ] A specific reaction step in the tree is clicked and its details (reagents, conditions, yield) are displayed
- [ ] Multiple synthesis pathways are shown and one is selected as the preferred route

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "NatureOS" in header or navigate to /natureos
4. In sidebar, expand "Apps" or "Tools" section
5. Click "Retrosynthesis"
6. Wait for tool viewport to load (you'll see a title bar reading "Retrosynthesis")
7. An input area for the target molecule and a tree visualization canvas will appear
8. Enter a target molecule to generate retrosynthetic pathways displayed as a reaction tree

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Tool viewport title bar "Retrosynthesis" | Top of content area | Confirms tool is loaded |
| Target molecule input (search bar or structure editor) | Top of viewport | Enter the molecule you want to synthesize |
| SMILES/InChI input field | In target input area | Paste a SMILES string for precise molecule specification |
| "Analyze" or "Generate Pathways" button | Next to input field | Click to start retrosynthetic analysis |
| Retrosynthesis tree (node-and-edge diagram) | Center of viewport, large area | Tree grows downward/outward — target at top, precursors below |
| Target molecule node (top of tree, highlighted) | Top-center of tree | The molecule you want to make — usually with a colored border |
| Reaction step arrows (downward arrows between nodes) | Between molecule nodes in tree | Each arrow represents a synthetic transformation |
| Precursor molecule nodes (below reaction arrows) | Lower levels of tree | Starting materials and intermediates |
| Reaction detail panel | Right side or popup on click | Shows reagents, conditions, expected yield, literature references |
| Pathway selector/ranker | Left panel or above tree | Lists alternative pathways ranked by score (fewest steps, highest yield, cheapest) |
| Pathway score indicators | Next to each pathway option | Numerical scores or star ratings |
| Zoom/Pan controls for tree | Bottom-right of canvas or via mouse | Zoom into specific branches, pan to explore wide trees |
| "Commercially Available" badges | On precursor nodes | Green badges indicate purchasable starting materials |
| Expand/Collapse branch controls | On intermediate nodes | Click +/- to show or hide deeper retrosynthetic levels |

## Core Actions
### Action 1: Generate retrosynthetic pathways for a target
**Goal:** Input a target molecule and view proposed synthesis routes
1. Locate the target molecule input at the top of the viewport
2. Type a compound name (e.g., "psilocybin") or paste a SMILES string
3. Click "Analyze" or "Generate Pathways"
4. Wait for the analysis to complete — a loading indicator may appear briefly
5. The retrosynthesis tree will render: the target molecule at the top, with downward arrows leading to precursor molecules
6. Each level deeper represents one synthetic step backward
7. Leaf nodes (bottom of tree) marked with green "Commercially Available" badges are purchasable starting materials
8. The pathway selector on the left will show ranked alternative routes

### Action 2: Inspect a reaction step
**Goal:** View details of a specific transformation in the synthesis tree
1. Click on a reaction arrow or the connection between two molecule nodes in the tree
2. A reaction detail panel will appear (right side or popup) showing:
   - Reaction type (e.g., phosphorylation, reduction, coupling)
   - Required reagents and catalysts
   - Reaction conditions (temperature, solvent, time)
   - Expected yield percentage
   - Literature references (clickable DOI links)
3. Review the conditions to assess feasibility
4. Click on different reaction arrows to compare steps across the pathway

### Action 3: Compare and select synthesis pathways
**Goal:** Evaluate multiple routes and choose the most practical one
1. Look at the pathway selector/ranker panel (left side or top)
2. Multiple pathways will be listed with scores — ranked by criteria like: fewest steps, highest overall yield, lowest cost, greenest chemistry
3. Click on a pathway to highlight it in the tree — the selected route will be emphasized with bold lines or a different color
4. Compare pathways: a 3-step route with 60% yield vs. a 5-step route with 85% yield
5. Check which pathways have all commercially available starting materials (green badges on all leaf nodes)
6. Select the preferred pathway — it may be marked with a star or "Select" button
7. The selected pathway can be exported as a synthesis plan

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "No pathways found" after analysis | Molecule is too complex or not in the database | Try a simpler target; verify the SMILES string is correct |
| Tree renders but only one level deep | Analysis may still be running or limited data | Wait for full analysis; click expand (+) on precursor nodes to generate deeper levels |
| Molecule name not recognized in search | Name variant not in database | Use SMILES notation instead of common name for precise input |
| Tree is too wide to view all branches | Many alternative disconnections found | Use zoom out (scroll) and pan (drag empty space) to navigate; collapse branches you are not interested in |
| Reaction details show "No data" for some steps | Specific transformation lacks literature data | This step may be theoretical; verify feasibility with lab-compound-simulator |

## Composability
- **Prerequisite skills**: platform-navigation, platform-natureos-dashboard
- **Next skills**: lab-compound-simulator (analyze individual compounds in the pathway), lab-alchemy (perform virtual reactions along the route), lab-petri-dish (test biosynthetic routes using organisms)

## Computer Use Notes
- Tool viewport shows loading state before content appears — wait for title bar
- State persists via Supabase — target molecules, generated trees, and selected pathways survive page reload
- The tree visualization is the primary interaction surface — it supports zoom (scroll), pan (drag), and click (select nodes/edges)
- Trees can be deep (5+ levels) and wide (many branches) — use expand/collapse controls to manage complexity
- "Commercially Available" badges on leaf nodes are key for practical synthesis planning
- Retrosynthetic analysis works backward: target → intermediates → starting materials (top-to-bottom in the tree)

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
