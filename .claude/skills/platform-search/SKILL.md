---
description: Use Fluid Search at mycosoft.com — Ctrl+K shortcut, responsive 3-layout system (phone=MYCA chat, tablet=canvas, desktop=3-panel), species/compound/research search, voice search, and draggable widget canvas
---

# Fluid Search

## Identity
- **Category**: platform
- **Access Tier**: FREEMIUM (search is available to all; some result types may have rate limits for anonymous users)
- **Depends On**: platform-authentication (user context for personalized results), ai-myca-chat (MYCA powers mobile chat and AI answers), platform-navigation (Search link in header)
- **Route**: `/search`, `/search?q=<query>`
- **Key Components**: `app/search/page.tsx`, `components/search/SearchLayout.tsx`, `components/search/fluid/FluidSearchCanvas.tsx`, `components/search/mobile/MobileSearchChat.tsx`, `components/search/SearchContextProvider.tsx`, `components/search/fluid/VoiceCommandPanel.tsx`, `components/command-search.tsx`

## Success Criteria (Eval)
- [ ] Agent can reach search via header "Search" link or Ctrl+K shortcut
- [ ] On phone (< 640px), the MYCA chat interface loads with rich data cards
- [ ] On tablet (640-1023px), the Fluid Search canvas loads with widget layout
- [ ] On desktop (1024px+), the full 3-panel layout renders (activity stream | canvas | live results + notepad)
- [ ] Agent can type a query and receive categorized widget results (species, chemistry, genetics, research, answers, media, location, news, CREP, earth, etc.)
- [ ] Agent can activate voice search via the microphone button
- [ ] Agent can drag and rearrange widgets on the canvas

## Navigation Path (Computer Use)
1. From any page, click "Search" in the header nav bar (magnifying glass icon + "Search" label).
2. Alternatively, press Ctrl+K (Cmd+K on Mac) to open the command search dialog for quick queries.
3. The `/search` page loads with a responsive layout based on viewport width.
4. Type a query in the search input field; results appear as categorized widgets.
5. On desktop, toggle side panels using edge tabs (Activity on left, Notepad on right).

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| Search input with magnifying glass icon | Top-center of search canvas (tablet/desktop) or top of chat (mobile) | Type query; press Enter or wait for debounced search |
| Microphone button (Mic icon) | Right side of search input | Click to start voice search; click again (MicOff) to stop |
| Sparkles icon | Near search input | Indicates MYCA AI mode is active |
| Mycelium particle background | Behind widgets on canvas | Decorative; green particles with connection lines |
| Species widget (mushroom/fungi results) | Canvas area, draggable | Shows species matches with thumbnails; click for detail |
| Chemistry widget (compound results) | Canvas area, draggable | Shows compound matches with molecular data |
| Genetics widget | Canvas area, draggable | Shows genetics/genome results |
| Research widget | Canvas area, draggable | Shows research papers and documents |
| Answers widget (AI-generated) | Canvas area, draggable | MYCA-powered AI summary of query |
| Media widget | Canvas area, draggable | Shows images, videos related to query |
| Location widget | Canvas area, draggable | Shows map observations with lat/lng data |
| News widget | Canvas area, draggable | Shows recent news articles |
| CREP widget | Canvas area, draggable | Shows CREP environmental data |
| Earth widget | Canvas area, draggable | Shows Earth Simulator visualization |
| Embedding Atlas widget | Canvas area, draggable | Shows vector embedding visualization |
| Camera widget | Canvas area, draggable | Camera/visual input for search |
| Activity Stream tab (Activity icon) | Left edge of screen (desktop) | Click to open left panel with memory, consciousness, agent activity |
| Notepad tab (StickyNote icon) | Right edge of screen (desktop) | Click to open right panel with live results + notepad |
| Left panel close button | Top-left of center area (desktop, lg+) | Click chevron-left to close activity panel |
| Right panel close button | Top-right of center area (desktop, lg+) | Click chevron-right to close notepad panel |
| MYCA chat messages (mobile) | Full screen on phone | Scrollable chat with rich data cards (ResearchCard, etc.) |
| Mobile notepad | Within mobile chat interface | Accessible from mobile search |
| History icon | Near search input | View recent search history |

## Core Actions

### 1. Perform a Text Search
1. Navigate to `/search` via header link or direct URL.
2. Click the search input field at the top of the canvas.
3. Type a query (e.g., "amanita muscaria", "psilocybin compound", "mycelium research").
4. The query is debounced and sent to the unified search API (`useUnifiedSearch` hook).
5. Results appear as categorized widgets on the canvas. The `classifyAndRoute` function from `search-intelligence-router` determines which widget types to display.
6. Click on any result within a widget to navigate to its detail page.

### 2. Use Voice Search
1. On the search page, locate the microphone (Mic) button near the search input.
2. Click it to start listening (uses `useVoiceSearch` hook with Web Speech API).
3. Speak your query; the transcript appears in the search input.
4. Click the MicOff button or wait for silence to stop recording.
5. The transcribed text is submitted as a search query.
6. The VoiceCommandPanel shows available voice commands and listening state.

### 3. Use Ctrl+K Command Search
1. From any page on the site, press Ctrl+K (Cmd+K on Mac).
2. The command search dialog opens (`components/command-search.tsx`) using cmdk library.
3. Type a query for quick search across fungi, compounds, and research.
4. Toggle to MYCA AI mode (Sparkles icon) for natural language queries.
5. Select a result to navigate directly to the detail page.

### 4. Toggle Side Panels (Desktop)
1. On desktop (1024px+), the 3-panel layout shows edge tabs when panels are closed.
2. Click the Activity icon tab on the left edge to open the Activity Stream panel (memory, consciousness, agent activity).
3. Click the StickyNote icon tab on the right edge to open the Live Results + Notepad panel.
4. On tablet/mobile, panels open as overlays with a backdrop; tap the backdrop to close.
5. On desktop (lg+), small pill-shaped close buttons appear at the top corners of the center panel.

### 5. Interact with Widgets on Canvas
1. After a search, widgets appear on the canvas with physics-based floating animations.
2. Widgets have parallax depth layers and magnetic attraction to the cursor.
3. Drag widgets by their grip handle (GripVertical icon) to rearrange the layout.
4. Widget layouts are saveable.
5. Each widget type has glassmorphism styling and animated entrance effects.
6. Click minimize (Minimize2) or close (X) on individual widgets.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Loading search..." spinner that never resolves | FluidSearchCanvas failed to load (SSR disabled, client-only) | Check browser console for errors; ensure JavaScript is enabled |
| "Loading MYCA..." on phone that never resolves | MobileSearchChat component failed to load | Same as above; component is dynamically imported with `ssr: false` |
| No widgets appear after typing query | Query did not match any search routes | Try a more specific query; the `classifyAndRoute` function may not recognize the intent |
| Voice search button unresponsive | Browser does not support Web Speech API or microphone permission denied | Grant microphone permission in browser settings; use Chrome for best compatibility |
| Side panels open as overlays instead of inline | Viewport is < 1024px (lg breakpoint) | On tablet, panels overlay with backdrop; this is expected behavior, not a bug |
| Widgets overlap or layout is broken | Packery layout engine issue (`usePackery` hook) | Resize window to trigger relayout; or drag widgets to reposition |
| Search results appear stale | SWR cache returning old data | Hard refresh (Ctrl+Shift+R) or wait for revalidation |

## Responsive Breakpoints

| Viewport | Width | Layout | Components Loaded |
|---|---|---|---|
| Phone | < 640px (sm) | ChatGPT-like MYCA chat with data cards | `MobileSearchChat` |
| Tablet | 640-1023px | Fluid canvas only (side panels as overlays) | `FluidSearchCanvas` + `SearchLayout` |
| Desktop | 1024px+ (lg) | Full 3-panel: Activity Stream, Canvas, Live Results + Notepad | `FluidSearchCanvas` + `SearchLayout` with inline panels |

## Widget Types
The canvas supports 18+ widget types: `species`, `chemistry`, `genetics`, `research`, `answers`, `media`, `location`, `news`, `crep`, `earth`, `fallback`, `embedding_atlas`, `cameras`, `events`, `aircraft`, `vessels`, `satellites`, `weather`, `emissions`, `infrastructure`, `devices`, `space_weather`.

## Composability
- **platform-navigation**: Header "Search" link and Ctrl+K shortcut are the primary entry points.
- **ai-myca-chat**: MYCA powers the mobile chat interface and the Answers widget on desktop.
- **platform-authentication**: User context personalizes search results and enables search memory (`useSearchMemory`).
- **science-species-explorer**: Species widget results link to species detail pages.
- **science-compounds-search**: Chemistry widget results link to compound detail pages.
- **defense-crep-dashboard**: CREP widget can expand to the full CREP dashboard client.
- **lab-earth-simulator**: Earth widget links to Earth Simulator visualization.

## Computer Use Notes
- The search page uses `overflow-hidden` on the outer container with `h-[calc(100vh-56px)]` (mobile) or `h-[calc(100vh-64px)]` (desktop) to prevent page-level scrolling.
- Mobile chat allows vertical scroll (`overflow-y-auto`); desktop canvas does not scroll (widgets float in fixed space).
- Side panels use spring animations (`damping: 28, stiffness: 350`) for smooth open/close.
- Mycelium particle background renders on a `<canvas>` element behind widgets with green connection lines.
- Widgets use `framer-motion` for entrance animations (opacity + x-slide with staggered delays).
- The `SearchContextProvider` manages shared state: `leftPanelOpen`, `rightPanelOpen`, query state, and result context.
- Edge tabs for panels have `min-h-[44px]` touch targets and are positioned with `absolute` at vertical center.

## Iteration Log
### Attempt Log
- Initial creation: documented responsive 3-layout search system, 18+ widget types, voice search, Ctrl+K command palette, side panel toggle, canvas physics animations, and all breakpoint behaviors.
