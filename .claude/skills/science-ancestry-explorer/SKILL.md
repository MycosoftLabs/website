---
description: Use when browsing fungal taxonomy at mycosoft.com/ancestry/explorer — navigating the taxonomic tree from kingdom to species, viewing species detail pages, or exploring evolutionary relationships.
---

# Ancestry Explorer

## Identity
- **Category**: science
- **Access Tier**: PUBLIC (no login required)
- **Depends On**: platform-navigation
- **Route**: `/ancestry/explorer` (main), `/ancestry/species/[id]` (species detail), `/ancestry/taxonomy/[rank]/[name]` (taxonomy level)
- **Key Components**: Taxonomy tree browser, species detail pages, genealogy/evolutionary relationship visualization, rank navigation breadcrumbs

## Success Criteria (Eval)
- [ ] Taxonomy browser loads showing the top-level ranks (Kingdom Fungi and its phyla)
- [ ] Clicking through ranks navigates down the tree: Kingdom > Phylum > Class > Order > Family > Genus > Species
- [ ] A species detail page loads at /ancestry/species/[id] with images, description, and classification
- [ ] Evolutionary relationship visualization renders showing connections between related taxa

## Navigation Path (Computer Use)
1. Open browser to `mycosoft.com` — you see the homepage.
2. Click **Ancestry** in the top navigation bar — you arrive at the Ancestry section.
3. Click **Explorer** — the taxonomy browser loads at `/ancestry/explorer`.
4. Alternatively, navigate directly to `mycosoft.com/ancestry/explorer`.

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Taxonomy tree or hierarchical list starting with "Kingdom: Fungi" | Left sidebar or main content area | Click a taxon name to expand its children or navigate to that rank |
| Breadcrumb trail showing current position (e.g., "Fungi > Basidiomycota > Agaricomycetes > Agaricales") | Top of the content area, horizontal text trail | Click any breadcrumb level to jump back to that rank |
| Rank-level page showing all members of the selected rank as cards or a list (e.g., all Orders within Agaricomycetes) | Main content area | Click a card/item to drill down to the next rank |
| Species cards with thumbnail image, scientific name (italicized), common name, and brief description | Grid or list layout when browsing at genus or species level | Click a card to open the species detail page |
| Species detail page showing: large hero image, full scientific name, common name, taxonomic classification sidebar, description text, distribution map, related species | Full page at `/ancestry/species/[id]` | Scroll to read; click related species links to navigate |
| Taxonomic classification sidebar (vertical list: Kingdom, Phylum, Class, Order, Family, Genus, Species with the current species highlighted) | Right sidebar or left sidebar on species detail page | Click any rank to navigate to that taxonomy level page |
| Genealogy/evolutionary relationship visualization (tree diagram or network graph showing how species are related) | Dedicated section on the explorer page or species detail page | Hover over nodes to see taxon names; click nodes to navigate; drag to pan |
| Search box labeled "Search taxonomy..." | Top of the explorer page | Type a species or genus name to jump directly to it |
| Rank filter buttons (Kingdom, Phylum, Class, etc.) | Top filter bar on the explorer page | Click a rank button to view all taxa at that level |

## Core Actions
### Action 1: Browse Taxonomy Top-Down
**Goal:** Navigate from Kingdom Fungi down to a specific species.
1. On the explorer page, you see "Kingdom: Fungi" as the top-level entry.
2. Click **Fungi** to expand — phyla appear (Basidiomycota, Ascomycota, etc.).
3. Click a phylum (e.g., **Basidiomycota**) — classes appear, and the URL updates to `/ancestry/taxonomy/phylum/Basidiomycota`.
4. Continue clicking through: Class > Order > Family > Genus.
5. At the genus level, species cards with images appear.
6. Click a species card to open its detail page at `/ancestry/species/[id]`.

### Action 2: View a Species Detail Page
**Goal:** See complete information about a specific fungal species.
1. Navigate to a species via taxonomy browsing or search.
2. The species detail page shows: hero image, scientific name in italics, common name, full taxonomic classification, text description, geographic distribution.
3. Scroll down for additional sections: related species, observation data, external links.
4. The taxonomic classification sidebar lets you click any rank to jump to that level.

### Action 3: Search for a Species Directly
**Goal:** Jump to a species or taxon without browsing through every rank.
1. Click the search box at the top of the explorer page.
2. Type a name (e.g., "Amanita muscaria" or "Agaricales").
3. Suggestions appear as you type — click the matching suggestion.
4. You are taken directly to the species detail page or the taxonomy rank page.

### Action 4: Explore Evolutionary Relationships
**Goal:** Visualize how species or taxa are related.
1. Look for the genealogy/evolutionary visualization section on the explorer page or within a species detail page.
2. The visualization shows a tree or network diagram with nodes representing taxa and edges representing evolutionary relationships.
3. Hover over nodes to see taxon names and divergence information.
4. Click a node to navigate to that taxon's page.
5. Use mouse drag to pan and scroll to zoom within the visualization.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Empty taxonomy tree or "No data available" | Data failed to load from the backend | Refresh the page; check network connectivity |
| Clicking a taxon does nothing | Tree node is a leaf with no children, or the interaction is on a non-clickable area | Try double-clicking; look for an expand arrow icon next to the name |
| Species detail page shows 404 | Invalid species ID in the URL | Go back to the explorer and search for the species by name |
| Genealogy visualization is blank or shows a loading spinner indefinitely | Large dataset or rendering error | Refresh the page; try viewing at a higher taxonomic rank (fewer nodes) |
| Breadcrumbs are missing | Navigated directly to a deep URL without going through the tree | Click "Explorer" to return to the root and browse down |

## Composability
- **Prerequisite skills**: platform-navigation
- **Next skills**: science-species-explorer (to see observations of a species on a map), science-genetics-tools (to analyze genomic data for a species), science-compounds-search (to find chemical compounds associated with a species)

## Computer Use Notes
- Species names are displayed in italics following biological convention — do not be confused by the italic styling when reading text.
- The taxonomy tree may be rendered as an interactive SVG or collapsible HTML tree — click on the text labels or expand/collapse icons.
- The evolutionary visualization may be a D3.js or canvas-based graph — interact by clicking at coordinates.
- URLs are human-readable: `/ancestry/taxonomy/order/Agaricales` or `/ancestry/species/123` — you can construct them manually.
- No login is required; this is a fully public tool.

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
