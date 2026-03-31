---
description: Use mycosoft.com Fluid Search — Ctrl+K shortcut, responsive search across species, compounds, and research with voice support
---

# Platform Search

## Identity
- **Category**: platform
- **Access Tier**: FREEMIUM (10 daily searches anonymous, unlimited authenticated)
- **Depends On**: platform-navigation
- **Route**: /search
- **Key Components**: search components in components/, app/search/page.tsx

## Success Criteria (Eval)
- [ ] Trigger search via Ctrl+K (or Cmd+K) keyboard shortcut
- [ ] Search for a fungal species by name and get results
- [ ] Search for a chemical compound and navigate to its detail page
- [ ] Understand responsive layout (phone=MYCA chat, tablet=canvas, desktop=3-panel)
- [ ] Navigate from search results to target page

## Navigation Path (Computer Use)
1. From any page on mycosoft.com, press Ctrl+K (or Cmd+K on macOS)
2. Search overlay/dialog appears with text input focused
3. Alternatively: click the magnifying glass icon in the header (top-right area)
4. Or navigate directly to `https://mycosoft.com/search`
5. Type query in the search input
6. Results appear below as you type (debounced)

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|----------------|-----------------|------------|
| Magnifying glass icon | Header, top-right area | Click to open search |
| Search overlay/dialog | Center of screen (modal) | Type query |
| Search input field | Top of search panel | Type search terms |
| Search results list | Below search input | Click a result to navigate |
| Result cards | Main content area | Show title, description, type badge |
| Filter buttons/tabs | Near top of results | Click to filter by type (Species, Compounds, Research, etc.) |
| "No results" message | Center of results area | Try different search terms |
| Voice search icon | In or near search input | Click to use voice search (if available) |

## Responsive Behavior
| Viewport | Layout | Description |
|----------|--------|-------------|
| **Phone** (<640px) | MYCA Chat interface | Search feels like chatting with MYCA — single column, conversational |
| **Tablet** (640-1024px) | Fluid Canvas | Visual canvas-style results layout |
| **Desktop** (>1024px) | 3-panel layout | Left: chat/input, Center: canvas/results, Right: notepad/details |

## Core Actions

### Action 1: Quick Search via Ctrl+K
1. Press Ctrl+K from any page
2. Search dialog appears centered on screen
3. Input is auto-focused — start typing immediately
4. Results appear as you type (debounced ~300ms)
5. Use arrow keys to navigate results, Enter to select
6. Press Escape to close without navigating

### Action 2: Search for Species
1. Open search, type species name (e.g., "Amanita muscaria")
2. Results show species cards with images, taxonomy, observation count
3. Click a species result to navigate to its detail page
4. Species results link to `/natureos/mindex/explorer` or `/species/{id}`

### Action 3: Search for Compounds
1. Open search, type compound name (e.g., "psilocybin")
2. Results show compound cards with molecular formula, bioactivity
3. Click to navigate to `/compounds/{id}`

### Action 4: Full Search Page
1. Navigate to `/search` directly
2. Full search interface with filters, categories, and rich results
3. Filter by type: Species, Compounds, Research Papers, Devices
4. Results include entity-rich cards with previews

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|-------------|-----------------|------------|
| Ctrl+K doesn't work | Focus is in a text input or code editor | Click outside the input first |
| "Rate limit reached" | Anonymous user hit 10 daily search limit | Sign in to get unlimited searches |
| No results for valid species | Spelling or typo | Try partial name or common name |
| Voice search unavailable | Browser doesn't support Web Speech API | Use text search instead |
| Search is slow | Network latency or large result set | Wait, or add more specific terms |

## Composability
- **Prerequisite skills**: platform-navigation
- **Next skills**: science-species-explorer, science-compounds-search, science-ancestry-explorer

## Computer Use Notes
- Ctrl+K opens a modal/overlay — it's not a page navigation
- Search is debounced — wait 300-500ms after typing before reading results
- Results may lazy-load images — wait for them to appear
- On mobile, the search experience transforms into a MYCA-like chat interface
- The search input supports voice via Web Speech API where available
- Freemium limit is tracked per IP for anonymous users, per account for authenticated

## Iteration Log
### Attempt Log
<!-- Populated by Computer Use recursive learning -->
