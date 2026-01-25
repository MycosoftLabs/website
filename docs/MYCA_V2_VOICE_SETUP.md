# MYCA v2 Voice System Setup

**Date**: 2026-01-25  
**Status**: Implementation Complete  
**Version**: 2.1

---

## Overview

MYCA v2 now includes full n8n workflow integration and ElevenLabs voice synthesis using the **Arabella** voice (`aEO01A4wXwd1O8GPgGlF`) configured in your ElevenLabs account.

### Key Features
- **ElevenLabs Arabella Voice** - Female voice with personality
- **n8n Workflow Integration** - Speech turn, safety, confirmation flows
- **223 Agent Registry** - Complete agent audit
- **Memory System** - Short-term and long-term conversation memory
- **Safety Confirmations** - "Confirm and proceed" for destructive operations

---

## What Was Built

### 1. Voice API Endpoint (`/api/mas/voice`)

- **POST**: Synthesizes speech using ElevenLabs
- **GET**: Returns voice configuration status
- Falls back to browser TTS if ElevenLabs unavailable

### 2. Memory API Endpoint (`/api/mas/memory`)

- **GET**: Retrieve conversation history
- **POST**: Store conversation turns
- **DELETE**: Clear session memory
- Supports both MAS orchestrator and Supabase backends

### 3. Complete Agent Registry (`/api/mas/agents`)

- Returns all **223 agents** from `AGENT_REGISTRY.md`
- Organized by 14 categories
- Real-time status (simulated when MAS offline)

### 4. Updated Chat API (`/api/mas/chat`)

- Accurate agent counts (223 total, 180 active)
- Intelligent fallback responses
- Routes to MAS orchestrator when available

### 5. Enhanced MYCA Chat Panel

- ElevenLabs TTS integration
- Web Speech API for voice input
- Session-based memory
- Real-time agent stats display

---

## Environment Variables Needed

Add these to your `.env.local` or environment:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=sk_your_elevenlabs_key_here
MYCA_VOICE_ID=aEO01A4wXwd1O8GPgGlF  # Arabella voice

# MAS Orchestrator
MAS_API_URL=http://192.168.0.188:8001

# Optional: Supabase for memory persistence
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

---

## ElevenLabs Voice Details

**Agent ID**: `agent_2901kcpp3bk2fcjshrajb9fxvv3y`  
**Voice**: Arabella  
**Voice ID**: `aEO01A4wXwd1O8GPgGlF`  
**Model**: `eleven_turbo_v2_5`  

**Voice Settings**:
```json
{
  "stability": 0.4,
  "similarity_boost": 0.8,
  "style": 0.2,
  "use_speaker_boost": true
}
```

---

## How It Works

### Voice Output Flow

1. User sends message via chat or voice
2. MYCA Chat API processes and returns response
3. Response text sent to `/api/mas/voice`
4. API calls ElevenLabs TTS with Arabella voice
5. Audio streamed back to browser
6. Browser plays audio

### Voice Input Flow

1. User clicks microphone button
2. Web Speech API starts listening
3. Transcript populated in input field
4. User sends (Enter or button)

### Memory Flow

1. Each message stored via `/api/mas/memory`
2. Session ID tracks conversation continuity
3. Context preserved across page refreshes (when configured)

---

## Agent Registry Summary

| Category | Count | Examples |
|----------|-------|----------|
| Core | 10 | Orchestrator, Memory Manager, Task Router |
| Financial | 12 | Mercury, Stripe, Accounting, Treasury |
| Mycology | 25 | Species Classifier, Taxonomy, Traits |
| Research | 15 | PubMed, Scholar, Literature |
| DAO | 40 | Governance, Voting, Staking |
| Communication | 10 | Voice (ElevenLabs), Email, SMS |
| Data | 30 | MINDEX, ETL, Search, Analytics |
| Infrastructure | 15 | Docker, Proxmox, Network |
| Simulation | 12 | Earth Sim, Growth Sim |
| Security | 8 | Watchdog, Guardian, Audit |
| Integration | 20 | n8n, OpenAI, GitHub |
| Device | 18 | MycoBrain, Sensors |
| Chemistry | 8 | ChemSpider, SAR |
| NLM | 20 | Training, Inference |
| **TOTAL** | **223** | |

---

## Testing Voice

### Test ElevenLabs Direct

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/aEO01A4wXwd1O8GPgGlF" \
  -H "Accept: audio/mpeg" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: YOUR_API_KEY" \
  -d '{"text":"Hello, I am MYCA, your Mycosoft Cognitive Agent.","model_id":"eleven_turbo_v2_5"}' \
  -o test_myca_voice.mp3
```

### Test via Website API

```bash
curl -X POST http://localhost:3010/api/mas/voice \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, I am MYCA"}' \
  -o test_voice.mp3
```

---

## Remaining Tasks

1. **Set ELEVENLABS_API_KEY** in production environment
2. **Deploy to VM** - Pull latest, rebuild container
3. **Configure Supabase tables** for memory persistence:
   - `myca_conversations`
   - `myca_conversation_messages`
4. **Test voice end-to-end** in browser
5. **Enable MAS orchestrator** voice endpoints

---

## MAS VM Orchestrator Endpoints

The MAS orchestrator at 192.168.0.188:8001 should have these endpoints:

- `POST /voice/orchestrator/chat` - Main chat with voice
- `POST /voice/tts` - Text-to-speech
- `GET /agents/registry/` - Agent listing
- `POST /memory/store` - Memory storage
- `GET /memory/conversations` - Memory retrieval

---

## Dashboard Location

**URL**: http://localhost:3010/natureos/ai-studio

Features:
- MYCA Chat with voice
- 223 agent registry
- Real-time system status
- n8n workflow integration
- Notification center

---

## n8n Workflow Integration

### Available Workflows

The voice system integrates with these n8n workflows:

| Workflow | Webhook | Purpose |
|----------|---------|---------|
| Speech Turn | `/webhook/myca/speech_turn` | Intent detection |
| Speech Safety | `/webhook/myca/speech_safety` | Safety checks for destructive ops |
| Speech Confirm | `/webhook/myca/speech_confirm` | Confirmation processing |
| Voice Chat | `/webhook/voice-chat` | Full voice pipeline |
| MYCA Command | `/webhook/myca-command` | Text command processing |
| Jarvis Unified | `/webhook/myca/command` | Infrastructure commands |

### Speech Turn Flow

1. User speaks → STT
2. Call `/webhook/myca/speech_turn` to classify intent
3. If `intent == "command"` with risk:
   - Call `/webhook/myca/speech_safety`
   - Get confirmation challenge
   - Wait for user response
   - Call `/webhook/myca/speech_confirm`
4. Execute action via orchestrator
5. Generate TTS response
6. Return audio

### Safety Confirmation Phrases

| Risk Level | Phrase |
|------------|--------|
| Write | "Confirm and proceed" |
| Destructive | "Confirm irreversible action" |
| Abort | "Abort" or "Cancel that" |

### n8n Environment Variables

```bash
N8N_URL=http://192.168.0.188:5678
N8N_USER=admin
N8N_PASSWORD=your-password
N8N_ENCRYPTION_KEY=your-key
```

---

## Voice Processing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (AI Studio)                       │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                    ┌────────────▼───────────┐
                    │   MYCAChatPanel v2.1   │
                    │   (Voice I/O + Memory) │
                    └────────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ /api/mas/     │      │ /api/mas/voice/ │      │ /api/mas/voice/ │
│ voice         │      │ orchestrator    │      │ confirm         │
│ (TTS only)    │      │ (Full pipeline) │      │ (Safety flow)   │
└───────┬───────┘      └────────┬────────┘      └────────┬────────┘
        │                       │                        │
        │         ┌─────────────┼─────────────┐          │
        │         │             │             │          │
        ▼         ▼             ▼             ▼          ▼
┌───────────────────────────────────────────────────────────────────┐
│                        n8n Workflows                              │
│  speech_turn → speech_safety → speech_confirm → myca_command     │
└────────────────────────────────┬──────────────────────────────────┘
                                 │
                    ┌────────────▼───────────┐
                    │   MAS Orchestrator     │
                    │   192.168.0.188:8001   │
                    │   - 223 agents         │
                    │   - Memory manager     │
                    │   - Task router        │
                    └────────────┬───────────┘
                                 │
         ┌──────────────────┬────┴────┬──────────────────┐
         │                  │         │                  │
         ▼                  ▼         ▼                  ▼
┌─────────────┐    ┌─────────────┐  ┌────────┐    ┌───────────┐
│ ElevenLabs  │    │  Whisper    │  │ Ollama │    │   Redis   │
│ (Arabella)  │    │   (STT)     │  │ (LLM)  │    │ (Broker)  │
└─────────────┘    └─────────────┘  └────────┘    └───────────┘
```

---

## Complete API Reference

### Voice Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mas/voice` | GET | Voice configuration |
| `/api/mas/voice` | POST | TTS synthesis only |
| `/api/mas/voice/orchestrator` | POST | Full voice chat |
| `/api/mas/voice/confirm` | POST | Process confirmation |
| `/api/mas/voice/confirm` | GET | Get pending confirmations |

### Chat Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mas/chat` | POST | Text chat with MYCA |
| `/api/mas/agents` | GET | List all 223 agents |
| `/api/mas/memory` | GET | Retrieve conversation history |
| `/api/mas/memory` | POST | Store conversation turn |
| `/api/mas/health` | GET | System health check |

---

## Deployment Checklist

### 1. Environment Variables (Required)

```bash
# ElevenLabs (REQUIRED for female voice)
ELEVENLABS_API_KEY=sk_your_key_here
MYCA_VOICE_ID=aEO01A4wXwd1O8GPgGlF

# MAS Orchestrator
MAS_API_URL=http://192.168.0.188:8001

# n8n Workflows
N8N_URL=http://192.168.0.188:5678
```

### 2. n8n Workflows

Import these workflows to n8n:
- `n8n/workflows/myca-speech-complete.json`
- `n8n/workflows/myca-jarvis-unified.json`
- `n8n/workflows/speech-interface-v2.json`

Activate all imported workflows.

### 3. MAS Orchestrator

Ensure orchestrator is running with voice endpoints:
```bash
docker-compose up -d mas-orchestrator
```

### 4. ElevenLabs Proxy (Optional)

For local ElevenLabs proxy:
```bash
docker-compose --profile voice-premium up -d elevenlabs-proxy
```

### 5. Verify

Test voice endpoint:
```bash
curl -X POST http://localhost:3010/api/mas/voice/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello MYCA","want_audio":true}' \
  | jq .response_text
```

---

*Last Updated: 2026-01-25 v2.1*
