---
description: Explore the Transformer Explainer at mycosoft.com/natureos/ai-studio/explainer — interactive GPT-2 visualization running in-browser, educational content on tokenization, embeddings, self-attention, and autoregressive generation, plus MYCA architecture integration context.
---

# Transformer Explainer

## Identity
- **Category**: ai
- **Access Tier**: AUTHENTICATED
- **Depends On**: ai-studio
- **Route**: /natureos/ai-studio/explainer
- **Key Components**: app/natureos/ai-studio/explainer/page.tsx

## Success Criteria (Eval)
- [ ] Explainer page loads with "Transformer Explainer" heading, Educational badge, and four info cards (Architecture: GPT-style decoder, Self-Attention: Multi-head mechanism, Tokenization: BPE encoding, Generation: Autoregressive)
- [ ] Interactive Demo tab loads the Polo Club Transformer Explainer iframe (poloclub.github.io/transformer-explainer/) and allows text input to visualize transformer processing
- [ ] Key Concepts tab displays four educational cards explaining Tokenization, Embeddings, Self-Attention (Q/K/V), and Generation with visual examples
- [ ] MYCA Integration tab shows how MYCA uses transformers across four stages (Input Processing, Context Understanding, Agent Coordination with 227+ agents, Response Generation) and links back to AI Studio

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com and log in
2. Open the NatureOS dashboard at /natureos
3. In the sidebar, navigate to AI Studio (/natureos/ai-studio)
4. From within AI Studio, find the link to the Explainer, or navigate directly to /natureos/ai-studio/explainer
5. The Transformer Explainer page loads with a purple Brain icon, heading, and Educational badge
6. Three tabs are available: Interactive Demo (default), Key Concepts, MYCA Integration

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "Transformer Explainer" heading with Brain icon and Educational badge | Top-left of page | Confirms you are on the explainer page |
| Four info cards: Architecture, Self-Attention, Tokenization, Generation | Below heading, 4-column grid | Quick reference for the four core transformer concepts |
| Interactive Demo / Key Concepts / MYCA Integration tabs | Below info cards, full-width tab bar | Switch between the three views |
| Polo Club iframe (dark background, interactive visualization) | Interactive Demo tab, main area | The embedded GPT-2 transformer explainer — enter text to see how it is processed |
| "Fullscreen" button | Interactive Demo tab, top-right of card | Expands the iframe to fill the viewport |
| "Open Original" button | Interactive Demo tab, next to Fullscreen | Opens poloclub.github.io/transformer-explainer/ in a new tab |
| Polo Club badge | Interactive Demo card header | Attribution for the visualization source |
| Note about in-browser GPT-2 | Below the iframe | Explains the demo runs a model directly in your browser |
| Tokenization card with BPE example ("Psilocybe cubensis") | Key Concepts tab, top-left | Shows how text is split into subword tokens |
| Embeddings card with gradient visualization | Key Concepts tab, top-right | Explains 768-dimensional token + position embeddings |
| Self-Attention card with Q/K/V diagram | Key Concepts tab, bottom-left | Shows Query, Key, Value mechanism with attention formula |
| Generation card with autoregressive example | Key Concepts tab, bottom-right | Demonstrates step-by-step token generation |
| MYCA architecture overview with 4-stage pipeline | MYCA Integration tab | Shows Input > Transformer > MAS v2 (227+ Agents) > Response flow |
| "Open MYCA AI Studio" button | MYCA Integration tab, bottom | Links to /natureos/ai-studio |
| "Full Transformer Demo" button | MYCA Integration tab, bottom | Opens the Polo Club demo in a new tab |

## Core Actions
### Action 1: Explore the interactive transformer demo
**Goal:** Understand how GPT-2 processes text by experimenting with the in-browser visualization
1. Navigate to /natureos/ai-studio/explainer
2. The Interactive Demo tab is selected by default
3. The Polo Club Transformer Explainer loads in an iframe (sandboxed with allow-scripts, allow-same-origin, allow-popups)
4. Enter different text prompts in the demo to see how tokens flow through the transformer layers
5. Click "Fullscreen" for a larger view, or "Open Original" to use the demo directly on the Polo Club site

### Action 2: Study key transformer concepts
**Goal:** Learn about tokenization, embeddings, self-attention, and generation
1. Click the "Key Concepts" tab
2. Read through the four concept cards in order: Tokenization (BPE), Embeddings (768-dim vectors), Self-Attention (Q/K/V with softmax), Generation (autoregressive token-by-token)
3. Each card includes visual examples specific to mycology context (e.g., "Psilocybe cubensis" tokenization, "The fungal network grows" generation)

### Action 3: Understand MYCA's transformer integration
**Goal:** See how the transformer architecture powers MYCA's multi-agent system
1. Click the "MYCA Integration" tab
2. Read the four-stage pipeline: Input Processing (tokenization + system prompts), Context Understanding (multi-head attention for concept relationships), Agent Coordination (routing to 227+ specialized agents), Response Generation (autoregressive with temperature control)
3. View the architecture overview diagram showing the Input > Transformer > MAS v2 > Response flow
4. Click "Open MYCA AI Studio" to go to the full command center

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Iframe shows blank white or loading indefinitely | External site (poloclub.github.io) is unreachable or blocked | Check network connectivity; click "Open Original" to test the URL directly; the demo requires JavaScript and WebGL |
| Iframe blocked by browser security | Content Security Policy or ad blocker interference | Disable ad blocker for this page; the iframe uses sandbox="allow-scripts allow-same-origin allow-popups" |
| GPT-2 demo runs slowly in browser | Model inference is compute-intensive in WebAssembly | Normal behavior — the demo runs a real GPT-2 model in your browser; wait for processing to complete |
| Page loads but no tabs visible | JavaScript hydration failure | Hard refresh the page (Ctrl+Shift+R) |

## Composability
- **Prerequisite skills**: ai-studio (parent route and navigation context)
- **Next skills**: ai-model-training (train your own NLM), ai-myca-chat (interact with the AI that uses these concepts)
- **Related**: platform-natureos-dashboard (NatureOS layout)

## Computer Use Notes
- The iframe loads an external resource (poloclub.github.io) — initial load may take several seconds as it downloads the GPT-2 model to the browser
- Fullscreen mode uses CSS fixed positioning (inset-4 z-50) — click Fullscreen again to toggle back to normal view
- The page is entirely client-side ("use client") with no backend API calls — it works without authentication beyond the NatureOS layout gate
- The Key Concepts and MYCA Integration tabs are static educational content — no loading states or data fetching
- The four info cards at the top are always visible regardless of which tab is selected

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
