# Fluid Search — Full AI Interface (Milestone 1 Complete) Apr 17, 2026

**Status:** Complete (milestone 1). **Related:** Fluid Search MYCA gaps plan (milestone 2 voice deferred).

## Scope delivered

1. **Single context contract** — `FluidSearchContext` / `FluidSearchRouteSnapshot` in `lib/search/fluid-search-context.ts`; `buildFluidContextForMas()` maps route + threading into MAS `search_context` (`fluid_route`, `conversation_id`, `recent_queries`, `search_ai_history`, optional `focused_widget`).
2. **Unified route** — `GET` accepts optional header `x-fluid-search-context` (base64 JSON). **POST** JSON (`q`, `types`, `limit`, `ai`, `lat`, `lng`, `fluidContext`) forwards to the same handler with synthesized query string + header.
3. **Single narrative policy** — `resolveUnifiedAiNarrative()` in `lib/search/unified-narrative.ts`: substantive MAS `focus` wins; otherwise one `POST /api/search/ai` with `integrated: true` and shared `sessionId`, `userId`, `conversationId`, `history` — no duplicate parallel LLM vs legacy path in unified route.
4. **Intention merge** — `mergeSearchRouteWithMasSuggestions()` unions MAS `suggested_widgets` tokens with `classifyAndRoute`; `effectiveSearchRoute` drives auto-expand behavior.
5. **Conversation threading** — Fluid Search builds `fluidSearchContext` from MYCA session/conversation IDs and last 24 user/assistant messages so unified search + `/api/search/ai` share grounding.

## Key files

| Area | Path |
|------|------|
| Contract | `lib/search/fluid-search-context.ts` |
| Intention merge | `lib/search/merge-intention-route.ts` |
| Narrative | `lib/search/unified-narrative.ts` |
| MAS proxy | `lib/search/mas-search-proxy.ts` (policy comment) |
| SDK | `lib/search/unified-search-sdk.ts` (POST when `fluidContext` set) |
| API | `app/api/search/unified/route.ts` |
| UI | `components/search/fluid/FluidSearchCanvas.tsx` |
| Tests | `lib/search/__tests__/fluid-search-contract.test.ts` |

## Verification

- `npx jest lib/search/__tests__/fluid-search-contract.test.ts`
- Manual: Fluid Search query ≥2 chars; confirm network POST `/api/search/unified` when context present; MAS receives `search_context` via proxy.

## Milestone 2 (deferred)

Voice: single mic pipeline, PersonaPlex vs orchestrator audit, barge-in — out of scope for this doc.
