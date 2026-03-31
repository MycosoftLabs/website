---
description: Use when working with genomics visualization tools within NatureOS — including JBrowse2 linear genome browser, Gosling.js multi-track circular visualization, Circos circular genome plots, Ideogram chromosome views, GC content analysis, gene annotations, pathway diagrams, and phylogeny circles.
---

# Genomics Visualization

## Identity
- **Category**: science
- **Access Tier**: AUTHENTICATED (requires login; visualization tools are within NatureOS)
- **Depends On**: platform-authentication, platform-navigation, platform-natureos-dashboard, science-genetics-tools
- **Route**: Multiple routes within NatureOS (accessed from genetics/genomics sections)
- **Key Components**: JBrowseViewerLazy (JBrowse2 linear genome browser), GenomeTrackViewerLazy (Gosling.js multi-track circular), CircosViewerLazy (Circos circular plots), Ideogram (chromosome visualization). All lazy-loaded via `components/performance/lazy-registry.tsx`.

## Success Criteria (Eval)
- [ ] At least one genomics visualization tool loads and renders a genome view (linear browser, circular plot, or chromosome ideogram)
- [ ] User can navigate within the visualization (pan, zoom, select tracks)
- [ ] GC content analysis or gene annotation data is visible within a viewer
- [ ] Visualization components load on demand without blocking page render (lazy-loading works)

## Navigation Path (Computer Use)
1. Open browser to `mycosoft.com` and sign in if not already authenticated.
2. Click **NatureOS** in the top navigation bar.
3. Navigate to the **Genetics** or **Genomics** section within NatureOS.
4. Select a genome or species to visualize — the page loads the appropriate viewer.
5. Visualization components (JBrowse2, Gosling.js, Circos, Ideogram) load lazily when their section becomes visible or is selected.

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Loading placeholder or spinner where a visualization will appear | Main content area | Wait for the lazy-loaded component to finish loading; a progress bar or skeleton UI may appear |
| **JBrowse2 linear genome browser**: horizontal track view with a reference sequence ruler at top, gene annotation tracks below (colored rectangles representing genes), and navigation controls | Main content area, full-width | Pan by clicking and dragging on the track area; zoom with scroll wheel or the zoom slider; click a gene rectangle for details |
| JBrowse2 navigation bar with: chromosome/scaffold dropdown, position input field, zoom slider, track selector button | Top of the JBrowse2 viewer | Select a chromosome from the dropdown; type coordinates in the position field; click "Tracks" to add/remove visible tracks |
| JBrowse2 track list panel (list of available tracks with checkboxes: "Gene Annotations", "GC Content", "Variants", "RNA-Seq Coverage") | Sidebar or dropdown panel when "Tracks" is clicked | Check/uncheck tracks to show or hide them in the viewer |
| **Gosling.js circular visualization**: concentric rings showing multiple data tracks (e.g., outer ring = chromosomes, middle ring = gene density, inner ring = GC content) arranged in a circle | Main content area | Hover over segments to see data values; click a segment to zoom into that region; use controls to toggle tracks |
| Gosling.js track legend (color key explaining what each ring represents) | Below or beside the circular visualization | Read to understand which ring shows which data |
| **Circos circular genome plot**: static or interactive circular diagram with colored arcs representing chromosomes, ribbons connecting syntenic regions, and data tracks as histograms or heatmaps along the circle | Main content area | Hover over ribbons to see connection details; click arcs to highlight regions; may have a toolbar for export |
| **Ideogram chromosome view**: stylized chromosome shapes (banded rectangles) arranged in a karyotype layout, with colored bands showing cytogenetic regions | Main content area or sidebar | Click a chromosome to select it; colored highlights may indicate genes or markers of interest |
| GC content track (a line graph or heatmap showing GC percentage along the genome, typically green for high GC, blue for low) | Within JBrowse2 or Gosling.js as one of the data tracks | Read the fluctuations; peaks indicate GC-rich regions |
| Gene annotation track (colored rectangles or arrows on a horizontal line, each representing a gene, labeled with gene names) | Within JBrowse2 as a track | Click a gene to see: name, function, coordinates, strand direction |
| Pathway diagram (network or flowchart showing metabolic or biosynthetic pathways with enzyme nodes and compound edges) | Separate section or tab within genomics tools | Click enzyme nodes to see gene links; click compound nodes to link to compounds search |
| Phylogeny circle (circular tree showing evolutionary relationships, species at the tips, branch lengths proportional to divergence) | Separate section or tab | Hover over tips to see species names; click to navigate; drag to rotate the circle |
| Export/download button (camera icon or "Export" label) | Top-right corner of each visualization | Click to save the current view as PNG, SVG, or PDF |

## Core Actions
### Action 1: Browse a Genome with JBrowse2
**Goal:** Navigate a fungal genome linearly, viewing genes and features.
1. Load a genome in the genetics/genomics section — JBrowse2 viewer appears after lazy-loading.
2. Select a chromosome from the dropdown at the top of the viewer.
3. Type coordinates in the position field (e.g., "chr1:10000-50000") and press Enter to jump to that region.
4. Click the "Tracks" button to open the track selector.
5. Enable tracks of interest: "Gene Annotations", "GC Content", "Variants".
6. Pan by clicking and dragging on the track area; zoom with scroll wheel.
7. Click on a gene annotation rectangle to see a popup with gene name, function, and coordinates.

### Action 2: View Multi-Track Circular Visualization (Gosling.js)
**Goal:** See multiple genomic data tracks as concentric circles.
1. Navigate to the circular visualization section or select "Circular View" if a toggle exists.
2. The Gosling.js viewer loads showing concentric rings — each ring is a data track.
3. Read the legend to understand which ring corresponds to which data (chromosomes, gene density, GC content, etc.).
4. Hover over segments to see tooltips with data values.
5. Click a segment to zoom into that genomic region.
6. Some views allow track reordering — drag track labels if supported.

### Action 3: Generate a Circos Plot
**Goal:** Visualize genome-wide synteny, structural variants, or comparative data.
1. Navigate to the Circos visualization section.
2. The circular plot renders showing chromosomes as colored arcs around the perimeter.
3. Ribbons connecting arcs indicate syntenic (shared) regions between chromosomes or species.
4. Histograms or heatmaps along the inner edge show quantitative data (coverage, expression).
5. Hover over ribbons to see which regions they connect and their similarity scores.
6. Click "Export" to download the plot as SVG or PNG.

### Action 4: View Chromosome Ideogram
**Goal:** Get an overview of chromosome structure and banding.
1. Navigate to the chromosome/ideogram view.
2. Stylized chromosomes appear as banded rectangles in a karyotype layout.
3. Colored bands indicate cytogenetic regions; highlighted regions may mark genes or markers of interest.
4. Click a chromosome to select it — it may expand or trigger a detailed view.
5. Use alongside JBrowse2 to correlate chromosome position with sequence-level data.

### Action 5: Analyze GC Content
**Goal:** Examine GC content distribution across the genome.
1. In JBrowse2 or Gosling.js, enable the "GC Content" track.
2. A line graph or heatmap appears showing GC percentage along the genome.
3. Green peaks = GC-rich regions; blue valleys = AT-rich regions.
4. Zoom in to see GC content at finer resolution.
5. High GC regions may correlate with gene-dense areas.

### Action 6: Explore Pathway Diagrams
**Goal:** Visualize metabolic or biosynthetic pathways.
1. Navigate to the pathway diagram section within genomics tools.
2. A network or flowchart appears showing enzymes (nodes) and metabolic compounds (edges/nodes).
3. Click an enzyme node to see the gene encoding it and link to the genome browser.
4. Click a compound node to link to the compounds search page.
5. Follow the pathway flow to understand biosynthetic routes.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Spinner that never stops / "Loading component..." indefinitely | Lazy-loaded component failed to load (network issue or JavaScript error) | Refresh the page; check browser console for errors; ensure JavaScript is enabled |
| JBrowse2 shows "No tracks available" | Genome data not loaded or track configuration is missing | Select a genome/species first; check that data files are accessible |
| Circular visualization is blank or shows only axes | Data tracks are not enabled or dataset is empty | Check track toggles; try a different genome or dataset |
| "WebGL not supported" error | Browser lacks WebGL support needed by some visualizations | Use Chrome or Firefox with hardware acceleration enabled |
| Export button produces a blank image | Visualization was still rendering when export was triggered | Wait until all tracks and elements finish rendering, then try exporting again |
| Extremely slow rendering | Genome is very large or too many tracks are enabled | Disable unnecessary tracks; zoom into a smaller region before enabling all tracks |
| Redirect to login | Authentication session expired | Sign in again; these tools require an authenticated session |

## Composability
- **Prerequisite skills**: platform-authentication, platform-navigation, platform-natureos-dashboard, science-genetics-tools (to load sequence data for visualization)
- **Next skills**: science-mindex-database (to retrieve raw genome records), science-ancestry-explorer (to understand taxonomy context), science-compounds-search (via pathway diagram compound links)

## Computer Use Notes
- All visualization components are lazy-loaded from `components/performance/lazy-registry.tsx` — they appear only when needed, so expect a brief loading delay on first render.
- JBrowse2, Gosling.js, and Circos all render on HTML5 canvas or SVG — standard DOM text selection does not work inside them. Interact by clicking at pixel coordinates.
- Scroll-to-zoom inside visualization areas may capture scroll events — position the mouse cursor carefully.
- JBrowse2 has its own navigation bar separate from the page navigation — use the JBrowse2 controls (chromosome dropdown, position field) rather than the browser address bar.
- Circular visualizations (Gosling.js, Circos, phylogeny circles) may support rotation by dragging — be aware that dragging can rotate the view rather than panning.
- Screenshots of these visualizations are essential for verifying correct rendering — the visual output cannot be confirmed through DOM inspection alone.
- Large genomes with many tracks enabled can be resource-intensive — close unnecessary browser tabs to free memory.

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
