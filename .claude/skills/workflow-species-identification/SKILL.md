---
description: End-to-end species identification workflow composing search, species explorer, MINDEX database, and ancestry explorer for biological specimen identification.
---

# Species Identification Workflow

## Identity
- **Category**: workflows
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-search, science-species-explorer, science-mindex-database, science-ancestry-explorer
- **Route**: Multiple routes (workflow spans several tools)
- **Key Components**: Composed from platform-search, science-species-explorer, science-mindex-database, science-ancestry-explorer components

## Success Criteria (Eval)
- [ ] Search returns relevant species results from the platform search
- [ ] Species Explorer heatmap renders with observation markers on the map
- [ ] Clicking an observation marker opens species detail with taxonomy and description
- [ ] MINDEX record is accessible showing genomic data for the identified species
- [ ] Ancestry Explorer displays evolutionary tree context for the species

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in (see platform-authentication skill)
2. Use the platform search bar to search for a species name
3. From search results, click through to the Species Explorer
4. On the Species Explorer heatmap, click an observation marker
5. View the species detail panel with full taxonomy
6. Navigate to MINDEX database to check genomic data for the species
7. Open Ancestry Explorer to view evolutionary relationships

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Platform search bar | Header area | Type species name and press Enter |
| Search results list | Main content area | Click on a species result to open Species Explorer |
| Species Explorer heatmap | Full viewport map | Shows observation density; click markers for details |
| Observation markers (colored dots/clusters) | On the heatmap map | Click individual markers to view species at that location |
| Species detail panel | Side panel or modal | Displays taxonomy, common name, description, images |
| "View Genomic Data" or MINDEX link | In species detail panel | Click to navigate to MINDEX record |
| MINDEX record page | Full page | Shows genomic sequences, gene annotations, molecular data |
| "View Ancestry" or Ancestry link | In species detail or MINDEX | Click to open Ancestry Explorer |
| Ancestry evolutionary tree | Full viewport | Interactive tree showing evolutionary relationships |

## Core Actions
### Action 1: Search for a species
**Goal:** Find a target species using platform search
1. Click on the search bar in the header
2. Type the species name (common or scientific name)
3. Press Enter or click the search icon
4. Review results -- species entries show name, thumbnail, and category
5. Click the relevant species result

### Action 2: Explore species distribution on heatmap
**Goal:** View geographic distribution of observations
1. The Species Explorer opens with a heatmap showing observation density
2. Colored regions indicate observation concentration (red=high, blue=low)
3. Zoom into a region of interest using scroll or zoom controls
4. Individual observation markers become visible at higher zoom levels
5. Click on a specific marker to see observation details

### Action 3: View species detail
**Goal:** Get full taxonomic and descriptive information
1. After clicking an observation marker, the species detail panel opens
2. Review: scientific name, common name, family, order, class, phylum
3. Read the description for habitat, behavior, and identification notes
4. View attached images for visual confirmation
5. Note any conservation status or rarity indicators

### Action 4: Check MINDEX genomic data
**Goal:** Access molecular and genomic information for the species
1. In the species detail panel, click "View Genomic Data" or the MINDEX link
2. The MINDEX record page loads with genomic data
3. Review gene sequences, annotations, and molecular markers
4. Check for DNA barcoding data useful for field identification
5. Note any flagged genomic variants or research notes

### Action 5: Browse evolutionary context in Ancestry Explorer
**Goal:** Understand the species' evolutionary relationships
1. From species detail or MINDEX, click "View Ancestry" or the Ancestry link
2. The Ancestry Explorer loads an interactive evolutionary tree
3. The target species is highlighted on the tree
4. Explore related species by clicking adjacent nodes
5. Zoom out to see broader evolutionary context (family, order level)
6. Use the tree to identify closely related species for comparison

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Search returns no results | Species name misspelled or not in database | Try alternative names (common vs. scientific); broaden search terms |
| Heatmap loads but shows no observations | No recorded observations for this species | Try a different species or broader taxonomic search |
| Species detail panel is empty | Data not available for selected observation | Try clicking a different observation marker |
| MINDEX link missing from species detail | No genomic data available for this species | Not all species have MINDEX records; note for future research |
| Ancestry tree shows "No data" | Species not yet placed in evolutionary database | Check if species is recently described; try a parent taxon |

## Composability
- **Prerequisite skills**: platform-authentication, platform-search
- **Next skills**: workflow-research-pipeline (continue with research after identification), workflow-environmental-report (contextualize species in environmental data)

## Computer Use Notes
- This is a multi-tool workflow -- each step navigates to a different route/tool
- Allow loading time between tools (2-5 seconds per transition)
- Species Explorer heatmap is map-based -- uses Leaflet or Mapbox; scroll to zoom, drag to pan
- MINDEX records may contain large genomic datasets -- page may take extra time to load
- Ancestry Explorer tree is interactive -- click nodes to expand/collapse branches
- Breadcrumb navigation helps track position in the workflow across tools

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
