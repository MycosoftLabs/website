---
description: Use when navigating or using the Genetics Tools at mycosoft.com/natureos/genetics — performing DNA sequence visualization, phylogenetic analysis, or genetic marker identification for fungal species. Requires authentication.
---

# Genetics Tools

## Identity
- **Category**: science
- **Access Tier**: AUTHENTICATED (requires any logged-in user account)
- **Depends On**: platform-authentication, platform-navigation, platform-natureos-dashboard
- **Route**: `/natureos/genetics`
- **Key Components**: DNA sequence viewer, phylogenetic tree builder, genetic marker panel, sequence alignment tool, FASTA/GenBank import

## Success Criteria (Eval)
- [ ] Genetics Tools page loads with the main tool selection interface visible
- [ ] A DNA sequence is loaded and rendered as a color-coded nucleotide strip or circular visualization
- [ ] Phylogenetic analysis generates a tree diagram showing evolutionary relationships
- [ ] Genetic markers are identified and highlighted on the sequence view

## Navigation Path (Computer Use)
1. Open browser to `mycosoft.com` — you see the homepage.
2. If not logged in, click "Sign In" in the top-right and authenticate with your credentials.
3. Click **NatureOS** in the top navigation bar.
4. Click **Genetics** or **Genetics Tools** in the NatureOS submenu.
5. You arrive at `/natureos/genetics` showing the genetics tool suite landing page.

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Genetics Tools header with tool selection cards: "Sequence Viewer", "Phylogenetic Analysis", "Marker Identification" | Top-center area, displayed as clickable cards with icons | Click the card for the tool you want to use |
| Sequence input area (text box with placeholder "Paste FASTA sequence or upload file...") | Center of the page after selecting Sequence Viewer | Paste a DNA sequence in FASTA format or click "Upload" to load a file |
| Upload button (labeled "Upload" or with a file icon) | Near the sequence input area | Click to open a file picker for FASTA, GenBank, or other sequence files |
| DNA sequence visualization — a horizontal strip of color-coded letters (A=green, T=red, C=blue, G=yellow) or a circular genome map | Main content area after a sequence is loaded | Scroll horizontally to navigate the sequence; click a region to zoom in |
| Nucleotide position ruler (numbered scale above or below the sequence) | Directly above or below the sequence strip | Use as reference for position; click a position to jump there |
| Gene annotations (colored blocks or arrows overlaid on the sequence, labeled with gene names) | Overlaid on the sequence visualization | Hover over an annotation to see gene name and function; click for full details |
| Phylogenetic tree (branching diagram with species names at the leaf nodes) | Main content area after running phylogenetic analysis | Click a branch node to collapse/expand; click a leaf to see species details |
| Genetic marker table (list of markers with columns: Marker ID, Position, Type, Significance) | Below or beside the sequence view after running marker identification | Click a marker row to highlight its position on the sequence |
| Species selector dropdown (to choose which species genome to load) | Top of the tool area, labeled "Select Species" | Click and choose from the list, or type to search |
| Analysis parameters panel (settings for alignment method, bootstrap values, etc.) | Sidebar or modal when configuring an analysis | Adjust parameters before clicking "Run Analysis" |
| "Run Analysis" button (prominent, colored button) | Bottom of the parameter panel or below the input area | Click to start the analysis; a progress indicator appears |
| Progress bar or spinner during analysis | Center of content area | Wait for analysis to complete; do not navigate away |
| Results panel with downloadable outputs (Newick tree file, marker CSV, annotated sequence) | Below the visualization after analysis completes | Click "Download" buttons to save results |

## Core Actions
### Action 1: Visualize a DNA Sequence
**Goal:** Load and view a fungal genome sequence.
1. Click the **Sequence Viewer** card on the Genetics Tools landing page.
2. Paste a FASTA-format sequence into the input text box, or click **Upload** to select a file.
3. Click **Load** or **Visualize** — the sequence renders as a color-coded nucleotide strip.
4. Scroll horizontally to navigate; use the position ruler for reference.
5. Hover over colored annotation blocks to see gene names and functions.

### Action 2: Run Phylogenetic Analysis
**Goal:** Generate a phylogenetic tree showing evolutionary relationships.
1. Click the **Phylogenetic Analysis** card on the landing page.
2. Select species or upload multiple sequences for comparison.
3. Configure analysis parameters in the sidebar: alignment method (e.g., MUSCLE, ClustalW), tree-building method (e.g., Maximum Likelihood, Neighbor-Joining), bootstrap replicates.
4. Click **Run Analysis** — a progress bar appears.
5. When complete, the phylogenetic tree renders as an interactive branching diagram.
6. Click branch nodes to collapse/expand clades; click leaf nodes to view species details.

### Action 3: Identify Genetic Markers
**Goal:** Find and annotate significant genetic markers in a sequence.
1. Load a sequence using the Sequence Viewer (Action 1).
2. Click the **Marker Identification** tab or button.
3. The system scans the sequence and populates a marker table with: Marker ID, chromosomal position, type (SNP, insertion, deletion), and biological significance.
4. Click a row in the marker table — the sequence view scrolls to and highlights that marker position.
5. Click **Export Markers** to download the results as CSV.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Redirect to login page | Not authenticated | Sign in with any valid user account |
| "Invalid sequence format" error | Pasted text is not valid FASTA or the file format is unsupported | Check that the sequence starts with ">" followed by a header line, then nucleotide characters (A, T, C, G, N) |
| Phylogenetic analysis hangs or times out | Too many sequences or too many bootstrap replicates | Reduce the number of input sequences or lower bootstrap replicates |
| Blank sequence viewer | Sequence loaded but rendering failed | Refresh the page and re-upload; check that the sequence is not empty |
| Marker table is empty after analysis | No significant markers found at current threshold | Lower the significance threshold in the parameters panel |
| "Species not found" when using species selector | Species is not in the MINDEX genome database | Verify the species name spelling; try searching by genus only |

## Composability
- **Prerequisite skills**: platform-authentication (must be logged in), platform-navigation, platform-natureos-dashboard
- **Next skills**: science-genomics-visualization (for advanced visualization with JBrowse2, Gosling.js, Circos), science-mindex-database (to retrieve genome records for analysis), science-ancestry-explorer (to browse taxonomy of analyzed species)

## Computer Use Notes
- The sequence viewer may render on an HTML5 canvas — interact by clicking at coordinates rather than trying to select DOM text elements.
- Large genomes take time to load; watch for a progress indicator before interacting.
- Phylogenetic trees are interactive SVG or canvas elements — click on branch points and leaf labels directly.
- FASTA files must use standard nucleotide characters; protein sequences are not supported in this tool.
- Analysis results are not saved automatically — download them before navigating away.

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
