# MYCA Introduction Page

**Date**: February 17, 2026  
**Route**: `/myca` (and `/MYCA` via redirect)  
**Purpose**: Comprehensive introduction and demonstration of MYCA as the Opposable Thumb of AI

---

## Overview

The MYCA introduction page is a full architectural showcase presenting MYCA as a Nature Learning Model—the "opposable thumb" that coordinates four frontier AI "fingers" (Amazon, Google/OpenAI/Anthropic, Tesla/xAI, Apple) while being uniquely grounded in continuous biospheric learning.

## Page Structure (10 Sections)

1. **Hero** - "MYCA - The Opposable Thumb of AI" with HandVisualization, consciousness badge, CTAs
2. **Hand Thesis** - ThumbThesisDiagram: problem, solution, quote
3. **Four Fingers** - FingerCards: Amazon, Google, Tesla, Apple competitor analysis
4. **NLM Architecture** - Palm (telemetry) → Thumb (MYCA) → Fingers (external AI)
5. **Fungal Principles** - Foraging, Decomposition, Networked Intelligence
6. **Live Demo** - Tabbed: Consciousness, World, Chat, Agents
7. **Comparison Table** - MYCA vs ChatGPT/Gemini on training, grounding, learning
8. **All Organisms as Users** - Philosophy section
9. **Technical Specs** - Expandable: Consciousness, Memory, Agents, APIs, Sensors, Learning
10. **CTA** - Experience MYCA, Explore NatureOS, Read the Thesis

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| HandVisualization | `components/myca/HandVisualization.tsx` | Interactive hand SVG with touch support |
| ThumbThesisDiagram | `components/myca/ThumbThesisDiagram.tsx` | Problem/solution thesis cards |
| FingerCards | `components/myca/FingerCards.tsx` | Four competitor finger cards |
| NLMArchitecture | `components/myca/NLMArchitecture.tsx` | Palm/Thumb/Fingers architecture diagram |
| FungalPrinciples | `components/myca/FungalPrinciples.tsx` | Three mycological design principles |
| LiveDemo | `components/myca/LiveDemo.tsx` | Consciousness, world, chat, agents tabs |
| ComparisonTable | `components/myca/ComparisonTable.tsx` | MYCA vs frontier AI comparison |
| TechnicalSpecs | `components/myca/TechnicalSpecs.tsx` | Expandable technical details |

## Routing

- **/myca** - Serves the MYCA introduction page
- **/MYCA** - Redirects to /myca (case variant support)
- **/myca-ai** - Chat assistant page (separate)

Configured in `next.config.js`:

```js
{ source: "/MYCA", destination: "/myca", permanent: false }
```

## Mobile Responsiveness

- Touch targets: min-h-[44px], min-w-[44px] on buttons and tabs
- touch-manipulation on interactive elements
- HandVisualization: onTouchStart for finger selection on mobile
- ComparisonTable: card layout on mobile, table on desktop
- Flex-col md:flex-row for section layouts
- overflow-x-auto on NLM architecture diagram

## Dependencies

- MYCAProvider (root layout)
- MAS API at 192.168.0.188:8001 for consciousness, world, chat
- /api/myca/consciousness/* proxy routes
