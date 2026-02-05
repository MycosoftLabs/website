# Complete Search System Documentation - February 5, 2026

## Overview

This document consolidates all search-related work completed on February 5, 2026, including:

1. **Revolutionary Fluid Search UI** - New parallax, animated, widget-based search experience
2. **Search Memory Integration** - Backend memory tracking with MYCA integration
3. **Session Memory** - Client-side persistent conversational context
4. **Performance Optimizations** - SWR caching, dynamic imports, image optimization

---

## Part 1: Revolutionary Fluid Search UI

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FluidSearchCanvas                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Species  │  │Chemistry │  │ Genetics │  │ Research │  │    AI    │      │
│  │  Widget  │  │  Widget  │  │  Widget  │  │  Widget  │  │  Widget  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       └─────────────┴─────────────┴─────────────┴─────────────┘            │
│                                   │                                          │
│              ┌────────────────────┴────────────────────┐                    │
│              │          useUnifiedSearch               │                    │
│              └────────────────────┬────────────────────┘                    │
│                                   │                                          │
│              ┌────────────────────┴────────────────────┐                    │
│              │        /api/search/unified               │                   │
│              └────────────────────┬────────────────────┘                    │
│                                   │                                          │
│    ┌──────────────────────────────┼──────────────────────────────┐          │
│    │                              │                              │          │
│    ▼                              ▼                              ▼          │
│ ┌──────────┐               ┌──────────────┐              ┌──────────────┐   │
│ │ MINDEX   │               │ MYCA Brain   │              │   Session    │   │
│ │ Database │               │    API       │              │   Memory     │   │
│ └──────────┘               └──────────────┘              └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Components

#### Frontend Components (Website)

| Component | Path | Description |
|-----------|------|-------------|
| `FluidSearchCanvas` | `components/search/fluid/FluidSearchCanvas.tsx` | Main fluid search with parallax, voice, history |
| `AIConversation` | `components/search/fluid/AIConversation.tsx` | AI chat with session memory |
| `VoiceCommandPanel` | `components/search/fluid/VoiceCommandPanel.tsx` | Voice control UI |
| `SpeciesWidget` | `components/search/fluid/widgets/SpeciesWidget.tsx` | Species display widget |
| `ChemistryWidget` | `components/search/fluid/widgets/ChemistryWidget.tsx` | Compound display widget |
| `GeneticsWidget` | `components/search/fluid/widgets/GeneticsWidget.tsx` | Genetics data widget |
| `ResearchWidget` | `components/search/fluid/widgets/ResearchWidget.tsx` | Research paper widget |
| `TaxonomyWidget` | `components/search/fluid/widgets/TaxonomyWidget.tsx` | Taxonomy hierarchy widget |
| `GalleryWidget` | `components/search/fluid/widgets/GalleryWidget.tsx` | Photo gallery with lightbox |
| `AIWidget` | `components/search/fluid/widgets/AIWidget.tsx` | AI answer display widget |

#### API Endpoints

| Endpoint | Path | Description |
|----------|------|-------------|
| `/api/search/unified` | `app/api/search/unified/route.ts` | Unified search aggregating all MINDEX data |
| `/api/mas/brain/query` | `app/api/mas/brain/query/route.ts` | MYCA Brain proxy with Frontier LLM Router |

#### React Hooks

| Hook | Path | Description |
|------|------|-------------|
| `useUnifiedSearch` | `hooks/use-unified-search.ts` | SWR-powered unified search |
| `useVoiceSearch` | `hooks/use-voice-search.ts` | Voice command processing |
| `useSessionMemory` | `hooks/use-session-memory.ts` | Session memory integration |
| `useSearch` | `components/search/use-search.ts` | Legacy search with SWR |
| `useSearchResults` | `components/search/use-search.ts` | Full search results |

#### Libraries

| Library | Path | Description |
|---------|------|-------------|
| `unified-search-sdk` | `lib/search/unified-search-sdk.ts` | Client SDK with caching |
| `session-memory` | `lib/search/session-memory.ts` | Session storage manager |

### Widget System

Widgets can be in three states:
- **Focused** - Large, center display with full details
- **Context** - Smaller grid cards showing summary
- **Minimized** - Icons in floating bottom bar

60fps animations achieved using:
- Framer Motion's `LayoutGroup` for coordinated transitions
- Spring physics for natural motion
- `willChange: transform, opacity` hint for GPU acceleration
- Staggered entry delays for visual appeal

### Voice Commands

| Voice Input | Action |
|-------------|--------|
| "Search for [query]" | Updates search query |
| "Find [query]" | Updates search query |
| "Show species widget" | Focuses species widget |
| "Show chemistry" | Focuses chemistry widget |
| "Ask [question]" | Sends question to AI |
| "Go to home page" | Navigates to homepage |
| "Clear search" | Resets search |

---

## Part 2: Search Memory Integration (Backend)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Homepage Search Experience                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  User Search Query  ──►  Unified Search  ──►  Results Display               │
│         │                      │                    │                        │
│         ▼                      ▼                    ▼                        │
│  [Search Memory]        [Query Record]       [Click Tracking]                │
└─────────┴──────────────────────┴────────────────────┴────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Search Memory Manager (MAS)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  SearchSession                                                               │
│    ├── queries: List[SearchQuery]                                            │
│    ├── focused_species: List[str]                                            │
│    ├── explored_topics: List[SearchTopic]                                    │
│    ├── ai_conversation: List[AIMessage]                                      │
│    └── widget_interactions: List[WidgetInteraction]                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Session Lifecycle                                                           │
│    start_session() ──► add_query() ──► record_focus() ──► end_session()     │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Integration Points                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  MINDEX Database                                                             │
│    ├── mindex.search_sessions    (completed session data)                    │
│    ├── mindex.user_interests     (user interest scores per taxon)            │
│    └── mindex.search_analytics   (query-level analytics)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  MYCA 6-Layer Memory                                                         │
│    ├── Semantic: High-interest species (score >= 0.7)                        │
│    └── Episodic: AI breakthroughs and discoveries                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Voice Integration                                                           │
│    └── VoiceSearchBridge links voice sessions to search sessions             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Backend Components (MAS)

| Component | Path | Description |
|-----------|------|-------------|
| `SearchMemoryManager` | `mycosoft_mas/memory/search_memory.py` | Core search session management |
| `VoiceSearchBridge` | `mycosoft_mas/memory/voice_search_memory.py` | Voice-search session linking |
| `search_memory_api` | `mycosoft_mas/core/routers/search_memory_api.py` | REST API endpoints |
| `018_search_memory.sql` | `migrations/018_search_memory.sql` | Database migration |

### Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search/memory/start` | POST | Start new search session |
| `/api/search/memory/query` | POST | Record a search query |
| `/api/search/memory/focus` | POST | Record species/topic focus |
| `/api/search/memory/click` | POST | Record result click |
| `/api/search/memory/ai` | POST | Record AI conversation turn |
| `/api/search/memory/context/{session_id}` | GET | Get session context |
| `/api/search/memory/end/{session_id}` | POST | End session, get summary |
| `/api/search/memory/history` | GET | Get user's search history |
| `/api/search/memory/enrich` | POST | Enrich MINDEX with search data |
| `/api/search/memory/stats` | GET | Get system statistics |

### Interest Score Calculation

| Factor | Weight | Description |
|--------|--------|-------------|
| Base | 0.5 | Initial interest from any interaction |
| Focus Time | 0.3 max | Time spent viewing (up to 5 minutes) |
| Topic Exploration | 0.2 max | Number of widget interactions |
| AI Conversation | 0.2 max | Number of AI exchanges |

---

## Part 3: Client-Side Session Memory

### Session Storage Structure

```typescript
interface SearchSession {
  id: string
  startedAt: Date
  lastActiveAt: Date
  searches: SearchEntry[]
  conversations: ConversationEntry[]
  activeEntities: EntityContext[]
  preferences: {
    preferredTypes: string[]
    lastViewedSpecies: string[]
    lastViewedCompounds: string[]
  }
}
```

### Key Methods

| Method | Description |
|--------|-------------|
| `addSearch(query, results)` | Track search query and result counts |
| `trackSelection(searchId, itemId)` | Track user clicking on a result |
| `getRecentSearches(limit)` | Get recent search history |
| `getSearchSuggestions(query)` | Get suggestions from history |
| `addConversation(role, content)` | Track AI conversation message |
| `getConversationContext()` | Get history for AI context |
| `addEntity(id, type, name)` | Track entity exploration |
| `getActiveEntities()` | Get currently explored entities |
| `buildContextSummary()` | Build AI context from session |
| `clearSession()` | Reset session data |

### React Hooks for Session

```typescript
// Main hook
const { recentSearches, addSearch, trackSelection, ... } = useSessionMemory()

// Entity tracking
const { trackSpecies, trackCompound, trackResearch } = useEntityTracking()

// Conversation memory
const { conversationHistory, addUserMessage, addAssistantMessage } = useConversationMemory()
```

---

## Part 4: Performance Optimizations

### Image Optimization

Fixed `unoptimized={true}` in:
- `components/templates/species-template.tsx`
- `components/devices/device-details.tsx`
- `components/species/photo-gallery.tsx`

Added proper `sizes` attributes for responsive images.

### Dynamic Imports

| Component | Strategy |
|-----------|----------|
| `ParallaxSearch` | Dynamic import with skeleton |
| `QuickAccess` | Dynamic import with skeleton |
| `EnhancedSearch` | Dynamic import, ssr: false |
| `FluidSearchCanvas` | Dynamic import, ssr: false |

### Page Transitions

Replaced Framer Motion in `app/template.tsx` with CSS-only:
```tsx
<div className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
  {children}
</div>
```

### SWR Caching

| Hook | Dedupe Interval | Description |
|------|----------------|-------------|
| `useSearch` suggestions | 10s | Search suggestions |
| `useSearchResults` | 30s | Full search results |
| `useUnifiedSearch` | 10s | Unified search |

### Bug Fixes

Fixed `debouncedQuery.trim is not a function` error by adding safety checks:

```typescript
// Before (could fail if debouncedQuery was undefined)
const normalizedQuery = debouncedQuery.trim()

// After (safe for undefined/null)
const debouncedQuery = useDebounce(query || "", debounceMs)
const normalizedQuery = (debouncedQuery || "").trim()
```

---

## Testing

### Test Page

Visit `http://localhost:3010/test-fluid-search` to test the fluid search interface.

### Manual Tests

1. **Search Input** - Type query, verify results appear
2. **Voice Button** - Click mic, speak, verify transcript
3. **Widget Focus** - Click widget, verify it expands
4. **Widget Minimize** - Click minimize, verify bottom bar
5. **AI Answers** - Search, verify AI widget appears
6. **Search History** - Click history icon, verify past searches
7. **Session Memory** - Search, refresh, verify history persists

### API Tests

```bash
# Test unified search
curl "http://localhost:3010/api/search/unified?q=psilocybe&limit=5"

# Test brain query
curl -X POST "http://localhost:3010/api/mas/brain/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is psilocybin?", "mode": "search_answer"}'

# Test search memory (MAS)
curl "http://192.168.0.187:8000/api/search/memory/stats"
```

---

## Deployment

### Local Development

```bash
cd c:\Users\admin2\Desktop\MYCOSOFT\CODE\website\website
npm run dev  # Port 3010
```

### Sandbox Deployment

```bash
# 1. Commit and push
git add .
git commit -m "feat: Complete search system with fluid UI, memory, voice"
git push origin main

# 2. SSH to sandbox VM
ssh mycosoft@192.168.0.187

# 3. Pull code
cd /opt/mycosoft/website
git reset --hard origin/main

# 4. Rebuild Docker
docker build -t website-website:latest --no-cache .

# 5. Restart container
docker compose -p mycosoft-production up -d mycosoft-website

# 6. Clear Cloudflare cache (PURGE EVERYTHING)
```

---

## Configuration

### Environment Variables

```bash
# Website (.env.local)
MAS_API_URL=http://192.168.0.188:8000
MINDEX_API_URL=http://192.168.0.188:8001
MYCA_BRAIN_URL=http://192.168.0.188:8000

# MAS Backend
MINDEX_DATABASE_URL=postgresql://mycosoft:...@192.168.0.189:5432/mindex
```

---

## Files Summary

### Created (Website)

- `components/search/fluid/FluidSearchCanvas.tsx`
- `components/search/fluid/AIConversation.tsx`
- `components/search/fluid/VoiceCommandPanel.tsx`
- `components/search/fluid/widgets/*.tsx` (7 widgets + index)
- `app/api/search/unified/route.ts`
- `app/api/mas/brain/query/route.ts`
- `hooks/use-unified-search.ts`
- `hooks/use-voice-search.ts`
- `hooks/use-session-memory.ts`
- `lib/search/unified-search-sdk.ts`
- `lib/search/session-memory.ts`
- `app/test-fluid-search/page.tsx`
- `docs/SEARCH_SYSTEM_COMPLETE_FEB05_2026.md` (this file)

### Created (MAS Backend)

- `mycosoft_mas/memory/search_memory.py`
- `mycosoft_mas/memory/voice_search_memory.py`
- `mycosoft_mas/core/routers/search_memory_api.py`
- `migrations/018_search_memory.sql`

### Modified (Website)

- `hooks/use-unified-search.ts` - Added safety checks
- `components/search/use-search.ts` - Added SWR, safety checks
- `components/enhanced-search.tsx` - Added safety checks
- `app/page.tsx` - Dynamic imports
- `app/template.tsx` - CSS-only transitions
- `components/templates/species-template.tsx` - Image optimization
- `components/devices/device-details.tsx` - Image optimization
- `components/species/photo-gallery.tsx` - Image optimization

---

## Deployment Status (Feb 5, 2026)

| Environment | URL | Status |
|-------------|-----|--------|
| Development | http://localhost:3010 | ✅ Working |
| Sandbox | https://sandbox.mycosoft.com | ✅ Deployed |

### Verified Endpoints

| Endpoint | localhost:3010 | sandbox |
|----------|----------------|---------|
| Homepage (`/`) | ✅ 200 | ✅ 200 |
| Search page (`/search?q=mushroom`) | ✅ 200 | ✅ 200 |
| Test Fluid Search (`/test-fluid-search`) | ✅ 200 | ✅ 200 |
| Unified API (`/api/search/unified?q=amanita`) | ✅ 200 | ✅ 200 |

### Bug Fixes Applied

1. **debouncedQuery.trim is not a function error** - Fixed by adding safety checks:
   - `hooks/use-unified-search.ts` - Line 88-89
   - `components/search/use-search.ts` - Lines 48-53, 170-173
   - `components/enhanced-search.tsx` - Lines 53-62

---

## Related Documentation

- [Search Memory Integration](../../../MAS/mycosoft-mas/docs/SEARCH_MEMORY_INTEGRATION_FEB05_2026.md)
- [MYCA Memory Architecture](../../../MAS/mycosoft-mas/docs/MYCA_MEMORY_ARCHITECTURE_FEB04_2026.md)
- [PersonaPlex Voice Integration](../../../MAS/mycosoft-mas/docs/MYCA_VOICE_REAL_INTEGRATION_FEB03_2026.md)
