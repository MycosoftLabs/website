# MYCA Widget Sandbox Deployment Prep – February 10, 2026

**Purpose:** Prepare MYCA AI widget and panel changes for sandbox live testing. **Deployment is executed by another agent.** This document supplements `SANDBOX_LIVE_TESTING_PREP_FEB18_2026.md` with feature-specific test steps.

---

## 1. What Changed (Website Repo)

### Files Modified

| File | Change |
|------|--------|
| `hooks/use-voice-search.ts` | Voice command priority: specific intents (show fungus/document/location) before general "show me" |
| `components/search/panels/MYCAChatPanel.tsx` | Added mic button for voice input; syncs with main search mic via `voice:toggle` |
| `components/search/SearchContextProvider.tsx` | Added `voiceListening`, `setVoiceListening` for shared mic state |
| `components/search/fluid/FluidSearchCanvas.tsx` | Voice state sync to context; `voice:toggle` event for panel mic |
| `docs/MYCA_WIDGET_TEST_CASES_FEB10_2026.md` | Full regression test checklist (text + voice, all operators) |

### Features

- **AI Widget (grid):** Unified search AI answers; follow-up questions via `/api/search/ai`
- **MYCA Panel (left):** Continuous chat; Brain stream + search AI fallback; **new mic button**
- **Voice:** Shared mic (search bar + panel); voice commands for fungi, documents, locations, widget focus, AI questions

---

## 2. VM Requirements (Sandbox Live)

| VM | IP | Required For |
|----|-----|--------------|
| **Sandbox** | 192.168.0.187 | Website container |
| **MAS** | 192.168.0.188 | MYCA Consciousness, Brain, `/api/search/ai` fallback |
| **MINDEX** | 192.168.0.189 | Species, compounds, genetics, research search results |

- **MAS** must be reachable: `http://192.168.0.188:8001/health`
- **MINDEX** for unified search: `http://192.168.0.189:8000`

---

## 3. Env Vars (Website Container)

Ensure these are set when starting the website container:

- `MAS_API_URL=http://192.168.0.188:8001`
- `MINDEX_API_URL=http://192.168.0.189:8000`

---

## 4. Deployment (For Deploy Agent)

Follow **MAS repo** → `docs/SANDBOX_LIVE_TESTING_PREP_FEB18_2026.md` §3:

1. Pull website from GitHub `main`
2. Rebuild Docker image (no-cache)
3. Start container **with NAS mount** and env vars
4. Purge Cloudflare cache
5. Verify URLs

No MAS or MINDEX changes required for this feature.

---

## 5. Post-Deploy Test (Sandbox)

**Live URL:** https://sandbox.mycosoft.com/search

### Quick Smoke

| # | Action | Expected |
|---|--------|----------|
| 1 | Open `/search` | Page loads; search bar, widgets, left MYCA panel |
| 2 | Type `2+2` in search | AI widget shows answer |
| 3 | Type in MYCA panel: `What is reishi?` | MYCA/Brain answer |
| 4 | Click mic in MYCA panel | Mic activates (red/pulse); can speak |
| 5 | Say "Show me reishi" | Species widget populated; search runs |

### Full Checklist

Use **website** → `docs/MYCA_WIDGET_TEST_CASES_FEB10_2026.md` for the complete regression matrix:

- Text: math, fungi, documents, locations (AI widget + panel)
- Voice: main mic + panel mic; all voice commands
- Widget focus: species, research, location, AI

---

## 6. Voice on Sandbox

- **Web Speech API:** Works in Chrome/Edge if HTTPS; may require user permission.
- **PersonaPlex:** If Bridge (8999) is reachable from browser, configure `NEXT_PUBLIC_PERSONAPLEX_BRIDGE_WS_URL` for sandbox.mycosoft.com. Otherwise Web Speech is the fallback.

---

## 7. Related Docs

- `docs/MYCA_WIDGET_TEST_CASES_FEB10_2026.md` – Full test cases
- `docs/VOICE_SEARCH_MANUAL_TEST_CHECKLIST_FEB11_2026.md` – Voice + search
- MAS `docs/SANDBOX_LIVE_TESTING_PREP_FEB18_2026.md` – Deployment checklist
