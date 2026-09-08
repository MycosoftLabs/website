# Acceptance plan for the next integrated release

This distinguishes internal preparation checks, measured quality, live integration evidence and official evaluator acceptance. A functional PASS is not a claim of detection quality. All new live checks below start as **NOT RUN**. Cursor must record their actual outcomes and evidence; it must not turn this document into a prefilled passing report.

The owner subsequently supplied the organizer presentation's complete 16-objective list. `ITDX_16_OBJECTIVES.md` and `TASK_OBJECTIVES.csv` define that task register and add OBJ-01 through OBJ-06 acceptance checks. The four-task product table below describes the current implemented subset. Require a separate input/output/method/acceptance contract for each additional objective; do not extrapolate success from the four prototypes to all 16.

## Recorded baseline and its limits

The bundled release documentation records 81 Python tests and 42 JavaScript view/event checks for v1.2, including the source-report/Borda additions. Earlier v1.1 artifacts record 52 HTTP checks, 41 functional scenario passes and 205 synthetic scenario/seed trials. Those 205 trials include 45 `DEGRADATION_OBSERVED` and 5 `INVALID_LINK_EVALUATION` quality results. They are software tests with controlled data, not 205 independent field experiments.

The clean synthetic fixture can produce perfect held-out readout F1, while the native anomaly score has much lower recall. Fusion showed no mean F1 improvement over the temporal readout in the clean five-seed comparison. Preserve both successful and weak results. Historical HTML/PDF outputs do not measure the home computer, browser rendering or live service latency.

## Test record format

Each test result must record ID, requirement authority/version, code/build/model/chart versions, input snapshot and origin, requested/actual backends, prerequisites, execution timestamps, hardware/browser/network context, expected behavior, actual behavior, metrics with denominators, status, reason, trace/run IDs and artifact hashes. Use `PASS`, `FAIL`, `BLOCKED`, `SKIP`, `NOT_RUN` for execution status; keep quality assessment and official acceptance in separate fields.

Do not impute unobserved ground truth. Metrics needing truth or SME assessment are `UNMEASURED` until the corresponding data exists. Capture-group boundaries, source-family dependence and repeated trials affect uncertainty estimates; record the sampling unit and bootstrap method.

## Four task products and evaluation gaps

| Task | Required product in the integrated walkthrough | Existing baseline / measurement | Additional proof needed |
|---|---|---|---|
| 12 — Pattern | Per-observation/window scores, event timing, chart-local classes, uncertainty and evidence refs | Robust median/MAD detector, native encoder score, local temporal readout, controlled splits | Actual qualified model output; matched comparison data; coverage/abstention metrics; calibration on permitted data; proposed matched-parameter sequence baseline only when implemented |
| 13 — Link | Typed observed/inferred/contradicted edges, evidence paths, source-removal impact | Deterministic graph and spatial baseline on held-out candidate pairs | Real learned GNN if claimed; identical valid candidate universe; relation/source leakage checks; path recall/ARI only with appropriate truth |
| 8 — Advisory options | Distinct bounded option envelopes, evidence-cited justifications, structured critique, AVANI/constraint disposition and human review | Three local options, seven deterministic review traces, scalar AVANI checks | Actual MYCA workflow and role/service receipts; unsupported-assertion adjudication; no inference that a citation alone semantically supports a claim |
| 14 — Map | Same-run GeoJSON/layers, timestamps/CRS/source age, observed/inferred/uncertainty controls and proof drill-down | Offline angular map and native CREP bridge/grid functions | Shared live CREP display, browser timing, correct uncertainty geometry, tested non-WebGL fallback and export/render parity |

Internal planning targets include 90/120/240 seconds for Tasks 12/13/8, integrated 420 seconds, map refresh 5 seconds, cold map 30 seconds and reconciliation 300 seconds. These are **Mycosoft planning targets pending official confirmation**. The three individual task caps sum to 450 seconds; the integrated target requires a separate measured scheduling budget. Measure queue, transfer, model, storage, rendering and export separately. Do not equate CPU product time with complete evaluator workflow time.

## Scenario coverage

`SCENARIO_REGISTER.csv` preserves all 41 current case IDs and expected behaviors. Its official requirement mappings are `NOT_SUPPLIED` and live status is `NOT_RUN`. Retain these rows when adding actual official injects; create a mapping table with authority/document/page/version, scenario ID, expected observable, task(s), data prerequisites, ground truth, metric, threshold and evidence artifact.

| Family | Current cases | Meaning and extension |
|---|---|---|
| Reference | `clean` | Frozen coastal synthetic run; compare with an unchanged input/model snapshot |
| Pattern | `S12-1`–`S12-5` | Duplication, clock/ingestion delay, ontology, missing geography, source aliases |
| Link | `S13-1`–`S13-5` | Same-name IDs, source removal, relation imbalance, inverse leakage, invalid edge types |
| Advisory | `S8-1`–`S8-4` | Impossible constraints, instructions in evidence, incomplete inputs, duplicate proposals |
| Map | `S14-1`–`S14-3` | Mixed CRS, stale layer, dense labels; add actual browser evidence |
| Field component ablations | `F-1`–`F-7` | Missing modalities, clock offset, delayed packets, drift, raw/summary payload comparison; software inputs are not physical field proof |
| DIRTNet | `D-1`–`D-10` | Partition, replay, forged authenticator, equivocation, stale version, bounded update validation, gateway outage, bandwidth, clock spoof, conflicting sensors |
| Motifs | `M-1`–`M-6` | Event-rate, source-role, spatial and periodic changes, coordinated signal change, volume-only duplication |

Run each supported case against the selected dataset and frozen configuration. Preserve overlay hashes, changed fields, additions/removals and truth changes. Insufficient data yields a named prerequisite SKIP, not replacement synthetic data. Imported measurements with synthetic overlays must say so in their origin. Five seeds are the current internal method; do not impose them as an official rubric without evidence.

The requested COIN/counterintelligence exercise pack and official 1–5 interpretation are not present. The source-review extension can test report lineage, duplicated reporting, contradictions, missing evidence and human review using approved supplied scenarios. It must not invent operational injects, intelligence feeds, hostile identities or acceptance thresholds.

## Integration acceptance cases to implement

| ID | Test and expected observable | Required evidence |
|---|---|---|
| INT-01 | Qualified readiness distinguishes process, auth, data and model status; stale checks expire | Live checked-at values, authorized action receipt, denied-auth result |
| INT-02 | Requesting `live_services` actually uses service output in Task 12 and downstream products | Input/output hashes, service build/checkpoint and cross-service trace; deliberately varied valid input changes appropriate output |
| INT-03 | A healthy process with unavailable database/model cannot yield a successful complete run | Injected dependency failure and explicit blocked/failed state |
| INT-04 | Local reference, recorded replay and live service paths remain visibly distinct | UI and exports of each path; origin independent from backend |
| INT-05 | Idempotent submission cannot duplicate a run; changed body with same key conflicts | Concurrent request test and persisted object count |
| INT-06 | Restart resumes or safely terminates jobs according to contract; completed outputs persist | Coordinator restart and database/object references after recovery |
| INT-07 | Cancellation, timeout and retry attempts have truthful terminal/partial state | Event sequence and attempt receipts; no successful badge for cancelled work |
| INT-08 | Cross-case access to JSON, documents, layers, streams and exports is rejected | Authorized and unauthorized user tests using established auth |
| INT-09 | Secrets stay server-side; evidence text cannot change policy or invoke arbitrary tools | Client bundle/config review and malicious-text fixture result |
| INT-10 | Query outage differs from a valid empty query; pagination reports completeness | Empty, partial, failed and multi-page query fixtures |
| INT-11 | MINDEX import dry run and repeat import preserve originals and hashes without duplicate revisions | Migration/import report and original-to-normalized mapping |
| INT-12 | Nonfinite numbers, unknown units/ontology/CRS, missing time and malformed archives are handled explicitly | Validation tests, retained originals and exclusion reasons |
| INT-13 | NLM model/chart mismatch causes rejection or declared abstention | Actual registry/response mismatch tests |
| INT-14 | Fusion preserves correlated-source and conflict information; labels cannot enter inference | Dependence/leakage tests with frozen input and transform hashes |
| INT-15 | Graph evidence removal has the measured expected effect and keeps counterevidence | Before/after edges, affected paths and candidate/truth denominators |
| INT-16 | MYCA produces structured role traces and validates claims/constraints; missing role does not claim full workflow | Service receipts, schema failures, explicit review/disposition and bounded revision trace |
| INT-17 | All ASCOPE/PMESII cells exist; unknowns remain unknown; report lineage/conflicts survive amendments | 36-cell oracle, revision history, source-group test and round-trip export |
| INT-18 | Borda matches the independent oracle and rejects invalid comparisons | A=3/B=5/C=1, tied ranks, ratings conversion, abstention, duplicate/partial ballot tests |
| INT-19 | Raw 1–5 values retain their scale/criterion/direction and cannot become inferred probability | Separate raw/rank/confidence fields; unknown scale blocks interpreted score |
| INT-20 | Every CREP feature resolves to the same case/run/frame/evidence; stale/uncertain/null geometry is handled | Browser traversal and layer/product hash parity |
| INT-21 | No WebGL still allows evidence inspection; desktop/laptop/mobile and keyboard paths work | Actual browser screenshots/actions, error state and fallback interaction |
| INT-22 | Full export includes exact report/ranking/assessment revisions and rejects tampering/extras/missing members | Independent verifier report and corrupted manifest/object/signature tests |
| INT-23 | Remote recordings replay honestly; deterministic components recompute without a fresh model call | Offline verification, network-disabled recording replay and explicit reproduction boundary |
| INT-24 | All supported official injects map to actual requirements and results; unsupported rows stay blocked | Requirement-source mapping plus run/export references |
| INT-25 | Staging and production each run the exact deployed build and qualified service versions | Release record, action smoke run and verified export from each environment |
| INT-26 | Rollback disables the feature/restores compatible services without erasing evidence | Staging rehearsal, migration compatibility and retained object checks |

## Reviewer evaluation and Borda specifics

Keep one comparison's candidate set and criterion fixed. v1.2 uses equal weights, at most 100 ballots and 2–20 candidates. For candidate count `m`, points are `m − average occupied rank`; ranks are derived from the ordering, with ties averaged. Mode `rank` means lower is better. Mode `rating_1_5` means higher is better, and conversion discards magnitude. Final ties remain ties; lexicographic display order is not a tiebreak winner. All-null ballots abstain; partially missing ballots are rejected. No counted ballots means no winner. Whitespace/case-normalized duplicate evaluator identifiers are rejected locally; production also needs authenticated identity and revision semantics.

An output outside a hard admissibility envelope cannot become admissible through Borda. Store preference and disposition separately and make exclusion rules explicit before collecting ballots. SME ratings measure the supplied criterion, not physical correctness unless the rubric and adjudication establish that relationship.

## Rehearsal and release artifacts

On the actual demonstration machine, complete: launch/readiness; choose origin/scenario/rubric; inspect one full frame; run four tasks; follow an evidence path; remove a source or introduce a declared contradiction; inspect the changed result; review the matrix; enter an actual assessment or explicit abstention; compare compatible outputs; export and verify offline. Record a timed walkthrough and a fallback path for network/WebGL failure. Use the supplied 25-minute script and 18-slide outline as presentation inputs, updating claims to match the measured implementation.

Release evidence should include `DEPLOYMENT_INVENTORY.md`, the gap register, cross-repository commit/image list, model/chart qualification, executed acceptance matrix, browser report, selected measured run IDs, export hashes/verifier output, schema migration/rollback record and the exact production URL. Do not publish operational source content or credentials in generic CI artifacts; apply the existing data-access and handling rules to the test environment and exports.
