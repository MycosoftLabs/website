# MYCA Introduction Page - Documentation

**Date**: February 17, 2026  
**Route**: `/myca` and `/MYCA` (redirect)  
**Purpose**: Comprehensive introduction and demonstration of MYCA as the Opposable Thumb of AI

---

## Overview

The MYCA introduction page at `/myca` presents MYCA as a Nature Learning Model (NLM) that serves as the "opposable thumb" in the Hand metaphor of AI ecosystems. It communicates the architectural thesis, live demonstrations, and comparison with frontier AI systems.

---

## Page Sections

1. **Hero** - Hand visualization, consciousness status badge, headline, CTAs
2. **Hand Thesis** - Interactive diagram with problem/solution cards
3. **Four Fingers** - Amazon, Google/OpenAI/Anthropic, Tesla/xAI/Starlink, Apple cards
4. **NLM Architecture** - Palm (biospheric telemetry) → Thumb (MYCA) → Fingers (external AI)
5. **Fungal Principles** - Foraging, Decomposition, Networked Intelligence
6. **Live Demo** - Tabs: Consciousness, World, Chat, Agents
7. **Comparison Table** - MYCA vs ChatGPT/Gemini
8. **All Organisms as Users** - Philosophy section
9. **Technical Specs** - Expandable consciousness, memory, agents, APIs, sensors, learning
10. **CTA** - Open MYCA Chat, Explore NatureOS

---

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| HandVisualization | `components/myca/HandVisualization.tsx` | Animated hand SVG with hover labels |
| ThumbThesisDiagram | `components/myca/ThumbThesisDiagram.tsx` | Two-column thesis explainer |
| FingerCards | `components/myca/FingerCards.tsx` | Four competitor finger cards |
| NLMArchitecture | `components/myca/NLMArchitecture.tsx` | Palm/Thumb/Fingers diagram |
| FungalPrinciples | `components/myca/FungalPrinciples.tsx` | Three mycological design principles |
| LiveDemo | `components/myca/LiveDemo.tsx` | Tabbed demo with consciousness, world, chat |
| ComparisonTable | `components/myca/ComparisonTable.tsx` | MYCA vs frontier AI |
| TechnicalSpecs | `components/myca/TechnicalSpecs.tsx` | Expandable technical details |

---

## Routes

- **`/myca`** - Primary route, serves the MYCA intro page
- **`/MYCA`** - Redirects to `/myca` (case variant support)
- **`/myca-ai`** - Chat interface (unchanged)

---

## Mobile Standards

All components follow mobile-first standards:
- Touch targets ≥ 44x44px (`min-h-[44px]`, `touch-manipulation`)
- `flex-col` base, `md:flex-row` for side-by-side layouts
- `overflow-x-auto` on ComparisonTable and NLMArchitecture
- Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

---

## API Dependencies

- `/api/myca/consciousness/status` - Consciousness state
- `/api/myca/consciousness/world` - World perception
- `/api/myca/consciousness/chat` - Chat (via MYCAChatWidget)
- MAS at 192.168.0.188:8001 (proxied through website API routes)

---

## Related Documentation

- `docs/Myca and the Opposable-Thumb.md` - Full thesis
- `docs/MYCA_CONSCIOUSNESS_ARCHITECTURE_FEB10_2026.md` - Consciousness system
- `.cursor/plans/myca_thumb_architecture_*.plan.md` - Implementation roadmap
