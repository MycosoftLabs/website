# Presence API Implementation

**Date**: February 24, 2026  
**Status**: Complete

## Overview

Website-side implementation of MYCA Live Presence: heartbeat, sessions, online users, API usage tracking. Supabase-backed with RLS.

## Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/presence/heartbeat` | POST | User | Send heartbeat, upsert session |
| `/api/presence/sessions` | GET | User or x-service-key | Active sessions |
| `/api/presence/online` | GET | User or x-service-key | Online users (60s threshold) |
| `/api/presence/stream` | GET | User or x-service-key | SSE real-time presence |
| `/api/presence/api-usage` | POST/GET | varies | API usage logs |

## Files

- `hooks/usePresenceHeartbeat.ts` – heartbeat hook
- `contexts/presence-context.tsx` – PresenceProvider
- `lib/api-usage-interceptor.ts` – API call tracking
- `app/api/presence/*` – route handlers
- `supabase/migrations/20260224000000_active_sessions.sql` – schema

## Env

- `PRESENCE_SERVICE_KEY` – for MAS/service-to-service calls

## Related

- MAS: `docs/MYCA_LIVE_PRESENCE_AND_SESSION_COMPLETE_FEB24_2026.md`
- Atomic: `docs/myca/atomic/MYCA_PRESENCE.md` (in MAS repo)
