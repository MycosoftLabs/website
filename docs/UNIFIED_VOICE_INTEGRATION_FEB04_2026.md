# Unified Voice Integration - February 4, 2026

## Overview

This document details the complete unification of voice input across the Mycosoft website using PersonaPlex as the primary voice engine. All voice interactions now route through the PersonaPlex Bridge (port 8999) which provides MAS Event Engine integration, CUDA warmup handling, and MYCA Brain routing.

## Architecture

### Voice Flow

```
User Voice Input
      ↓
PersonaPlexWidget (Floating Button)
      ↓
usePersonaPlex Hook (WebSocket)
      ↓
PersonaPlex Bridge (ws://localhost:8999/api/chat)
      ↓
┌─────────────────────────────────────────┐
│           PersonaPlex Bridge            │
│  - CUDA Graph Warmup (60-90s)           │
│  - MAS Event Engine Integration         │
│  - Tool Calls & Agent Routing           │
│  - Memory Persistence                   │
└─────────────────────────────────────────┘
      ↓                    ↓
Moshi Server          MYCA Brain Engine
(Port 8998)           (Port 8001)
Immediate Response    Intelligent Response
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PersonaPlexProvider` | `components/voice/PersonaPlexProvider.tsx` | App-level context provider for site-wide voice |
| `PersonaPlexWidget` | `components/voice/PersonaPlexWidget.tsx` | Floating microphone button with status |
| `usePersonaPlex` | `hooks/usePersonaPlex.ts` | Core hook for WebSocket connection & audio |
| `usePersonaPlexContext` | `components/voice/PersonaPlexProvider.tsx` | Context hook for accessing voice state |

### Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Moshi Server (Direct) | 8998 | Raw PersonaPlex LLM (not used directly) |
| PersonaPlex Bridge | 8999 | WebSocket proxy with MAS integration |
| MYCA Brain Engine | 8001 | Intelligent responses, tool calls, agents |

## Implementation Details

### Phase 1: App-Level Provider

The `PersonaPlexProvider` is wrapped at the root layout level in `app/layout.tsx`:

```tsx
<PersonaPlexProvider enabled={true}>
  {/* All app content */}
</PersonaPlexProvider>
```

This provides site-wide voice context accessible via `usePersonaPlexContext()`.

### Phase 2: Global Voice Widget

The `PersonaPlexWidget` renders as a floating button in the bottom-right corner of every page. It provides:
- Microphone toggle button
- Connection status indicator
- Audio level visualization
- CUDA warmup progress display

### Phase 3: Search Bar Integration

Voice input buttons were added to all search components:

#### Command Search (`components/command-search.tsx`)
- Mic button in search input
- Voice transcript populates search query
- Works in both regular and AI mode

#### Enhanced Search (`components/enhanced-search.tsx`)
- Mic button next to search icon
- Voice transcripts auto-populate search

#### MINDEX Search (`components/mindex/search-input.tsx`)
- Mic button for taxonomy search
- Voice input for species names

### Phase 4: Topology Page Voice Commands

Location: `app/natureos/mas/topology/page.tsx`

Available voice commands:
| Command | Action |
|---------|--------|
| "show agent [name]" | Highlights agent in topology |
| "select agent [name]" | Selects agent node |
| "fullscreen" | Enters fullscreen mode |
| "exit fullscreen" | Exits fullscreen mode |
| "go back" | Returns to NatureOS |

### Phase 5: AI Studio Integration

Location: `app/natureos/ai-studio/page.tsx`

The AI Studio now uses the app-level `PersonaPlexProvider` instead of its own `UnifiedVoiceProvider`.

Available voice commands:
| Command | Action |
|---------|--------|
| "show command" | Switches to Command tab |
| "show agents" | Switches to Agents tab |
| "show topology" | Switches to Topology tab |
| "show memory" | Switches to Memory tab |
| "show activity" | Switches to Activity tab |
| "show workflows" | Switches to Workflows tab |
| "show system" | Switches to System tab |
| "create agent" | Opens Agent Creator |
| "refresh" | Refreshes dashboard data |

### Phase 6: MINDEX Dashboard Voice Commands

Location: `components/natureos/mindex-dashboard.tsx`

Available voice commands:
| Command | Action |
|---------|--------|
| "overview" | Shows Overview section |
| "encyclopedia" / "species" | Shows Encyclopedia section |
| "data" / "pipeline" | Shows Data Pipeline section |
| "integrity" / "verify" | Shows Integrity section |
| "crypto" / "cryptography" | Shows Cryptography section |
| "ledger" | Shows Ledger section |
| "network" / "mycorrhizal" | Shows Network section |
| "phylogeny" / "tree" | Shows Phylogeny section |
| "genomics" / "genome" | Shows Genomics section |
| "devices" | Shows Devices section |
| "mwave" / "m-wave" | Shows M-Wave section |
| "containers" / "docker" | Shows Containers section |
| "sync" / "synchronize" | Triggers data sync |
| "refresh" / "update" | Refreshes dashboard |
| "search [query]" | Searches encyclopedia |

### Phase 7: CREP Voice Map Controls

Location: `components/crep/voice-map-controls.tsx`

Upgraded from `useVoiceChat` to `usePersonaPlexContext`. Supports:
- Map navigation commands ("go to [location]")
- Zoom controls ("zoom in", "zoom out", "zoom level 5")
- Layer controls ("show satellites", "hide vessels")
- Filter controls ("clear filters")
- Device location ("locate [device]")

### Phase 8: NatureOS Dashboard Voice Commands

Location: `components/dashboard/natureos-dashboard.tsx`

Available voice commands:
| Command | Action |
|---------|--------|
| "overview" | Shows Overview tab |
| "devices" | Shows Devices tab |
| "network" | Shows Network tab |
| "analytics" | Shows Analytics tab |
| "agents" | Shows Agents tab |
| "earth" / "globe" / "map" | Shows Earth tab |
| "mycobrain" | Shows MycoBrain tab |
| "go to topology" | Navigates to Topology page |
| "ai studio" / "command center" | Navigates to AI Studio |
| "mindex" | Navigates to MINDEX |

## Files Modified

### Core Voice Components
- `components/voice/PersonaPlexProvider.tsx` - Updated serverUrl to bridge (8999)
- `components/voice/PersonaPlexWidget.tsx` - Updated default serverUrl to bridge
- `hooks/usePersonaPlex.ts` - Updated default serverUrl to bridge

### Search Components
- `components/command-search.tsx` - Added mic button and voice transcript handling
- `components/enhanced-search.tsx` - Added mic button and PersonaPlex integration
- `components/mindex/search-input.tsx` - Added mic button for taxonomy search

### Page Components
- `app/natureos/mas/topology/page.tsx` - Added voice commands and status display
- `app/natureos/ai-studio/page.tsx` - Switched to PersonaPlex context
- `components/natureos/mindex-dashboard.tsx` - Added voice navigation
- `components/crep/voice-map-controls.tsx` - Upgraded to PersonaPlex
- `components/dashboard/natureos-dashboard.tsx` - Added voice navigation

## Usage Guide

### Accessing Voice State in Components

```tsx
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"

function MyComponent() {
  const personaplex = usePersonaPlexContext()
  
  // Safely destructure with defaults
  const { 
    isListening, 
    lastTranscript, 
    startListening, 
    stopListening, 
    isConnected,
    connectionState,
    isSpeaking 
  } = personaplex || {
    isListening: false,
    lastTranscript: "",
    startListening: () => {},
    stopListening: () => {},
    isConnected: false,
    connectionState: "disconnected",
    isSpeaking: false,
  }
  
  // Handle voice transcript
  useEffect(() => {
    if (lastTranscript) {
      // Process voice command
      const command = lastTranscript.toLowerCase()
      if (command.includes("my command")) {
        // Do something
      }
    }
  }, [lastTranscript])
  
  return (
    <button onClick={() => isListening ? stopListening() : startListening()}>
      {isListening ? "Stop" : "Start"} Voice
    </button>
  )
}
```

### Adding Voice to New Pages

1. Import the context hook:
```tsx
import { usePersonaPlexContext } from "@/components/voice/PersonaPlexProvider"
```

2. Get voice state in your component:
```tsx
const personaplex = usePersonaPlexContext()
const { isListening, lastTranscript, startListening, stopListening, isConnected } = personaplex || {
  isListening: false,
  lastTranscript: "",
  startListening: () => {},
  stopListening: () => {},
  isConnected: false,
}
```

3. Add voice command handler:
```tsx
useEffect(() => {
  if (!lastTranscript) return
  
  const command = lastTranscript.toLowerCase()
  
  if (command.includes("my action")) {
    // Perform action
  }
}, [lastTranscript])
```

4. Optionally add a voice button:
```tsx
<Button
  onClick={() => isListening ? stopListening() : startListening()}
  disabled={!isConnected}
>
  {isListening ? <MicOff /> : <Mic />}
  Voice
</Button>
```

## Configuration

### Environment Variables

```env
# PersonaPlex Bridge URL (default: ws://localhost:8999/api/chat)
NEXT_PUBLIC_PERSONAPLEX_URL=ws://localhost:8999/api/chat

# MYCA Brain Engine URL
NEXT_PUBLIC_MAS_API_URL=http://192.168.0.188:8001
```

### PersonaPlex Provider Options

```tsx
<PersonaPlexProvider
  enabled={true}                    // Enable/disable voice
  serverUrl="ws://localhost:8999/api/chat"  // Bridge URL
  voicePrompt="NATURAL_F2.pt"       // Voice model
  textPrompt={MYCA_PERSONAPLEX_PROMPT}      // System prompt
  enableMasRouting={true}           // MAS Event Engine
  enableMemory={true}               // Memory persistence
  enableN8n={true}                  // n8n workflow integration
>
```

## Troubleshooting

### Voice Not Connecting

1. Check PersonaPlex Bridge is running on port 8999
2. Check CUDA graphs are warming up (60-90 seconds on first connection)
3. Verify WebSocket connection in browser dev tools
4. Check browser microphone permissions

### Voice Commands Not Working

1. Ensure `lastTranscript` is being received
2. Check command matching is case-insensitive
3. Verify the component has access to PersonaPlex context
4. Check for JavaScript errors in console

### Poor Voice Recognition

1. Ensure CUDA graphs are fully compiled
2. Check microphone input levels
3. Reduce background noise
4. Speak clearly and at normal pace

## Performance Considerations

- CUDA graph compilation takes 60-90 seconds on first connection
- Keep voice sessions short to reduce memory usage
- The floating widget automatically handles connection lifecycle
- Voice transcripts are processed locally before routing to Brain

## Security Notes

- Voice data is processed locally via PersonaPlex
- WebSocket connections use standard browser security
- No voice data is stored permanently unless memory is enabled
- MAS Event Engine validates all tool calls before execution
