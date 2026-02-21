# MYCA Full Website Integration

**Date**: February 17, 2026  
**Author**: MYCA  
**Status**: Complete  

## Overview

This document describes the unified MYCA integration across the Mycosoft website. MYCA chat now uses a single provider, shared session/conversation IDs, consistent MAS routing, and a global floating chat entry point for scientific and admin surfaces. All MYCA calls are aligned to pass `user_id`, `session_id`, and `conversation_id` where supported.

## Architecture

### Global Provider

- `contexts/myca-context.tsx` provides:
  - Persistent `sessionId` stored in `localStorage` with user binding.
  - Shared `conversationId` persisted per user.
  - Unified messages store and memory sync to MAS.
  - Shared consciousness polling via `/api/myca/consciousness/status`.
  - Confirmation handling via `/api/mas/voice/confirm`.

### Unified Chat UI

- `components/myca/MYCAChatWidget.tsx` renders the shared MYCA chat UI.
- `components/myca/MYCAFloatingButton.tsx` opens a slide-over chat panel for pages without embedded chat.
- Legacy chat panels in `components/mas/` and `components/search/panels/` now wrap the unified widget.

### Session and Conversation

- Session IDs: `myca_<userId|anon>_<timestamp>_<suffix>` stored in `localStorage`.
- Conversation IDs: stored per user in `localStorage` and hydrated via `/api/myca/conversations`.
- Messages are synchronized to MAS using `/api/myca/sync` and `/api/mas/memory`.

## Key Changes

### Providers and Layout

- `app/layout.tsx` now wraps the app with `MYCAProvider` between `AppStateProvider` and voice providers.

### Pages and Surfaces

- `/natureos/ai-studio` now uses the unified `MYCAChatWidget`.
- `/search` uses the unified MYCA chat with search context injection.
- `/dashboard` includes a floating MYCA assistant button.
- `/scientific/*` pages use a shared floating MYCA assistant via `app/scientific/layout.tsx`.
- `/admin/voice-health` includes a floating MYCA diagnostics button.

### API Routing

- New route: `app/api/myca/sync/route.ts` for conversation save/restore.
- All `/api/myca/*` POST routes now forward `user_id`, `session_id`, and `conversation_id`.
- Consciousness GET routes forward `user_id`, `session_id`, and `conversation_id` when provided.

## Files Added

- `contexts/myca-context.tsx`
- `components/myca/MYCAChatWidget.tsx`
- `components/myca/MYCAFloatingButton.tsx`
- `app/api/myca/sync/route.ts`

## Files Updated (Highlights)

- `app/layout.tsx`
- `app/natureos/ai-studio/page.tsx`
- `app/dashboard/page.tsx`
- `app/scientific/layout.tsx`
- `app/admin/voice-health/page.tsx`
- `components/search/fluid/FluidSearchCanvas.tsx`
- `components/search/panels/MYCAChatPanel.tsx` (wrapper)
- `components/mas/myca-chat-panel.tsx` (wrapper)
- `/app/api/myca/*` routes for session/user forwarding
- `hooks/use-myca-context.ts`

## Verification

1. Open `/search` and send a message to MYCA.
2. Navigate to `/natureos/ai-studio` — the same conversation should be visible.
3. Reload the page — session and conversation should persist.
4. Open `/dashboard` — floating MYCA button opens same conversation.
5. Open a `/scientific/*` page — floating MYCA button uses same conversation.
6. If you are logged in, sessions are bound to `user.id`.

## Related Documents

- `docs/MYCA_WIDGET_AI_INTEGRATION_FEB11_2026.md`
- `docs/VOICE_TEST_QUICK_START_FEB18_2026.md`
- `docs/MYCA_VOICE_APPLICATION_HANDOFF_FEB17_2026.md`
