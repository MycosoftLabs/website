---
description: Use when searching for chemical compounds at mycosoft.com/compounds — looking up compounds by name, formula, or properties, viewing molecular structures, bioactivity data, and source organisms. Freemium access with limited results for anonymous users.
---

# Compounds Search

## Identity
- **Category**: science
- **Access Tier**: FREEMIUM (anonymous users see limited results; authenticated users get full access)
- **Depends On**: platform-navigation
- **Route**: `/compounds` (search), `/compounds/[id]` (compound detail)
- **Key Components**: Compound search engine, molecular structure viewer (3D/2D), bioactivity data table, source organism links, chemical property cards

## Success Criteria (Eval)
- [ ] Compounds search page loads with a search bar and category filters
- [ ] Searching by name or formula returns a list of matching compounds with preview cards
- [ ] Compound detail page shows molecular structure, properties, bioactivity data, and source organisms
- [ ] Anonymous users see results but with a visible limit/paywall for full access

## Navigation Path (Computer Use)
1. Open browser to `mycosoft.com` — you see the homepage.
2. Click **Compounds** in the top navigation bar.
3. You arrive at `/compounds` showing the compound search interface.
4. Alternatively, navigate directly to `mycosoft.com/compounds`.

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Search bar with placeholder "Search compounds by name, formula, or CAS number..." | Top-center of the page, prominent | Click and type your query, then press Enter or click the search icon |
| Category/property filter chips or dropdowns (e.g., "Bioactive", "Toxin", "Pigment", "Antibiotic") | Below the search bar, horizontal row of clickable chips | Click a chip to filter results to that compound category |
| Search results grid/list — compound cards showing: compound name, molecular formula, small 2D structure diagram, source organism | Main content area below filters | Scroll through results; click a card to open the compound detail page |
| "Showing X of Y results — Sign in for full access" banner (for anonymous users) | Top of results area or as an overlay | Click "Sign In" to authenticate for unlimited results, or continue with limited view |
| Compound detail page: large molecular structure viewer (3D rotatable model or 2D diagram), compound name, IUPAC name, molecular formula, molecular weight | Top section of `/compounds/[id]` page | Rotate 3D model by clicking and dragging; read properties in the info panel |
| Chemical properties table (molecular weight, melting point, solubility, LogP, etc.) | Below the structure viewer on the detail page | Read the table; values may include units and uncertainty ranges |
| Bioactivity data section (table or cards showing: activity type, target, IC50/EC50 values, assay reference) | Middle section of the detail page | Scroll through to see biological activity data |
| Source organisms section (list of fungal species that produce this compound, with links) | Lower section of the detail page | Click a species name to navigate to its page (links to ancestry explorer) |
| Molecular formula displayed with subscript numbers (e.g., C10H12N2O) | On compound cards and detail pages | Use for reference; can be copied for external searches |
| Download/export buttons ("Download SDF", "Download MOL", "Export CSV") | On the detail page, near the structure viewer or in a toolbar | Click to download molecular data files |
| Related compounds section | Bottom of the detail page | Click to view structurally or functionally related compounds |

## Core Actions
### Action 1: Search for a Compound by Name
**Goal:** Find a specific chemical compound in the database.
1. Click the search bar on the `/compounds` page.
2. Type the compound name (e.g., "psilocybin" or "amatoxin").
3. Press Enter — search results appear as compound cards.
4. Scan the results for the desired compound; click its card to open the detail page.

### Action 2: Search by Molecular Formula
**Goal:** Find compounds matching a specific chemical formula.
1. Click the search bar.
2. Type the molecular formula (e.g., "C12H17N2O4P").
3. Press Enter — matching compounds appear.
4. If multiple results, use the property filters to narrow down.

### Action 3: View Compound Details and Structure
**Goal:** Examine a compound's molecular structure, properties, and bioactivity.
1. Click a compound card from search results to open `/compounds/[id]`.
2. The molecular structure viewer loads at the top — a 3D rotatable model or 2D diagram.
3. Click and drag on the 3D model to rotate it; scroll to zoom in/out.
4. Below the viewer, read the chemical properties table: molecular weight, formula, melting point, etc.
5. Scroll further to the bioactivity section for biological activity data (IC50 values, target organisms/proteins).
6. Continue scrolling to see source organisms — the fungal species that produce this compound.

### Action 4: Filter by Compound Category
**Goal:** Browse compounds of a specific type.
1. On the search page, look for category filter chips below the search bar.
2. Click a chip (e.g., "Bioactive", "Toxin", "Pigment", "Antibiotic").
3. Results update to show only compounds in that category.
4. Combine with a text search for more specific results.

### Action 5: Download Molecular Data
**Goal:** Export compound data for use in external tools.
1. Navigate to a compound detail page.
2. Find the download buttons near the structure viewer (e.g., "Download SDF", "Download MOL").
3. Click the desired format — the file downloads to your computer.
4. For tabular data, click "Export CSV" to get properties and bioactivity data in spreadsheet format.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Showing 5 of 200+ results" with a sign-in prompt | Anonymous access limits results | Sign in for full access; the first 5 results are still usable |
| No search results | Query is too specific or uses a non-standard name | Try alternate names (common name, IUPAC name, CAS number); broaden the search |
| 3D structure viewer shows a blank box or "WebGL not supported" | Browser does not support WebGL or GPU acceleration is disabled | Try a different browser (Chrome recommended); enable hardware acceleration in browser settings |
| Bioactivity section says "No data available" | No bioactivity assays have been recorded for this compound | This is expected for less-studied compounds; check external databases like PubChem |
| Source organisms section is empty | Compound not yet linked to a source organism in the database | The compound may be synthetic or the link is not yet established |
| Compound detail page shows 404 | Invalid compound ID in URL | Return to search and find the compound by name |

## Composability
- **Prerequisite skills**: platform-navigation
- **Next skills**: science-ancestry-explorer (to view taxonomy of source organisms), science-genetics-tools (to explore genes responsible for compound biosynthesis), science-mindex-database (to find raw data records for the compound)

## Computer Use Notes
- The 3D molecular structure viewer is typically a WebGL canvas — interact by clicking and dragging at coordinates, not via DOM selectors.
- Molecular formulas use subscript Unicode characters (e.g., C10H12) — when typing in search, use plain numbers (e.g., "C10H12").
- The freemium paywall is soft — you can still see some results and compound names without logging in.
- Compound IDs in URLs are typically numeric (e.g., `/compounds/42`) — you can bookmark or share these URLs.
- Large molecular structures may take a moment to render in 3D — wait for the model to appear before interacting.

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
