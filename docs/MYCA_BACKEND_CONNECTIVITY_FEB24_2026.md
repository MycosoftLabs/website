# MYCA Backend Connectivity Guide

**Date:** February 24, 2026

## Overview

MYCA Live Demo chat connects through:

1. **Website** → `/api/mas/voice/orchestrator` (Next.js API route)
2. **Orchestrator** → tries in order:
   - MAS Consciousness API (`http://${MAS_VM_HOST:-localhost}:8001/api/myca/chat`) — 6s timeout
   - Claude (ANTHROPIC_API_KEY)
   - OpenAI GPT-4 (OPENAI_API_KEY)
   - Groq (GROQ_API_KEY)
   - Gemini (GOOGLE_AI_API_KEY)
   - xAI Grok (XAI_API_KEY)
   - n8n workflows
3. **Fallback:** If all fail, returns a helpful error message.

## Quick Diagnostic

```powershell
Invoke-RestMethod -Uri "http://localhost:3010/api/myca/connectivity"
```

Returns: `ok`, `mas` status, `llm_keys` status, `summary`. Use when chat fails.

## Verification Steps

### 1. MAS VM (${MAS_VM_HOST}:8001)

```powershell
Invoke-RestMethod -Uri "http://${MAS_VM_HOST:-localhost}:8001/health" -TimeoutSec 5
```

- **Success:** Returns JSON with status
- **Timeout:** MAS VM unreachable (different network, VM down, or firewall)
- **Fix:** Ensure dev machine and MAS VM are on same LAN (192.168.0.x). SSH to VM: `ssh mycosoft@${MAS_VM_HOST}`

### 2. Website Health Proxy

```powershell
Invoke-RestMethod -Uri "http://localhost:3010/api/mas/health" -TimeoutSec 5
```

- Proxies to MAS health; returns `status: "offline"` when MAS unreachable
- Uses 5s timeout to avoid hanging

### 3. Orchestrator (Chat)

```powershell
$body = '{"message":"Hello"}'
Invoke-RestMethod -Uri "http://localhost:3010/api/mas/voice/orchestrator" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 60
```

- **MAS up:** Uses MAS Consciousness API first
- **MAS down:** Falls through to Claude, OpenAI, Groq, etc. (requires API keys in `.env.local`)

## Required Environment (.env.local)

```env
# MAS VM - used when reachable
MAS_API_URL=http://${MAS_VM_HOST:-localhost}:8001

# At least one LLM key for chat when MAS is down
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
# or
GROQ_API_KEY=gsk_...
```

## Timeouts

| Endpoint | Timeout | Purpose |
|----------|---------|---------|
| MAS health | 5s | Quick status check |
| MAS consciousness | 6s | Fail fast, fall back to LLMs |
| Client (sendMessage) | 180s | Full orchestrator + LLM response |

## Common Issues

1. **AbortError / "signal is aborted"** — Client timeout or MAS/LLM slow. Increased to 180s; polyfill for `AbortSignal.timeout` added.
2. **"MYCA can't reach the API backend"** — MAS VM (${MAS_VM_HOST}) unreachable. Use LLM fallbacks (set API keys) or fix network.
3. **"API keys"** — Add ANTHROPIC_API_KEY or other LLM keys to `.env.local` for when MAS is down.
