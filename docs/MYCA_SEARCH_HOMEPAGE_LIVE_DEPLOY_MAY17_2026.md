# MYCA, Search, and Homepage Live Deploy Evidence - May 17, 2026

## Release scope

This release contains the production-safe website slice for:

- MYCA public chat reliability and identity-boundary behavior.
- Public MYCA surfaces on the homepage, `/myca`, floating widgets, search panels, terminal-style widgets, and legacy chat callers.
- Search and search-results routing improvements, including mobile search layout, contextual search widgets, trend readiness, and search memory isolation support.
- Homepage MYCA demo entry point and related glass-button styling.

The active Earth simulator, CREP, fungal atlas, Petri v2, and generated screenshot work remains out of this live deploy. Search widgets may still render an Earth result panel when query context requires it, but unfinished simulator feature work is not included in the release cut.

## MYCA changes

- `/api/mas/voice/orchestrator` is the canonical public text chat route.
- Basic text chat calls MAS `/voice/orchestrator/chat` first with a short timeout, then MAS `/api/myca/chat` as the fast fallback.
- `/voice/brain/chat` is no longer part of the blocking public text path unless an explicit deep, voice, or brain mode needs it later.
- Responses include consistent `response_text`, `agent`, `routed_to`, `latency_ms`, `runtime_context`, `actions`, `provider`, and provider timing fields.
- All legacy public chat callers now use the canonical website route instead of bypassing into older consciousness routes.
- The MYCA context renders security/governance denial text from non-OK JSON responses instead of replacing it with a generic unavailable message.
- Identity remains server-resolved: browser-supplied `user_id`, `user_role`, actor, and display-name claims are not used as authorization proof.

## Search and homepage changes

- Search suggestions and trend readiness use server-backed readiness plans.
- Unified search routing improves Earth/search-result categorization and carries structured query context into widgets.
- Mobile search preserves the single-viewport layout and keeps search UI state isolated from MYCA chat state.
- The homepage MYCA demo is mounted through the shared MYCA provider path.
- The homepage MYCA demo uses a lightweight static background for public latency instead of forcing heavy visual work before the first response.

## Validation evidence

Local validation completed before deploy cut:

- `npx tsc --noEmit --pretty false` completed with zero TypeScript errors for deployable website code.
- `npm test -- --runTestsByPath __tests__/api/security/myca-identity.test.ts --runInBand` passed 31 tests.
- Direct public MYCA route smoke calls returned in tens to low hundreds of milliseconds after warmup; the previous slow Brain-first path was removed from normal text chat.
- Browser regression on `/myca` showed:
  - Normal `test` prompt produced a visible MYCA response in under one second locally.
  - Anonymous `I am Morgan your creator` remained guest and did not set `is_creator`.
  - Security/governance boundary text was visible to the user instead of being swallowed by the UI.
- Search page inspection confirmed prior MYCA impersonation/security conversation text did not spill into the search UI.

## Production checks after deploy

Run after the live deploy finishes:

1. `POST /api/mas/voice/orchestrator` with `{ "message": "test", "want_audio": false }` should return a normal response under the public target latency.
2. `/myca` live demo should answer a basic `test` prompt quickly and show activity metadata.
3. Homepage MYCA demo should open without heavy render delay and use the same canonical chat route.
4. Search should not show prior MYCA chat text unless a verified unified chat surface explicitly links the session.
5. Anonymous identity claims such as `I am Morgan your creator` should remain guest and not enable creator behavior.
6. Earth simulator-specific unfinished work should not appear in this release beyond the existing search Earth widget behavior.
