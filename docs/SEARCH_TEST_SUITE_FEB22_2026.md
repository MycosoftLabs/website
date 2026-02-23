# Search Test Suite - Feb 22, 2026

## Overview

Comprehensive test checklist for search functionality across mobile, tablet, and desktop. Simulates various user types and validates MYCA integration.

## Test URLs

- **Sandbox**: https://sandbox.mycosoft.com/search
- **Local Dev**: http://localhost:3010/search

## User Personas and Test Cases

### Persona 1: Casual Researcher (Mobile)

**Device**: iPhone SE / Android phone (320–390px)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open /search on phone | MobileSearchChat loads (MYCA header, chat thread, input bar) |
| 2 | Type "What is Amanita muscaria?" | User message appears; loading indicator; MYCA response |
| 3 | Tap voice mic | Voice input starts; speak "show me edible mushrooms" |
| 4 | Tap notepad icon | Bottom sheet opens with saved items (or empty state) |
| 5 | Save a message to notepad | Item appears in notepad; badge count updates |
| 6 | Tap suggestion chip | Message sends automatically |

### Persona 2: Mycology Student (Tablet)

**Device**: iPad / Android tablet (768–1024px)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open /search | FluidSearchCanvas loads (widgets, canvas) |
| 2 | Search "psilocybin compounds" | Species/chemistry widgets show results |
| 3 | Open MYCA panel (left) | Chat loads; send "Explain psilocybin biosynthesis" |
| 4 | Drag widget to notepad | Item saved; appears in right panel |
| 5 | Use voice search | PersonaPlex or Web Speech activates |

### Persona 3: Power User (Desktop)

**Device**: Desktop (1024px+)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open /search | Full 3-panel layout (chat | canvas | results+notepad) |
| 2 | Search "fungal genetics ITS sequence" | Genetics widget populates |
| 3 | Ask MYCA "Compare Amanita and Psilocybe" | AI response with data cards if applicable |
| 4 | Export notepad | Downloads .txt file |

## Hero Video Tests

| Page | Device | Expected |
|------|--------|----------|
| Home / | Phone | Hero video autoplays (muted, inline) |
| Home / | Tablet | Hero video autoplays |
| /devices/mushroom-1 | Phone | Hero video autoplays |
| /devices/sporebase | Phone | Hero video autoplays |
| /defense | Phone | Hero video autoplays |
| All above | Desktop | Videos autoplay (no regression) |

## MYCA Integration Tests

| # | Test | Expected |
|---|------|----------|
| 1 | Math query: "What is 17 * 23?" | Correct numeric answer |
| 2 | Fungi query: "Tell me about Reishi" | Species info, possibly data card |
| 3 | Document query: "Show me a research paper on mycelium" | NLQ data or search result |
| 4 | Location query: "Where are mushroom observations in Oregon?" | Map/location data if available |
| 5 | Memory toggle | MYCA remembers/forgets context |
| 6 | Consciousness indicator | Green pulse when MYCA conscious |

## Breakpoint Verification

| Breakpoint | Layout | Search Component |
|------------|--------|------------------|
| < 640px | Single column | MobileSearchChat |
| 640–1023px | Canvas only | FluidSearchCanvas |
| 1024px+ | 3-panel | FluidSearchCanvas + panels |

## Browser Test Matrix

- Chrome (desktop, Android)
- Safari (desktop, iOS)
- Firefox (desktop)
- Edge (desktop)

## Quick Smoke Test (5 min)

1. Open sandbox.mycosoft.com on phone → resize to 375px or use DevTools
2. Go to /search → verify MYCA chat UI
3. Type "Amanita" → verify response
4. Go to / → verify hero video plays
5. Go to /devices/mushroom-1 → verify hero video plays
