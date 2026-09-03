# Fusarium Situational Awareness

This directory owns the normalized contracts, runtime adapter, deep-link context, sanitized scenario, browser-local mission-area catalog, Form Space/NLM source catalog, MYCA context/proposal validator, and supporting-panel layout for `/fusarium/situational-awareness`. The route UI is owned by `components/fusarium/situational-awareness`. Shared Fusarium shell, navigation, authentication middleware, durable backend persistence, Earth Simulator implementation/data plane, GCS, and cloned NatureOS surfaces are outside this lane; SA only lazy-mounts the existing Earth renderer after explicit selection.

## Runtime truth model

System mode currently binds only the legacy compatibility responses at `/api/Devices` and `/api/fusarium/operator/state`. Mission area and 6h/24h/72h are preserved as operator context and handoff context, but are explicitly labelled context-only because these two feeds do not apply mission or time filters.

The UI keeps these assertions separate:

| Assertion | Evidence shown |
| --- | --- |
| Transport reachability | HTTP response presence/status |
| Authentication | `IDENTITY NOT ASSERTED · ROLE NOT REPORTED`; legacy response metadata is not treated as authentication |
| Shape compatibility | Minimal top-level adapter validation |
| Display classification | UNCLASSIFIED envelope/leaf validation before normalization |
| Data-bearing exchange | Accepted record count, `NO RECORDS`, or `UNAVAILABLE` |
| Freshness | Source observation time, response receipt time, and an explicit stale-window basis |
| Environmental coverage | Per-domain observed/gap state; a gap is never a measured zero |
| Provenance | Source, observed/received times, reference, classification, lineage, and evidence association |

Only explicitly UNCLASSIFIED records render. Missing markings and CUI, SECRET, TS-SCI, TS/SCI, or IL4 markings are withheld and counted as gaps. Blank numeric strings remain unavailable; only an actual numeric `0` is rendered as zero. Relationships without usable evidence references are withheld. Higher classification capabilities belong to the shared shell and may be visible only as disabled future capabilities; this route never unlocks or asserts them.

A deterministic sanitized scenario is opt-in. Every scenario source, object, evidence record, relationship, watch area, and comparison is marked synthetic/SIMULATED and creates no backend state, message, task, or external send.

## Form Space and MYCA boundary

`form-space.ts` describes the architecture package without claiming deployment. Every model, topology edge, binding, proposed MINDEX table, and proposed API is labelled as `source_present`, `document_proposed`, `context_only`, `not_probed`, or `unbound`. Environmental objects remain observations; the Current Form State stays unbound until an evidence-bearing inference contract supplies the required chart/open-set status, typed coordinates, target/attractor estimates, dynamics, reachability, uncertainty, evidence, model version, provenance, and AVANI status.

The owner-gated `/api/fusarium/situational-awareness/form-space` route returns this no-store static catalog only. It performs no network or database read. The existing fixed NLM status route is called only after an explicit operator click and is not evidence that Form Space inference exists.

`myca-context.ts` defines a fixed UNCLASSIFIED read envelope and a proposal-only response seam. MYCA may propose allowlisted view/object/evidence/model selections or bounded same-origin analysis handoffs. Device command, mission release, external send, classification change, arbitrary URL, browser script, and self-approval fields fail closed. An accepted proposal remains `accepted_for_human_review`, with `executionPerformed: false` and `persistence: none`. The API returns a response digest, not a durable audit log, and calls no MYCA model/service.

## Interaction and layout

- Map, Earth, list, and timeline form a `tablist`/`tab`/`tabpanel` relationship. Arrow keys, Home, and End move selection and focus. Earth dynamically imports the canonical renderer only after selection and receives a selected-object focus only when explicit finite latitude/longitude exists; schematic x/y never becomes geography.
- Object, evidence, source, view, selected model, Form Space presentation, time, mission context, data mode, and UNCLASSIFIED policy survive self-links and contextual handoffs.
- Operators may add up to 20 sanitized mission labels with `local:` IDs. They persist only in versioned browser localStorage and never claim a backend mission record.
- Supporting widgets use a versioned browser-local layout with explicit edit mode, keyboard ordering, snapped sizes, reset, and forced single-column narrow behavior. Layout editing is disabled at 760 CSS pixels and below.
- When an accepted live snapshot contains no objects, the primary workspace collapses the redundant queue and inspector empty cards into one full-width environmental picture. Source, domain, evidence, watch, and contract gaps remain available below.

## Verification record — 2026-09-02

Focused tests:

```text
node --no-warnings --test lib/fusarium/situational-awareness/__tests__/*.test.mjs
21 passed, 0 failed
```

The focused suite covers condition derivation, fail-closed classification (including missing/CUI/SECRET/TS-SCI/TS/SCI/IL4), blank numbers versus real zero, transport/schema/policy distinction, nested-device provenance, scenario marking, deep links, layout persistence/reordering/sizing, Form Space evidence-state separation, browser-local missions, and the MYCA allow/deny contract.

A strict TypeScript check of `contracts.ts`, `deep-links.ts`, `form-space.ts`, `mission-areas.ts`, and `myca-context.ts` exits 0. The current whole-app compiler emits 848 diagnostic lines in existing unrelated/generated/shared code; a filter for the SA/Form Space paths returns none. No clean whole-app TypeScript claim is made.

September 2 isolated browser evidence:

- unauthenticated Form Space catalog returned 401;
- owner-session desktop 1600×1000 and narrow 390×844 passed 2/2;
- 11 selectable models and 11 compare cards;
- topology, binding ledger, and all five existing operational widgets present;
- browser-local mission creation and URL persistence;
- owner-gated typed MYCA context GET preserved all bounded selection fields with no execution authority;
- safe MYCA proposal accepted only for human review with digest;
- prohibited device-command proposal rejected;
- no horizontal overflow, page error, console error, framework overlay, automatic NLM request, Earth/OEI API request, or external request;
- Earth tab visible but deliberately not selected, so interactive renderer behavior is not claimed by this run.

Evidence is recorded under `docs/codex-handoffs/evidence/situational-awareness-form-space-sep02-2026/`.

## Earlier verification record — 2026-09-01

Browser evidence from the live 8012 route:

- Desktop and 700×900 layouts had no document overflow; 700px forced the supporting layout to one column and disabled layout editing.
- A 320-CSS-pixel reflow check (the 1280px/400%-zoom equivalent) reported document `clientWidth=310`, `scrollWidth=310`, main `scrollWidth=294`; no horizontal overflow.
- Representative dark-theme contrast ratios against the effective composited background were: heading 13.27:1, context note 5.84:1, condition message 5.84:1, metric label 5.84:1, and unselected tab 5.50:1.
- Keyboard ArrowRight moved focus and selection from Map to List, updated the URL, and left one tab at `tabIndex=0`. The focused tab had a 2px solid outline with 2px offset.
- The loaded `prefers-reduced-motion: reduce` rule disables the SA spinner animation and widget/map-marker transitions.
- Every unavailable layer was `disabled=true` and `checked=false`.
- Shared classification controls were verified as U active, with CUI, SECRET, and TS/SCI disabled and inactive. SA adds no classification selector.
- Scenario selection, provenance drill-down, map/list/timeline synchronization, query persistence/reload, contextual handoffs, layout persistence/reset, and keyboard widget reorder were exercised.
- No SA-owned console error was observed. The remaining console error is the shared Next `OuterLayoutRouter` missing-key warning.

Endpoint snapshot:

| Endpoint | Status | Meaning |
| --- | ---: | --- |
| `/fusarium/situational-awareness` | 200 | Route rendered |
| `/api/Devices` | 200 | Accepted empty array |
| `/api/fusarium/operator/state` | 200 | Accepted empty compatibility state |
| `/api/fusarium/v1` | 503 | Running 8011 process does not yet expose the authoritative v1 router |
| 8012 `/health` | 200 | Host healthy |
| 8011 `/health` | 200 | Runtime process healthy, but stale relative to current v1 source |

## Residual platform gaps

- Form Space, proposed MINDEX tables/APIs, DIRTNet/Mycorrhizae, MAS, AVANI, and NLM modality/fusion serving remain unbound architecture declarations; the catalog does not contact them.
- The Earth renderer is source-wired behind explicit selection but was not activated in the isolated September 2 browser pass; each Earth layer retains separate truth evidence.
- Added mission areas and MYCA proposal decisions are browser/response-local, not durable mission or audit records.
- No live MYCA service is called. The typed seam validates and previews proposals only.
- Authoritative source contains durable SQLite/WAL-backed `/api/fusarium/v1` mission, watch, evidence, handoff, layout, and activity-replay contracts, but the running 8011 process must restart before its public v1 root can be accepted.
- Protected v1 reads then require real `X-Operator-Id`/role plumbing. This frontend intentionally sends no invented identity headers.
- The persisted v1 operational tables were empty at verification time. The legacy compatibility responses were also empty, which is reported as no records—not an environmental all-clear.
- Activity replay is audit/activity history, not reconstructed environmental history. No forecast endpoint exists.
- Mission/time filtering, durable watch state, and durable handoffs must remain context-only/unavailable until the protected v1 bind is live and authenticated.
- The shared `OuterLayoutRouter` key warning remains outside the SA-owned lane.
