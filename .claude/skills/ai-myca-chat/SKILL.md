---
description: Interact with MYCA AI assistant at mycosoft.com/myca — text chat, voice interaction via PersonaPlex, multimodal input, live demo with consciousness status, and agent activity monitoring.
---

# MYCA Chat

## Identity
- **Category**: ai
- **Access Tier**: AUTHENTICATED
- **Depends On**: platform-navigation, platform-authentication
- **Route**: /myca
- **Key Components**: app/myca/page.tsx, components/myca/MYCAChatWidget.tsx, components/myca/LiveDemo.tsx, components/myca/MYCALiveActivityPanel.tsx, components/myca/MYCADataBridge.tsx, components/mas/myca-consciousness-status.tsx, contexts/myca-context.tsx

## Success Criteria (Eval)
- [ ] MYCA introduction page loads with hero section showing "Environmental Super Intelligence" heading and consciousness status badge
- [ ] Scroll to Live Demo section (#live-demo), type a text message in the chat input, click Send, and receive a streamed response from MYCA
- [ ] Consciousness status badge displays current MYCA state (e.g., "Active", "Dreaming", "Processing") with periodic refresh
- [ ] Voice interaction via PersonaPlex is accessible from the AI Studio page (/natureos/ai-studio) with connection status indicator
- [ ] Live Activity panel shows real-time agent activity and data bridge status alongside the chat

## Navigation Path (Computer Use)
1. Navigate to mycosoft.com
2. Log in if needed (see platform-authentication skill)
3. Click "MYCA" in the header navigation, or navigate directly to /myca
4. The MYCA introduction page loads with a hero section — green gradient text reading "MYCA" and "Environmental Super Intelligence"
5. At the top center, a consciousness status badge shows MYCA's current state
6. Scroll down past informational sections (Edge-Native Intelligence, Yin-Yang of MYCA and AVANI, Abstract, Hand Thesis, Four Fingers)
7. Reach the "Live Demo" section — this contains the interactive chat widget, activity panel, and data bridge
8. The chat widget has an input field at the bottom, a send button, and a scrollable message area above
9. Type a message and click Send (or press Enter) to interact with MYCA

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "MYCA" hero heading with green gradient text | Top center of page | Confirms you are on the MYCA page |
| Consciousness status badge (e.g., "Active") | Above the hero heading, centered | Shows MYCA's current consciousness state — refreshes every 30s |
| "Experience MYCA" button | Below hero description | Scrolls to the Live Demo section |
| "AI Studio" button | Below hero description, next to Experience MYCA | Links to /natureos/ai-studio for full command center |
| "Request access" button | Below hero, rightmost CTA | Links to /contact for access requests |
| Live Demo section with tabs (Chat, Agents, Data Bridge) | Middle-lower portion of page (id="live-demo") | Main interaction area |
| Chat input field | Bottom of chat widget panel | Type your message here |
| Send button (arrow icon) | Right side of chat input | Click to send message to MYCA |
| Clear messages button (trash icon) | Chat widget header area | Clears conversation history |
| Grounding status badge | Chat widget header | Shows whether MYCA is grounded to real data |
| AVANI status badge | Chat widget header | Shows AVANI earth-context connection status |
| Message bubbles (user and MYCA) | Scrollable area above chat input | Conversation history — MYCA responses stream in token by token |
| Memory toggle | Chat widget settings | Enable/disable conversation memory persistence |

## Core Actions
### Action 1: Send a text message and get a response
**Goal:** Have a conversation with MYCA about environmental science, mycology, or platform capabilities
1. Navigate to /myca and scroll to the Live Demo section (or click "Experience MYCA")
2. Locate the chat input field at the bottom of the chat widget
3. Type a message (e.g., "What species of fungi are most effective at bioremediation?")
4. Click the Send button or press Enter
5. Watch the response stream in — MYCA generates tokens progressively
6. Wait for the response to complete (the loading indicator stops)
7. Continue the conversation by typing follow-up questions

### Action 2: Access voice interaction via PersonaPlex
**Goal:** Use full-duplex voice-to-voice interaction with MYCA
1. Navigate to /natureos/ai-studio (the MYCA Command Center)
2. Look for the PersonaPlex voice status indicator in the bottom-right corner (desktop only)
3. If PersonaPlex shows "Ready", click the volume/microphone button to start listening
4. Speak your question — the transcript appears in the indicator panel
5. MYCA processes the voice input and responds; voice commands can also navigate AI Studio tabs ("show topology", "show activity", "create agent")
6. Note: Voice duplex previously at /myca/voice-duplex now redirects to /test-voice with full consciousness integration

### Action 3: Upload a file for analysis
**Goal:** Provide MYCA with a file (image, document, data) for multimodal analysis
1. In the chat widget, look for a file upload button (paperclip or upload icon) near the input field
2. Click the upload button and select a file from your device
3. The file is attached to your next message — type additional context if needed
4. Click Send — MYCA processes the file alongside your text message
5. The response will reference the uploaded content with analysis, extraction, or insights

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| Chat widget shows login prompt or empty state | Not authenticated | Log in via platform-authentication skill, then return to /myca |
| PersonaPlex indicator shows "Voice Offline" or "Connecting..." | WebSocket connection to voice service failed | Ensure you are on desktop (not mobile); check network; PersonaPlex requires local edge node connectivity |
| Voice button not visible | On mobile device or small screen | PersonaPlex voice is hidden on mobile (lg:block) — use text chat instead |
| Message sent but no response appears | Rate limit hit or API timeout | Wait 30 seconds and try again; check consciousness status badge — if MYCA shows degraded state, the backend may be recovering |
| Response stops mid-stream | Streaming connection interrupted | Refresh the page and resend the message; MYCA context is preserved if memory is enabled |
| Consciousness badge shows "Checking..." indefinitely | Backend health endpoint unreachable | The MAS API at /api/mas/health may be down; try refreshing after 30 seconds |

## Composability
- **Prerequisite skills**: platform-navigation, platform-authentication
- **Next skills**: ai-studio (full MYCA Command Center with agents and topology), ai-explainer (understand transformer architecture behind MYCA), ai-model-training (train the NLM model powering MYCA)
- **Used by workflows**: workflow-research-pipeline (MYCA chat as research interface)

## Computer Use Notes
- The /myca page is primarily informational with the interactive chat embedded in the Live Demo section — scroll or use the "Experience MYCA" anchor link
- Response streaming means text appears token by token — wait for the loading indicator to disappear before reading the full response
- The MYCAChatWidget uses the useMYCA context which manages messages, loading state, memory, and consciousness — state persists across the session
- PersonaPlex voice is only available on desktop (hidden via lg:block CSS class) and requires the edge node voice service
- Consciousness status badge refreshes every 30 seconds (refreshInterval={30000})
- The chat widget supports confirmation flows — some MYCA actions require user confirmation before execution (pendingConfirmationId)
- Audio playback for MYCA responses is best-effort (base64 WAV) and may not work in all browsers

## Iteration Log
### Attempt Log
<!-- YYYY-MM-DD | Attempt N | Task | Result | Learning -->
