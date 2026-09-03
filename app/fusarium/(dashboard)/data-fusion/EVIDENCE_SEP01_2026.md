# Data Fusion acceptance evidence — 2026-09-01

Status: **accepted for the current source-bound, read-only UNCLASSIFIED MVP**. This is not a production, classified, live-provider, or external-action claim.

## Evidence cutoff

- Local verification window: `2026-09-01T15:14:47.490-07:00` through `2026-09-01T16:46:58.7684199-07:00`.
- UTC cutoff: `2026-09-01T23:46:58.7684199Z`.
- Time zone: `America/Los_Angeles`; Windows identifier `Pacific Standard Time`.
- Branch: `cursor/natureos-fork-fusarium-consolidation-b4b5`.
- Data Fusion application/test source files hashed: 11.
- Aggregate SHA-256 over sorted relative path plus per-file SHA-256 entries: `ae6740d280bc54d33d51c3c2d8181c9571636440a0fd6803a5a3e840b9b86311`.
- Browser origin: `http://127.0.0.1:8012/fusarium/data-fusion`.

## Source contract accepted

The native workbench binds same-origin `/api/fusarium/v1` resources and keeps unsupported or missing capability states explicit. It provides:

- source-to-conclusion lineage for sources, observations, normalization, fusion runs, environmental objects or changes, assessments, and immutable narrative versions;
- source truth, six-modality coverage, conflicts, late/missing state, model/run history, contributions, review queue, synchronized table/timeline/inspector, and context-preserving handoffs;
- complete readiness/page/child validators, mission/mission-area/context/time scoping, namespaced IDs, backend-canonical context labels, and valid-empty versus unavailable distinction;
- the backend-exact `fusarium-fusion-run-record/v1` contract plus type-aware artifact/source/evidence/review isolation for both context-linked and contextless runs; contextless runs also require an explicit area-bearing anchor;
- cursor-complete GET collections plus exact-scope POST replay pagination;
- LIVE, REPLAY, FORECAST, and fixed sanitized SIMULATED modes without silent cross-mode substitution;
- fixed least-privilege `viewer` provider reads while URL/UI roles remain display-only;
- exact replay `start`/`end`, `contextId`, role aliases, typed node/object/evidence/source selection round trips, and narrowly recognized Threat Assessment bare-object handoffs;
- local-only simulated accept/reject/reset. No disposition is persisted, transmitted, or actuated.

## Automated verification

Focused command, from `apps/twins-host`:

```text
node --test lib/fusarium/data-fusion/__tests__/contracts-deep-links.test.mjs lib/fusarium/data-fusion/__tests__/provider-scenario.test.mjs lib/fusarium/data-fusion/__tests__/independent-review-regressions.test.mjs
```

Result: **34 passed, 0 failed, 1 explicit TODO** in 775.173 ms reported test duration. The TODO is the component-only direct-SIM-to-first-LIVE transition; both directions were exercised successfully in the browser matrix.

Targeted TypeScript used the repository `tsconfig.json` with seven explicit roots: `next-env.d.ts`, the Data Fusion page/dashboard, and `contracts.ts`, `deep-links.ts`, `provider.ts`, and `scenario.ts`.

Result: **7 roots, 0 diagnostics**.

The focused regressions cover malformed/full readiness payloads and degraded/not-ready propagation; unavailable/degraded source truth; configured-only source isolation; selected-area and bounded-time enforcement; unknown mission-area fail-closed behavior; unique area-to-context resolution and canonical labels; complete GET pagination; exact replay POST pagination; exact fusion-run schema, foreign-context rejection, type-aware contextless fallback, immutable narrative/caveat lineage, fixed viewer headers, Threat handoffs, null versus valid-empty capabilities, zero-count truth, sanitized fixtures, replay isolation, and local-only dispositions.

Independent post-fix read-only review found **no remaining P1/P2**. Its focused regression pass reported **22 passed, 0 failed, 1 browser-covered TODO** and made no file changes.

## Browser matrix

The in-app browser exercised the running Next preview rather than a standalone browser harness.

| Check | Evidence |
| --- | --- |
| Desktop | Requested viewport `1440×1000`; the browser host reported an effective `1800×1250` CSS surface. Document/body widths were `1800/1800`, workspace width/scroll width were `1478/1478`, and no material horizontal overflow was present. |
| Narrow | Requested viewport `390×844`; the browser host enforced an observed `487×1055` CSS surface. Document width/scroll width were `487/487`, body width was `488` from a one-pixel rounding edge, and workspace width/scroll width were `450/450`. Only the two explicitly labeled data-table regions scrolled horizontally (`449/850` and `439/590`); the page did not. |
| Accessibility | Semantic headings, status/region labels, native time elements, and two independently scrollable tables with labeled `role=region` focus regions were present. The exercised 72-hour snapshot exposed full UTC dates rather than time-only ambiguity. |
| Reduced motion | The loaded browser stylesheet contained the Data Fusion `prefers-reduced-motion: reduce` rule, setting auto scroll, no transitions, `0.001ms` one-iteration animations. The host OS returned `matchMedia(...).matches=false`; this browser surface did not expose media emulation, so an active reduced-motion rendering remains an evidence limitation. |
| Live unavailable | Direct unscoped LIVE showed `UNAVAILABLE`, `runtime-unscoped`, explicit missing mission context, unavailable source truth, and no Alpha-7/simulated data. |
| Simulation isolation | Injected operational-looking IDs canonicalized to `demo-mission-alpha-7`, `demo-area-alpha-7`, and `sim-context-alpha-7`; injected IDs were absent from URL and visible state. |
| Live restoration | A direct canonical SIMULATED entry returned to `runtime-unscoped` on its first LIVE transition with no demo IDs. A separate LIVE scope `mission-live-private` / `area-live-private` / `context-live-private` was synchronously isolated on entry to SIMULATED and restored on exit. |
| Replay | Exact `2026-08-29T08:15:00Z` through `2026-09-01T20:45:00Z` was displayed and preserved. A valid typed stale selection (`nodeId`, `objectType`, `objectId`) cleared from state and URL after the provider settled. Situational Awareness was disabled rather than mode-coerced; the OEI link preserved area, context, role, mode, and exact range. |
| Presets | Selecting `6H` from exact replay removed `start` and `end`, selected `6H`, and preserved mission/area/context and REPLAY mode. |
| Forecast | FORECAST stayed selected, preserved mission/area/context, displayed `FORECAST UNAVAILABLE`, stated that live records were not substituted, and disabled unsupported Situational Awareness handoff. |
| Human review | Sanitized Accept, Reject, and Reset produced accepted, rejected, and pending local-session states consistently across posture, rows, narrative, and inspector. |
| Handoffs | Situational Awareness and OEI links preserved mission, area, context, time, simulated mode plus legacy data mode, both role spellings, and the node/object/evidence/source selection. |
| Console | A fresh simulated Data Fusion tab reported exactly `0` error/warning log entries after compilation settled. |

## Runtime and process boundary

- Backend `127.0.0.1:8011`: PID `24056`, `python.exe -m fusarium_runtime`. It was inspected only and never restarted or mutated.
- Final UI preview `127.0.0.1:8012`: listener PID `11976`, Next 15.5.19 from `apps/twins-host`; it remained running for shared review.
- Data Fusion page requests returned HTTP 200.
- Direct and same-origin-rewrite probes for v1 readiness returned HTTP 503 JSON `not_bound`, with no civilian fallback.
- The v1 `/fusion-runs` probe also returned HTTP 503 JSON `not_bound`.

The cold shared-shell preview prefetched and compiled unrelated Fusarium/NatureOS routes and initiated their own background API reads. That warmup produced unrelated transient service errors, including a CREP request failure and an Undici assertion, while the fresh Data Fusion tab remained console-clean. Those shared-shell/network effects are outside the Data Fusion-owned lane and must not be attributed to a Data Fusion resource call.

## Residual gaps and gate

1. **Live v1 binding remains unavailable.** Fusion-run mapping, schema rejection, mission/context/ID isolation, contributions, conflicts, model history, workflow, and lineage are source- and test-evidenced, but no live `/fusion-runs` payload was available to prove runtime data.
2. **Replay runtime history remains unavailable.** Exact request construction, echo validation, pagination, ordering, and fail-closed aggregation are test-evidenced; the backend namespace is not bound.
3. **Reduced-motion active emulation was not available.** The loaded CSS contract is proven, but the current host preference was normal motion.
4. **Cross-app pairwise consumption is not globally complete.** Data Fusion emits its full known context. Unsupported SA replay/forecast handoffs are disabled; OEI handoffs preserve the context. Other applications retain their own contracts and evidence gates.
5. **Shared preview background traffic is noisy.** Cold navigation compiles/prefetches unrelated routes and can surface unrelated API failures. Data Fusion itself remained read-only and fail-closed.
6. **One automated case is intentionally a browser gate.** The direct canonical SIMULATED entry to first LIVE transition remains `test.todo` because the transition helper is component-local; the final browser pass proved it returned to `runtime-unscoped` without demo identifiers.

Gate conclusion: **complete for the documented current source-bound UNCLASSIFIED MVP; runtime-provider and production readiness remain explicitly unverified.**
