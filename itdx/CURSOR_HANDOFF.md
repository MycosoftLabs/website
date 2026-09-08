# Cursor implementation handoff: ITDX live integration

Prepared 2026-09-08. Receiving repository: `MycosoftLabs/website`. Website base inspected: `7d8501118a1d10c129952269ed04999da4bfff97`. Recheck current repository and deployment state before implementing; upstream main branches and network configuration can change.

## 1. Work order and outcome

The owner wants to run the supplied v1.2 application locally now, then use Cursor on the home computer to build a fully integrated next version on `mycosoft.com`, using the real MINDEX, MYCA/MAS, NLM, CREP, Earth Simulator, and mathematical Form Space implementations. The delivered experience must walk an evaluator through input provenance, algorithms, task outputs, challenges, measured results, reviewer assessments, and independently inspectable exports.

Implement an authenticated NatureOS ITDX workspace. Suggested route: `/natureos/itdx`; suggested same-origin API namespace: `/api/itdx`. **These are proposed routes, not claims that this handoff has created them.** Inventory existing routes first and reuse compatible implementations. The owner authorized integration work and wants eventual production operation. Follow actual repository/deployment requirements; this handoff itself changes no live service or production routing.

Successful integration means that one persisted run identity connects source data, the NLM frame, model execution, Form States, graph links, MYCA review, AVANI dispositions, map features, evaluator ballots, and export manifests. A screen with five green health badges is insufficient. A live result must name the actual backend and preserve a verifiable relationship to its inputs and service response.

**Scope update from the organizer presentation:** the owner supplied all 16 objectives after the initial handoff was drafted. Read `integration/ITDX_16_OBJECTIVES.md` and `integration/TASK_OBJECTIVES.csv` before implementation. The workspace must track all 16 with honest task-specific readiness. Current coverage is four local prototypes, partial support for Task 10, and 11 unimplemented workflows. The milestones below first integrate the available baseline and shared infrastructure; they do not by themselves implement the missing task-specific algorithms. Add a separate scoped backlog and acceptance evidence for each objective, using actual supplied product definitions and data.

Keep advisory demonstration outputs bounded to the existing environmental/civil-support workflow. HUMINT/SIGINT/etc. are source-attribution categories for supplied reports. This work package does not specify interception, identifying people as hostile actors, targeting, or autonomous military action. Handle missing official exercise injects and definitions as explicit blockers, rather than inventing them.

## 2. Read in this order

1. Repository instructions applicable to each receiving checkout. Do not assume this document overrides security, production, or data-access controls.
2. `itdx/README.md`, `local/README.md`, `local/VALIDATION.md`, and `local/source_reference/UPSTREAM_MANIFEST.json`.
3. `integration/LOCAL_SETUP.md` and `integration/SERVICE_CONTRACTS.md` for actual source findings and proposed contracts.
4. `integration/NLM_FRAME_SPEC.md` for the mathematical state and transmission requirements.
5. `integration/ITDX_16_OBJECTIVES.md`, `integration/TASK_OBJECTIVES.csv`, `integration/ACCEPTANCE.md`, `integration/SCENARIO_REGISTER.csv`, and `integration/INTERNAL_REQUIREMENTS.json` (the latter two preserve the older four-task internal baseline).
6. `DOCUMENT_INDEX.md`, then the supplied task sheets, Evaluation Harness, Metrics, Known Limitations, FormSpace Plan, NLM change history, Mathematical Demonstration Plan, and DIRTNet addendum. The bundled index contains searchable extracts and DOCX tables; original documents remain authoritative for what their authors wrote.

Planning statements such as “500M model,” “relational GNN,” or “seven agents” describe intended architecture unless there is executable code, a loaded checkpoint, and measured evidence. Do not convert them into implemented-capability labels.

## 3. Inventory: what is here and what it does

| Local path, relative to `itdx/local/` | Existing responsibility | Integration treatment |
|---|---|---|
| `launch.py`, `run.py`, START_HERE launchers | Local Python HTTP server, lifecycle, request checks, jobs | Preserve v1.2. Do not expose this server as the production website backend |
| `itdx/runner.py` | Frozen model execution, four products, scenarios, timings | Reuse as an explicit baseline backend in a new service package; preserve source/version checks |
| `itdx/algorithms.py`, `vendor/mycosoft/embodiment_encoders.py` | Native 16D encoder; fitted 25-parameter temporal readout; typed graph and bounded options | Keep baseline labels; add separately qualified production adapters |
| `itdx/datasets.py` | Input validation, splits, controlled fixtures and injects | Preserve labels outside inference inputs and record every overlay |
| `itdx/store.py` | Local SQLite persistence | Write a versioned import path to MINDEX; do not treat the file as a shared production database |
| `itdx/integrations.py` | Private-network health/sample/search helpers | Reference only for endpoint intent; not a production transport layer |
| `itdx/evidence.py`, `verify_bundle.py`, `replay.py` | Canonical roots, membership proofs, signing, source-bound replay | Preserve v1 verifier; add a new versioned manifest for live receipts and workbench attachments |
| `itdx/network.py` | Deterministic software queue, HMAC, equivocation/version/time cases | Keep emulation label unless physical tests supply measured transport receipts |
| `itdx/documents.py`, `bundled_documents/` | Document import, original files, extraction and source search | Preserve raw bytes, page/table attribution, and document-versus-measurement distinction |
| `itdx/ranking.py`, `rank_compare.py` | Equal-weight Borda, ties, full abstention, replay | Port only with parity tests or call shared Python implementation |
| `itdx/civil_evidence.py`, `review_replay.py` | Typed source reports and 36 matrix cells | Preserve nulls, review/dispute status, declared source groups, and complete provenance |
| `web/` | Standalone browser walkthrough and workbench | Rebuild using the website's existing components and authentication |
| `source_reference/` | Upstream file identities and selected reference contracts | Read references; do not compile these archived TypeScript files into Next.js |

v1.2's `runner.py` records `backend=native_encoder_local_readout` and `external_services_used=false`. The service configuration panel does not replace this backend. A successful NLM sample inference is displayed separately. MYCA status does not execute a seven-role workflow. Earth opens a separate UI. This is the principal gap the next release must close.

## 4. Repository ownership and boundaries

| Repository | Expected ownership | First source locations to inspect |
|---|---|---|
| `MycosoftLabs/website` | NatureOS page, existing CREP integration, authenticated server routes, browser tests | `app/natureos`, `app/dashboard/crep`, `components/natureos/tools/earth-simulator-embed.tsx`, `lib/mindex-base-url.ts`, `lib/mas-server-url.ts` |
| `MycosoftLabs/mindex` | Durable case/run/evidence storage, geometry, search, provenance, export metadata | `mindex_api/config.py`, `mindex_api/main.py`, health/unified-search/earth routers, migrations and current access-control pattern |
| `MycosoftLabs/mycosoft-mas` | Durable task orchestration, NLM routing, structured MYCA review and service receipts | `mycosoft_mas/core/routers/nlm_api.py`, `brain_api.py`, actual mounted application, existing job/workflow facilities |
| `MycosoftLabs/NLM`, if accessible | Model/chart contracts, actual checkpoints, inference and provenance | Paths pinned in `UPSTREAM_MANIFEST.json`; current training/model registry and model service |
| Existing MycoBrain / DIRTNet / NatureOS projects, when needed | Authorized sensor acquisition and measured transport | Actual device ingestion and message schema implementations; do not invent a new device protocol from the software fixture |

Create linked, reviewable branches/PRs in the repositories that own the change. Do not paste the whole MAS or MINDEX repository into the website. A website proxy should call service APIs; it should not create a second, incompatible evidence database. Preserve vendored license and modification notices.

The receiving folder deliberately excludes archived source from root TypeScript compilation and the website Docker context. Implement production code under normal repository source paths or a deliberately added service package. Update build inclusions only when the new code is ready; do not import from `itdx/local/source_reference` into the live application.

## 5. First-session deliverables: inventory before integration

Create an implementation branch from this handoff branch, or from main after the handoff is merged. Inspect the current worktree before modifying it and preserve unrelated changes.

Produce `itdx/integration/DEPLOYMENT_INVENTORY.md` on that new branch with:

- Every repository URL, checked-out commit, dirty-worktree status, applicable instructions, and owning deployment.
- The actual process/container entrypoint, runtime version, bind address, mapped host port, network route, health and action endpoint for MINDEX, MAS, NLM and website. Record secret variable names only.
- Which routers are mounted in the running process, based on current OpenAPI or equivalent service metadata. An unmounted Python router is not an available endpoint.
- Authentication method, an authenticated read test, a denied unauthorized test, and a small valid action request with a persisted response identity. Never copy credentials into reports.
- Model identifier, checkpoint digest, chart/schema versions, precision/device and resource requirements. A nominal model name without weights is `UNQUALIFIED`.
- Dataset availability, source authorization, record counts, freshness, coordinate/time coverage and known outages. Empty responses must be distinguished from failed queries.
- The existing production deployment mechanism, staging location, feature-flag convention, data backup/rollback process, and smoke-test procedure.

Also create a gap register with columns `gap_id`, `owner_repository`, `evidence`, `implementation_or_external_input`, `blocking_milestone`, `status`. Close gaps with evidence links, not unchecked prose.

## 6. Implementation milestones, in dependency order

### M0 — establish the reproducible baseline

Run `python itdx/verify_handoff.py`. Copy `itdx/local` to a separate working location before running commands that regenerate `sample_results`. Start v1.2 on the home computer, record OS/Python/browser/hardware, and rehearse the actual UI. Preserve the existing dataset, source graph, Borda and matrix examples. Use the archived matching version for source-bound historical replay.

Deliver: baseline test report, local screenshot/browser evidence, and a record of any platform-specific failures. Do not repair a historical artifact in place; put fixes into a new versioned implementation.

### M1 — define shared contracts and migrate persistence

Implement the schemas in `SERVICE_CONTRACTS.md` and `NLM_FRAME_SPEC.md`, adapting names to compatible existing contracts. Maintain one canonical schema source and a compatibility policy. Validate inputs at the API boundary and before persistence. Carry null and missing-value reasons through the system.

Add versioned MINDEX migrations for cases, immutable source revisions, runs, task executions, frame/object references, model/chart snapshots, source reports, reviewer assessments, comparisons and export manifests. Reuse current storage and object-store facilities. Add foreign keys, case-scoped identifiers, idempotency and required indexes. Write a dry-run importer for local JSON/evaluation exports; preserve original hashes and distinguish imported history from newly computed results.

Deliver: migration up/rollback plan, schema tests, duplicate-import test, access isolation test, restart-persistence test, and a documented export/import round trip. Review the supplied `00XX`/`00XY` SQL as design input; do not execute it wholesale against production.

### M2 — implement a durable run coordinator and adapters

Use MAS's existing durable workflow/job facilities if suitable. Otherwise add a bounded coordinator with a persisted state machine, per-task deadlines, cancellation, progress, idempotency, retry rules and trace IDs. A Next.js request should enqueue/observe a run, not remain open while doing all computation.

Add explicit backends such as `local_reference`, `recorded_replay`, and `live_services`. Data origin is a separate field: synthetic inputs may be processed by a live service, and imported recordings may be processed locally. Record the actual backend per task. If the requested live backend is unavailable, mark that task blocked or failed. A separately chosen baseline run gets its own run identity; it must not silently replace a failed live run.

NLM adapter: submit valid measured packets using the actual deployed contract, capture returned model/chart/version metadata and service receipt, persist input/output hashes and timing. Verify the model response is used by Task 12 and its downstream products. A new remote call whose output is discarded is not integration.

MINDEX adapter: use authorized scoped reads/writes with pagination, stable cursor semantics and explicit completeness. Do not reuse the local helper's five-second/2-MB limits for arbitrary jobs and collections. Add bounded payload/object transfers and streaming where appropriate.

MYCA adapter: create a structured review workflow with typed outputs, immutable evidence references, per-role traces, bounded revisions and actual AVANI/constraint dispositions. A text answer from `/voice/brain/chat` alone is not seven-agent completion. Report which components actually execute and which remain deterministic checks.

Deliver: live request-to-result integration tests plus timeout, cancellation, duplicate-submission, auth failure, partial response and restart recovery tests. Include service identity/version evidence in each result.

### M3 — mathematical Form Space and full NLM frame

Implement versioned chart-local Form States with coordinates, units, metric definition, uncertainty, priors, embodiment context and evidence bindings. Preserve raw observations separately from calibrated features, fused estimates, inferred state and display text. Follow `NLM_FRAME_SPEC.md` for the complete field inventory and value/missingness explanations.

Display the model actually loaded. A 16D reference encoder is an executable baseline; it must not acquire a “500M NLM” label by configuration alone. If the intended SSM/GNN weights or chart transforms do not exist, add the adapter interface and blocked status, retain the measured baseline, and list the missing artifact explicitly.

Deliver: cross-language serialization/hash vectors, malformed-frame rejection, calibration/unit tests, label-leakage tests, dependence-aware fusion tests, chart compatibility tests, and an observation-to-map proof traversal. Experimental attractor estimates must expose their evidence and validation status.

### M4 — source reports, ASCOPE/PMESII, 1–5 values and Borda

Bring the current source-report and comparison workbench into the authenticated case workspace. Reuse its validated behavior. Link immutable report revisions and candidate output hashes to a case/run. Provide reviewer identity, timestamps and amendment history using existing authentication; user-typed evaluator names alone are not production identity verification.

Retain all eight existing source categories. A category label does not create a HUMINT/SIGINT feed. Implement approved import/connectors only when the actual interface and data access are available. Separate what a source reported from an analyst's assessment and from independently established truth. Preserve conflicts and common-source declarations. A map layer or report count cannot fill an unknown matrix cell with an invented value.

Obtain the official meaning of the exercise's 1–5 values. Store scale ID/version, direction, criterion, raw integer and missingness. Keep raw measurements, source confidence, evaluator ratings, ordinal ranks and acceptance decisions in different fields. Borda uses complete comparisons and retains ties; it does not produce probability or override a failed admissibility gate. New scoring variants require new method identifiers and tests.

Deliver: parity with the independent A=3/B=5/C=1 example; ties, full abstention, zero counted ballots, partial ballot rejection, duplicate identities, out-of-range/boolean values, rubric versioning and amended-ballot history tests. Matrix tests must include all 36 cells, missing evidence and declared conflicts.

### M5 — one website walkthrough and shared CREP display

Implement an authenticated route using the existing NatureOS navigation/design system. Use existing CREP components and data providers rather than another independent globe. One selected case/run/time window must drive every tab:

The task selector must expose the full 16-objective registry and the supported subset for the selected run. Tasks without an implementation or supplied requirements show their actual blockers. The existing detailed screens below describe the currently available four-task baseline plus source review; a screen alone does not complete another task.

1. **Readiness:** exact service qualification, data origin, model versions, required inputs and blockers.
2. **Scenario & data:** supplied scenario definition, scale/rubric, files, sensors, report sources, coverage and truth separation.
3. **NLM frame:** raw/calibrated/fused data, priors, chart coordinates, uncertainty, byte counts, source/frame/transport proofs.
4. **Task 12:** matched baselines, predictions, calibration, coverage, missed positives including abstentions, event timing.
5. **Task 13:** typed observed/inferred/contradicted edges, evidence paths and source-removal comparison.
6. **Task 8:** bounded advisory options, evidence-cited claims, reviewer traces, constraints, dispositions and human review.
7. **Task 14 / Earth:** shared map features with source age, CRS, uncertainty, time slider and evidence drill-down.
8. **Source review:** ASCOPE/PMESII and source-report revisions, unknown cells, disputes and lineage.
9. **Evaluation:** actual scenario runs, scale-aware SME ratings, Borda comparison and task/product measurements.
10. **Export:** preview exact included artifacts, provenance, signing status, verifier and replay limits.

The UI needs loading, empty, unavailable, partial, stale, denied, cancelled and complete states. Do not use a green badge for a stale cached response. Restore runs after refresh/restart. Include keyboard navigation, readable contrast, responsive laptop layout and a non-WebGL table/static-map fallback. Measure first useful map render in the browser; server GeoJSON time is a separate metric.

Deliver: browser tests covering a complete live run, a recorded run, failure behavior and downloads. Every selected map feature must resolve to the same persisted evidence/frame/run referenced by the task output.

### M6 — evidence exports and demonstration acceptance

Create a versioned full-run export that includes the source-report and ranking snapshots (currently separate in v1.2), task results, frozen input/config/model/chart references, service receipts, scenario overlays, metrics, assessments, map layers, original-document references, inclusion proofs and manifest signature.

Specify what can be recomputed exactly. Deterministic Borda and matrix projections can be recomputed. A recorded remote/LLM response can be verified and replayed as a recording; calling a remote model again is a new execution and may differ. Include checkpoint/seed/runtime determinism constraints when claiming computational reproduction.

Deliver: standalone verifier with declared membership checks and tamper tests, trusted-key fingerprint workflow, dependency documentation, offline inspection, and the completed acceptance matrix. Neither a Merkle root nor a signature establishes physical truth or an externally trusted source by itself.

### M7 — staging, production and handback

Deploy compatible service changes to the actual staging environment in dependency order: storage migration/API, orchestration/model adapters, website integration. Use the established feature-flag/access pattern. Run `ACCEPTANCE.md` against the deployed staging build with authorized real inputs and trace the resulting objects across all services.

For production, follow the existing deployment workflow and access requirements. Record immutable image/build IDs, migrations, configuration names, enabled feature scope, health and action smoke tests, and rollback steps. Keep the feature off if critical live qualifications fail. A successful build, PR merge, HTTP 200 or loaded globe does not satisfy the live-run acceptance gate.

Deliver: linked PRs/commits across repositories, deployment record, exact live URL, measured demonstration run IDs, exported verification evidence, remaining gaps, and a rollback rehearsal record. Do not state “fully integrated” while required tasks still execute an undisclosed local substitute.

## 7. Requirements that need external evidence

| Needed item | Why it matters | Work that can continue without it |
|---|---|---|
| Official ITDX scenario/inject pack, schedule and acceptance rubric | Internal task plans cannot certify Army requirements | Complete schema, adapters, baseline and internal tests; retain `NOT_SUPPLIED` mapping |
| Precise 1–5 scale and evaluator procedure | Direction/meaning may differ from ranking or confidence | Implement configurable versioned scale registry; use explicitly invented examples |
| Accepted sensor recordings and authorized source reports | Synthetic tests cannot establish field quality or complete military data coverage | Build validated import and provenance flows; keep accuracy unmeasured without truth |
| Trained NLM/GNN weights and compatible chart registry | Reference modules cannot prove the proposed learned architecture | Integrate qualified existing models and expose missing qualification |
| Deployed endpoints, credentials and production access | Source-code existence does not establish reachable services | Build adapters and contract tests; record live tests as blocked until actual access |
| Home computer hardware/runtime and browser execution | No Windows/macOS or graphics performance was established here | Use portable baseline and record actual machine measurements during M0 |

## 8. Definition of done

All required products share a persisted run and source lineage; all requested live services contribute evidenced outputs; outages and unknowns remain visible; versioned exports pass independent verification; the local baseline stays reproducible; and the deployed browser walkthrough passes the real scenario acceptance matrix. Government acceptance remains a separate fact established only by the actual evaluator/rubric.

## 9. Paste this into Cursor

```text
Implement the next ITDX release from itdx/CURSOR_HANDOFF.md and all linked specifications, especially integration/ITDX_16_OBJECTIVES.md. Start by reading the applicable repository instructions and producing the deployment inventory, full 16-task registry and gap register. Preserve itdx/local as the frozen 1.2.0 snapshot; create new production code in the owning website, MINDEX, MAS and NLM repositories on linked integration branches. Reuse existing auth, database, jobs, CREP and deployment infrastructure. Follow milestones M0–M7, recording actual commands, results and remaining blockers. Integrate the available four-task baseline and partial Task 10 support, and track the other 11 workflows separately with supplied requirements, implementation and acceptance evidence. Health checks alone do not qualify integration. Preserve mathematical chart-based Form Space, complete source/frame provenance, unknown matrix cells, source-report distinctions, Borda tie/abstention rules, and the meaning of raw 1–5 values. Keep synthetic/recorded/imported/live origins and local/live backends explicit. Prove persistence, failures, browser behavior and export verification in staging before production rollout. Finish with linked commits/PRs, deployed version/URL, measured run IDs, verification artifacts and an honest list of unmet external requirements. Do not silently substitute fixtures, invent missing task definitions or weaken existing access, evidence or deployment controls.
```
