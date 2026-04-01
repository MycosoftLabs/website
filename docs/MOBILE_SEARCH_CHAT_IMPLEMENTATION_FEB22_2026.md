# Mobile Search Chat Implementation - Feb 22, 2026

## Summary

Replaced the basic mobile search page with a ChatGPT-like conversational interface powered by MYCA. The new interface provides full feature parity with the desktop search experience while being optimized for phone screens.

## Architecture

```
Phone (< 640px)         Tablet/Desktop (≥ 640px)
        │                        │
        ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐
│ MobileSearchChat │    │  FluidSearchCanvas  │
├─────────────────┤    │  (existing desktop) │
│ - ChatInput     │    └─────────────────────┘
│ - ChatMessage   │
│ - DataCards     │
│ - MobileNotepad │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ /api/search/chat│
│ (entity detect, │
│  enrichment)    │
└─────────────────┘
        │
        ▼
┌───────────────────────────────┐
│ MAS + MINDEX (VMs 188, 189)   │
└───────────────────────────────┘
```

## New Components

### `/components/search/mobile/`

| Component | Purpose |
|-----------|---------|
| `MobileSearchChat.tsx` | Main container with header, message thread, and input bar |
| `ChatMessage.tsx` | Individual message bubble with markdown rendering and data card slots |
| `ChatInput.tsx` | Auto-expanding textarea with send button and voice mic |
| `DataCardRenderer.tsx` | Dynamic card renderer based on data type |
| `MobileNotepad.tsx` | Bottom sheet notepad with save/restore/export |

### `/components/search/mobile/cards/`

| Card | Data Type |
|------|-----------|
| `SpeciesCard.tsx` | Species/fungi information |
| `ChemistryCard.tsx` | Chemical compounds |
| `GeneticsCard.tsx` | DNA sequences |
| `MapCard.tsx` | Locations and observations |
| `TaxonomyCard.tsx` | Taxonomic classification trees |
| `ImageGalleryCard.tsx` | Swipeable image galleries |
| `ResearchCard.tsx` | Research papers and news articles |

### `/app/api/search/chat/route.ts`

New API endpoint that:
- Detects entities in user messages (species names, compound names, accession numbers)
- Fetches enrichment data from MINDEX
- Calls MAS Brain/Orchestrator for AI responses
- Returns combined response with data cards

### `/hooks/use-mobile-search-chat.ts`

State management hook integrating:
- MYCA context for AI conversations
- Search memory for session tracking
- Message state management
- Notepad save functionality

## Features

1. **ChatGPT-like Interface** - Familiar chat UX with user/assistant message bubbles
2. **Rich Data Cards** - Inline species, chemistry, genetics, map, taxonomy, and image cards
3. **Voice Input** - Web Speech API integration for hands-free input
4. **Persistent Notepad** - Same localStorage-based notepad as desktop
5. **Memory Integration** - Full MYCA memory system integration
6. **Consciousness Indicator** - Shows MYCA's consciousness state
7. **Suggestions** - Follow-up query suggestions from AI responses
8. **Auto-scroll** - Smooth scrolling with "new messages" button
9. **Safe Area Support** - Respects iOS safe areas (notch, home indicator)

## Mobile Optimizations

- `min-h-dvh` for proper full-height layout
- `pb-safe` for safe area insets
- Touch-optimized button sizes (44px minimum)
- Auto-expanding textarea with max height
- Swipe gestures for image galleries
- Bottom sheet notepad (easier to reach)
- Collapsible data cards for space efficiency

## Data Flow

1. User sends message via ChatInput
2. Message displayed in thread immediately
3. API call to `/api/search/chat`:
   - Entity detection scans for species names, compound keywords, accession numbers
   - MINDEX queries fetch matching data
   - MAS orchestrator generates AI response
   - Response combined with data cards
4. Assistant message rendered with any data cards
5. Session recorded in search memory

## Integration Points

- **MYCA Context** (`contexts/myca-context.tsx`) - AI conversation management
- **Search Context** (`SearchContextProvider.tsx`) - Notepad, query state
- **Search Memory** (`hooks/use-search-memory.ts`) - Session tracking
- **MAS API** (`/api/mas/voice/orchestrator`) - AI responses
- **MINDEX API** (`/api/search`, `/api/taxa/search`, etc.) - Data enrichment

## Testing Checklist

- [ ] iPhone SE (320px width) - compact layout
- [ ] iPhone 14 (390px width) - standard layout
- [ ] iPhone 14 Pro Max (430px width) - larger layout
- [ ] Android phone - cross-platform compatibility
- [ ] Voice input on iOS Safari
- [ ] Voice input on Android Chrome
- [ ] Notepad persistence across sessions
- [ ] Data card interactions (expand, save, external links)
- [ ] Keyboard handling and auto-focus
- [ ] Safe area insets on notched devices
- [ ] Dark mode and light mode theming

## Files Changed

- `app/search/page.tsx` - Updated to use MobileSearchChat for phones
- Created new `/components/search/mobile/` directory with all components
- Created `/app/api/search/chat/route.ts` for chat API
- Created `/hooks/use-mobile-search-chat.ts` for state management

## MYCA Integration

The mobile search chat uses the same MYCA context as the rest of the website:

- **Context**: `useMYCA()` from `contexts/myca-context.tsx`
- **API**: `/api/mas/voice/orchestrator` (MAS VM ${MAS_VM_HOST}:8001)
- **Data cards**: Populated from `nlqData` in MYCA response
- **Memory**: Full memory system via MYCA context
- **Consciousness**: Consciousness status indicator in header

The `/api/search/chat` endpoint provides optional entity detection and MINDEX enrichment; the primary AI flow uses the MYCA orchestrator directly.

## Related Documentation

- `docs/HERO_VIDEOS_MOBILE_AUTOPLAY_FEB22_2026.md` - Hero video mobile fixes
- `docs/SEARCH_UI_GENETICS_SEQUENCE_BOX_FEB10_2026.md` - Genetics card styling
- `docs/PERSONAPLEX_VOICE_SEARCH_IMPLEMENTATION_FEB11_2026.md` - Voice integration
- `docs/MYCA_FULL_WEBSITE_INTEGRATION_FEB17_2026.md` - MYCA integration patterns
