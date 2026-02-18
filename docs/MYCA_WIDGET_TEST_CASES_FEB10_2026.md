# MYCA AI Widget Test Cases

**Date**: February 10, 2026  
**Status**: Complete  
**Purpose**: Regression test checklist for MYCA AI widget and left panel on the search page. Covers text and voice input, all search operators, and widget capabilities.

## Overview

The MYCA AI experience appears in two places on `/search`:

1. **AI Widget** – Grid widget in the fluid search canvas; shows AI answers from unified search and supports follow-up questions.
2. **MYCA Panel (left)** – Sliding panel with continuous chat; uses MYCA Brain stream first, then `/api/search/ai` fallback. Includes mic button for voice input.

Both surfaces must support text and voice input and correctly handle math, fungi, documents, locations, and general AI questions.

---

## Prerequisites

- MAS VM reachable at `192.168.0.188:8001` (MYCA Consciousness, Brain)
- `MAS_API_URL` set in website `.env.local`
- Website dev: `npm run dev:next-only` on port 3010
- Voice: Web Speech API (Chrome/Edge) or PersonaPlex when configured

---

## 1. Text Input Tests

### 1.1 AI Widget (in grid)

| # | Action | Query | Expected Result |
|---|--------|-------|-----------------|
| 1 | Type in search bar | `2+2` | Unified search runs; AI widget shows answer (e.g., "4") |
| 2 | Type | `What is reishi?` | Species results + AI answer about reishi |
| 3 | Type | `Show me documents about psilocybin` | Research widget populated; AI answer about psilocybin research |
| 4 | Type | `Mushrooms in California` | Location widget populated; AI/location context |
| 5 | Type follow-up in AI widget | `Tell me more` | Follow-up answer from `/api/search/ai` |

### 1.2 MYCA Panel (left)

| # | Action | Input | Expected Result |
|---|--------|-------|-----------------|
| 6 | Type in panel input | `What is 15 times 3?` | Brain stream or AI answer (e.g., "45") |
| 7 | Type | `What is lion's mane?` | MYCA answer about lion's mane fungus |
| 8 | Type | `Show me a document on mycelium networks` | Answer; research context if search triggered |
| 9 | Type | `Where can I find chanterelles?` | Answer about locations/habitats |
| 10 | Type | `Explain the life cycle of a mushroom` | MYCA/Brain explanation |

---

## 2. Voice Input Tests

### 2.1 Main Search Bar Mic

| # | Voice Command | Expected Result |
|---|---------------|-----------------|
| 11 | "Show me reishi" | Search runs; species widget focused; results for reishi |
| 12 | "Show me a fungus called chanterelle" | Species widget; chanterelle results |
| 13 | "Show me documents about mycorrhizae" | Research widget focused; research results |
| 14 | "Show me mushrooms in Oregon" | Location widget focused; location-based results |
| 15 | "What is 7 plus 5?" | AI question; search + AI widget; answer "12" |
| 16 | "Tell me about oyster mushrooms" | AI question; AI widget expanded; MYCA answer |
| 17 | "Focus the AI widget" | AI widget expanded/focused |
| 18 | "Show species" | Species widget expanded |

### 2.2 MYCA Panel Mic

| # | Action | Expected Result |
|---|--------|-----------------|
| 19 | Click mic in panel; say "What is 100 divided by 4?" | Same as main mic; unified search + AI; answer in panel |
| 20 | Click mic; say "Show me a document on spore dispersal" | Search + research widget; AI answer in panel |
| 21 | Click mic; say "Where are morels found?" | Search + location context; answer in panel |
| 22 | Mic shows listening state (red/pulse) when active | Visual feedback |
| 23 | Click mic again to stop | Listening stops; mic returns to default |

---

## 3. Voice Command Reference (Search Operators)

### Fungi / Species

| Command Pattern | Example |
|----------------|---------|
| Show me [fungus/fungi/mushroom] [name] | "Show me reishi", "Show me a fungus called lion's mane" |
| Search/find [query] | "Search for chanterelles", "Find me shiitake" |

### Documents / Research

| Command Pattern | Example |
|----------------|---------|
| Show me a document/paper/research on [topic] | "Show me documents about psilocybin" |
| Show research widget | "Show research", "Focus the research widget" |

### Locations

| Command Pattern | Example |
|----------------|---------|
| Show me mushrooms/fungi in/near [place] | "Show me mushrooms in California", "Show fungi near Seattle" |

### Widget Focus

| Command | Widget |
|---------|--------|
| Show/focus species | Species |
| Show/focus chemistry/compounds | Chemistry |
| Show/focus genetics/dna | Genetics |
| Show/focus research/papers | Research |
| Show/focus AI/assistant/MYCA | AI |

### AI Questions

| Command Pattern | Example |
|----------------|---------|
| Ask/Tell me/What/How/Why/When/Where [question] | "What is 2+2?", "Tell me about cordyceps" |
| Explain [topic] | "Explain mycelium networks" |

---

## 4. API Flow Verification

| Component | Endpoint | Role |
|-----------|----------|------|
| Unified search | `GET /api/search/unified?q=...` | Returns species, compounds, genetics, research, aiAnswer |
| Search AI | `POST /api/search/ai` | MYCA Consciousness → Brain → OpenAI → Anthropic → local KB |
| MYCA Brain stream | `POST /api/myca/brain/stream` | Primary for panel chat |
| Intention tracking | `POST /api/myca/intention` | When MYCA answers |

---

## 5. Sync Checks

| Check | Expected |
|-------|----------|
| Voice question → unified search | Query set; AI widget expanded; `aiAnswer` in results |
| `aiAnswer` → panel | When last user message matches `ctx.query`, assistant answer added to panel |
| Panel mic = main mic | Both trigger same `useVoice` + `useVoiceSearch`; shared state via `voice:toggle` |

---

## 6. Failure Modes to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| MAS unreachable | Fallback to OpenAI/Anthropic or local mycology KB; no hard crash |
| Voice not supported | Mic button present; graceful error or no-op |
| Empty/invalid query | No unnecessary API calls; empty state shown |

---

## Related Documents

- [MYCA Widget AI Integration](../MAS/mycosoft-mas/docs/MYCA_WIDGET_AI_INTEGRATION_FEB11_2026.md)
- [Voice Commands Quick Reference](./VOICE_COMMANDS_QUICK_REFERENCE_FEB04_2026.md)
- [PersonaPlex Voice Search](./PERSONAPLEX_VOICE_SEARCH_IMPLEMENTATION_FEB11_2026.md)
