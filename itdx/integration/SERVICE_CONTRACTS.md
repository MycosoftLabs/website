# Service contracts and integration design

This is a proposed implementation contract, accompanied by dated source findings. It is not a generated description of a deployed ITDX API. Reconcile it with the actual current OpenAPI, authentication and database conventions before implementation. Record deviations and compatibility mappings.

## Existing source findings, inspected 2026-09-08

| Component | Source finding | Consequence |
|---|---|---|
| Local v1.2 profiles | NLM `:8000/api/nlm/health` and `/api/nlm/embeddings/nature`; MINDEX `:8003/health` and `/unified-search/earth`; MYCA `:8001/voice/brain/status`; Earth `:3000/api/health` and UI link | These are local profile defaults, not a verified combined deployment |
| MINDEX `mindex_api/config.py` | Default API prefix `/api/mindex`; internal `/api/mindex/internal`; worldview `/api/worldview/v1` | The usual Earth search path is `/api/mindex/unified-search/earth`, not the unprefixed v1.2 default |
| MINDEX unified-search router | GET `/earth`, `q` at least 2 characters, types/limit and optional location filters | Test an authenticated real query; page through results rather than assuming a single response is complete |
| MINDEX `main.py` | Root `/health` is a static healthy response; a health router is mounted under the API prefix | Process health alone cannot prove database, data or query readiness |
| MINDEX Earth SQL helpers | Some query failures are represented as empty lists/zero counts | Integration must distinguish `UNAVAILABLE` from a successful empty result; inspect response diagnostics or improve service errors |
| MINDEX compose | Default published API port is 8000; PostgreSQL/PostGIS and Redis dependencies | Do not assume local profile port 8003 is correct; explicitly map a unique host port if needed |
| MAS `brain_api.py` | `/voice/brain/status`, `/health`, POST `/chat`, POST `/stream` (SSE) | Status is not a reasoning workflow; chat/stream require the current request schema and provider dependencies |
| MAS `nlm_api.py` | `/api/nlm` health/model metadata, `/embeddings/nature` with `{packet: ...}` and other model routes | Confirm the running app mounts the router and model is loaded; do not load/unload production models as a readiness probe |
| NLM routing | `NLM_API_URL` may route to a dedicated backend, commonly configured as localhost:8200 in source defaults | Verify the actual backend and mounted path; do not infer deployment from a default |
| Website `package.json` | `dev` / `dev:next-only` use port 3010; `start` uses 3000 | Local Earth link usually needs 3010 during development |
| Website `lib/mindex-base-url.ts` / `lib/mas-server-url.ts` | Server loopback may be rewritten to a LAN fallback unless `ALLOW_LOOPBACK_MINDEX=1` / `ALLOW_LOOPBACK_MAS=1` | Configure host-local development explicitly; container loopback has different meaning |
| Website Earth embed | `components/natureos/tools/earth-simulator-embed.tsx` uses the CREP dashboard loader | Reuse the existing dashboard/provider and select ITDX layers by persisted run |

Primary source entry points: [website at inspected commit](https://github.com/MycosoftLabs/website/tree/7d8501118a1d10c129952269ed04999da4bfff97), [MINDEX config](https://github.com/MycosoftLabs/mindex/blob/main/mindex_api/config.py), [MINDEX main](https://github.com/MycosoftLabs/mindex/blob/main/mindex_api/main.py), [MAS NLM router](https://github.com/MycosoftLabs/mycosoft-mas/blob/main/mycosoft_mas/core/routers/nlm_api.py), [MAS brain router](https://github.com/MycosoftLabs/mycosoft-mas/blob/main/mycosoft_mas/core/routers/brain_api.py). Links to main can change; record the checked-out commit in the receiving inventory. Vendored source identities are pinned separately in `../local/source_reference/UPSTREAM_MANIFEST.json`.

## Boundary and trust model

The browser calls authenticated, same-origin website routes. Website routes validate the user/case access and send a scoped request to MINDEX/MAS with server-side credentials. The coordinator invokes actual model and review services, persists their receipts, and exposes progress. CREP reads the same authorized run/layer identifiers. Browsers receive neither private service credentials nor unrestricted access to LAN APIs.

Reuse the website's session/auth implementation and established CSRF/mutation protection. Preserve local v1.2 Host/Origin/token checks. Do not solve connectivity by disabling origin checks, creating an arbitrary URL proxy, exposing the Python server on all interfaces, or adding secrets to `NEXT_PUBLIC_*`. Enforce case access for original-file downloads, exports and event streams as well as JSON endpoints.

## Shared object envelope — proposed v2

Every persisted analytical object should carry:

| Field | Requirement |
|---|---|
| `schema_id`, `schema_version` | Explicit immutable contract; reject unsupported major versions |
| `id`, `case_id`, `revision` | Stable identifiers; immutable revisions and authorized case scope |
| `created_at`, `created_by`, `supersedes_id` | UTC offset timestamp, authenticated actor/service, amendment lineage |
| `data_origin` | Controlled values such as `SYNTHETIC_TEST`, `IMPORTED_UNVERIFIED`, `ACCEPTED_RECORDING`, `LIVE_SENSOR`; never inferred from endpoint URL |
| `execution_mode` | `local_reference`, `recorded_replay`, `live_services`; per-task backend may be mixed but must be explicit |
| `source_refs`, `input_refs` | Resolvable immutable objects with hashes, type and revision |
| `content_sha256`, `canonicalization_id` | Defined byte representation; do not hash a changing display string |
| `quality_state`, `missing_reasons` | Distinguish present/partial/unknown/invalid/unavailable; no sentinel zero for unknown |
| `trace_id`, `service_receipt_refs` | Distributed execution identity and the corresponding persisted request/response records |

Retain original source schemas alongside normalized representations. Validate limits before decompression/parsing; protect file imports against path traversal, archive bombs and cross-case references. Unit-bearing values must reject nonfinite numbers. Document text is untrusted input data, not instructions to the coordinator.

## Proposed website API

Names may change to match existing conventions. Define request/response schemas, auth, rate limits, error behavior and pagination in actual OpenAPI or shared typed schemas; this table is a work specification.

| Method/path | Input | Result / invariant |
|---|---|---|
| GET `/api/itdx/readiness` | User/case context | Service health, auth, data and model qualifications separately, checked-at and expiry; no credentials |
| GET `/api/itdx/tasks` | Authorized user/case context | All 16 objective IDs/titles, task contract versions, implementation/qualification/test states and specific blockers |
| POST `/api/itdx/cases` | Title, scenario/rubric refs, origin | Case ID and immutable initial revision |
| GET `/api/itdx/cases/:id` | Authorized ID | Case metadata, revisions, paginated collections and data coverage |
| POST `/api/itdx/cases/:id/imports` | Typed metadata plus bounded file/object upload | Import job ID; parsing/review status; original hash; no fabricated sensor data |
| POST `/api/itdx/runs` | Case and input snapshot refs, task list, backend selection, scenario overlay, constraints, model/chart refs, idempotency key | HTTP 202, run ID, initial state and progress URL; same key/body returns same run; changed body conflicts |
| GET `/api/itdx/runs/:id` | Authorized ID | State, task states, immutable input snapshot, products, metrics and backend receipts |
| GET `/api/itdx/runs/:id/events` | Authorized ID, event cursor | Bounded SSE/progress stream, reconnection cursor and terminal state |
| POST `/api/itdx/runs/:id/cancel` | Expected revision / reason | Cancellation requested or already terminal; cannot mark executing work cancelled before acknowledgment |
| GET `/api/itdx/runs/:id/frames/:frameId` | Run/frame ID | Frame dictionary, evidence/object refs, chart metadata and proof material |
| GET `/api/itdx/runs/:id/layers` | Time/bbox/filter and pagination | GeoJSON/layer manifest with shared run/frame IDs, CRS, freshness and uncertainty |
| POST `/api/itdx/cases/:id/reports` | Existing report schema plus immutable revision/auth metadata | Validated report revision; source discipline is a label, not authentication |
| GET `/api/itdx/cases/:id/matrix` | Snapshot revision | All 36 cells, selected report refs, unknowns, disputes and unmapped reports |
| POST `/api/itdx/comparisons` | Fixed candidate output refs, scale/rubric version and ballots | Stored inputs, deterministic Borda result, traces and method/version hashes |
| POST `/api/itdx/runs/:id/assessments` | Rubric version, criterion, rating or abstention, reviewer note | Authenticated immutable assessment revision, separate from algorithm results |
| POST `/api/itdx/runs/:id/exports` | Format and explicit included snapshot refs | Export job ID, manifest preview, then a scoped expiring download reference |
| GET `/api/itdx/exports/:id` | Authorized ID | Export state, bytes, manifest hash, signing status and verifier compatibility |

Use 400/422 for malformed data, 401/403 for access failures, 404 for unknown authorized objects as appropriate to current disclosure policy, 409 for revision/idempotency conflicts, 413 for limits, 429 for throttling and 503 for unavailable upstream dependencies. Include a stable machine error code, safe message, retryability and trace ID. Never turn an upstream auth/timeout error into an empty successful product.

## Durable run state and partial results

Run state: `QUEUED → VALIDATING → RUNNING → SUCCEEDED | PARTIAL | FAILED | CANCELLED`. Add `BLOCKED` for unresolved prerequisites according to the current workflow model. Task states need `NOT_STARTED`, `RUNNING`, `SUCCEEDED`, `BLOCKED`, `FAILED`, `CANCELLED`, and `SKIPPED` with a reason. Define allowed transitions and concurrency control; store state transitions append-only.

Persist input snapshots before execution. Successful products are immutable even if another task fails. A partial run may export valid completed products, but the manifest must enumerate missing/failed tasks and downstream invalidations. Task 13/8 cannot pretend a failed Task 12 output exists; declare whether a separately selected observed-only path is supported. An automatic retry must not create duplicate objects or silently sample a different model without a new attempt identity.

Each service attempt records start/end, deadline, request hash, actual endpoint identity (sanitized), service build/model/chart IDs, response hash/object ref, status, error class and retry number. Wall-clock timing includes queue/network/model/storage phases separately. Do not log raw credentials or protected report content into broad service logs.

## MINDEX persistence proposal

Adapt to existing entities where semantics match; the names below are conceptual and are not executable SQL.

| Entity | Important relationships and indexes |
|---|---|
| `cases`, `case_revisions` | Owner/access scope; scenario/rubric refs; version; indexed scope/update time |
| `source_objects`, `source_revisions` | Raw object hash, media type, source/time/handling/license metadata; immutable original bytes; scoped content deduplication |
| `imports` | Parser version, original ref, normalized refs, errors, approval status and idempotency key |
| `runs`, `task_executions`, `run_events` | Snapshot refs, state/revision, task/backend, parent/retry; indexes on case+created time, run+task, event cursor |
| `observations`, `frames`, `form_states` | Time/source/model/chart references; geometry where valid; provenance; spatial/time indexes |
| `graph_edges`, `map_layer_manifests` | Typed endpoints, evidence refs, observed/inferred/contradicted, validity interval and product hash |
| `source_reports`, `report_revisions` | Discipline, statement type, human review, known common-source group, conflicts and tags |
| `rubrics`, `assessments`, `comparisons`, `ballot_revisions` | Immutable scale definitions, authenticated reviewer, fixed candidate set and algorithm version |
| `service_receipts`, `model_snapshots`, `chart_snapshots` | Service/build/checkpoint identity, canonical response objects and qualification |
| `exports`, `export_members`, `signatures` | Exact manifest membership, bytes/hash, compatible verifier and key ID/fingerprint |

Large raw recordings should use the existing object-store facility with checksummed refs, not enormous database rows or Git commits. Source independence, access rights and authenticity are distinct metadata, not consequences of different IDs. Retention, redaction and immutable audit requirements must fit existing policies. In particular, a privacy/access revocation cannot leave an unprotected original in a public export.

## Export v2 contents and proof semantics

The complete export needs a versioned manifest listing every file path, media type, size and SHA-256; source references and origin states; frozen inputs/truth/config/scenario overlay; model/chart/backend receipts; task outputs/metrics; graph/map; Form States/frames; report/matrix snapshot; rubric/ballot/assessment snapshot; software versions; proof material; signatures; and a machine-readable list of missing artifacts and nonreproducible components.

Define whether originals are embedded or referenced, and expose that choice before download. Bind a comparison to exact candidate output hashes. Bind assessments to rubric version and product revision. A source report added after a run must not appear as if it supported the earlier run; attaching a later review creates a new export revision with explicit timing.

Keep v1 verification compatible. New canonicalization or receipt formats need new schema identifiers and golden vectors. Verify signature trust against an independently pinned key, not merely the public key included in the same ZIP. Label unsigned exports explicitly. Record retained remote responses separately from recomputed deterministic products; export verification is not an authenticity judgment on the physical source.
