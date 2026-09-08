# Release validation — 2026-09-08

Application version: **1.1.0**. Measurements were made in the shared Linux/Python 3.12.13 execution workspace, not on the presentation laptop.

| Check | Result | Evidence |
|---|---|---|
| Python algorithm, import, launcher, persistence and evidence regression tests | 58 passed | sample_results/python_tests.txt |
| Actual HTTP server/API acceptance checks | 52 passed | sample_results/http_acceptance.json |
| JavaScript view/action unit checks against actual response fixtures | 34 passed | sample_results/javascript_view_tests.json |
| Selected-dataset scenario sweep | 41 functional passes; 0 failures/errors/skips | sample_results/scenario_results.html and scenario_suite.json |
| Five-seed scenario stress sweep | 205 functional passes; 0 failures/errors/skips | sample_results/five_seed_stress.html and five_seed_stress.json |
| Imported one-record contract fixture | 2 passes, 2 explicit prerequisite skips | sample_results/imported_contract_suite.json |
| Five-seed component comparison | Completed; fused-minus-sequence F1 gain 0.000000 | sample_results/five_seed_comparison.json |
| Export integrity and Ed25519 signature | Valid; separately supplied pin checked | sample_results/verification_result.json |
| Frozen-product replay | All five product groups match | sample_results/replay_result.json |
| PDF structure and visual review | Four pages parsed and inspected; no clipping/overlap | sample_results/evaluation_report.pdf |
| Browser layout/click rehearsal | Not performed; blocked by session URL policy | Rehearse in the regular browser on the laptop |
| Windows/macOS execution | Launchers supplied; those operating systems unavailable for testing | START_HERE launchers |
| Official Army acceptance / physical field validation | Not established | Government rubric and accepted sensor records not supplied |

## Actual results, including weaknesses

Showcase run: `run-a3306885224e4bdc`, SYNTHETIC_TEST, seed 11. There are 960 observations: 320 train, 320 validation and 320 held-out. Native encoder and 25-parameter temporal readout execute on CPU. No SSM/Mamba checkpoint or relational GNN was used.

- Clean integrated product computation: **0.2692 s**. This excludes export, storage, browser rendering and any separate comparison run.
- Application initialization: **0.0696 s**. This is not cold-map rendering.
- 41-case sweep: **14.288 s**, including storing its full case runs.
- 205 scenario/seed combinations: **44.486 s**, returning aggregate results. The trials reuse a controlled generator and are not independent field experiments.
- Quality status across the 205 trials: **155 MEASURED, 45 DEGRADATION_OBSERVED, 5 INVALID_LINK_EVALUATION**. Functional PASS means the specified behavior held; it does not mean perfect detection.

| Seed-11 condition | Eligible-only temporal F1 | Recall including abstentions | False alerts | Missed positive records | Link F1 |
|---|---:|---:|---:|---:|---:|
| clean: Clean coastal replay | 1.000000 | 1.000000 | 0 | 0 | 1.000000 |
| S12-3: Ontology remapping | 1.000000 | 0.846847 | 0 | 17 | 0.808989 |
| F-6: Linear calibration drift | 0.982301 | 1.000000 | 4 | 0 | 1.000000 |
| M-1: Rate escalation | 0.925620 | 0.861538 | 0 | 18 | 0.895833 |
| M-3: Spatial displacement | 1.000000 | 1.000000 | 0 | 0 | 0.822222 |
| M-4: Periodicity disruption | 0.982301 | 1.000000 | 4 | 0 | 0.981481 |
| M-5: Coordinated multi-source motif | 0.962199 | 0.927152 | 0 | 11 | 0.918519 |

The ontology case demonstrates why eligible-only F1 is insufficient: it is 1.0 while 17 positive observations are missed through abstention. Its full prediction coverage is 85.625%. Spatial displacement leaves a sensor-feature classifier unchanged but reduces spatial link quality. Rate escalation and the coordinated motif expose missed detections. All these observations remain in the exported results.

The native rule-based encoder's clean F1 is 0.117647 and recall 0.063063. The robust median/MAD baseline reaches F1 0.977974. The local temporal readout reaches 1.0 on this easy synthetic capture; that is not evidence of field generalization. Five-seed clean fusion shows no F1 improvement over the sequence component.

## What changed and how it was checked

The selected dataset now flows into the 41-case sweep. Its complete cases persist and reopen through the API. Imported fault overlays use IMPORTED_DATA_WITH_SYNTHETIC_INJECTS; insufficient inputs produce named SKIPs. The isolated one-row import test is fabricated test data, not a received field recording. Missing labels never produce fabricated accuracy. Empty CSV label columns, partial labels, null GeoJSON geometry, orphan truth and undefined event identity are tested explicitly.

Advisories have a configurable 300-second evidence-age limit relative to the recorded ingestion cutoff. A stale-only capture cannot ground a passing option even when historical detector scores are high. Unknown source aliases do not ground options. Existing AVANI and hard cost/time/action rules remain active.

Source-role shift swaps signals during an event window while preserving source counts and positive totals. Spatial displacement moves only part of an event. Relation imbalance adds 80 distinct, unlabelled provenance records; these deterministic source edges cannot inflate the link classifier's denominator. Source injects record input hashes and explicit changes. Modified motif fixtures are not used to claim a cross-version algorithm gain. The historical v1.0 reference is retained separately as prior_release_baseline.json.

Train/validation capture boundaries, held-out label nonleakage, signature tampering, Merkle index binding, Host/Origin/token protections, cancellation and persistence remain covered by regression or HTTP checks. Neither browser restrictions nor application request protections were weakened.

## Export and update

HTML/CSV/JSON exports contain actual scenario measurements. Individual signed bundles contain frozen inputs, truth, model, products, assessments, hashes and source versions. Signature integrity does not independently establish physical truth or signer identity. Private signing keys and operator local_data are excluded from the release package.

Stop the old app, extract this release to a new folder, copy the old local_data folder into the new app folder and use its START_HERE launcher. Retain the old source folder for exact replay of older exports. Existing runs remain historical and are not silently recomputed.

Rehearse the walkthrough, map interaction and downloads on the actual laptop. Import real measurements and, where available, independent truth labels before claiming field accuracy. Confirm the final Army injects, rubric and task priorities. Full trained NLM/GNN, multi-LLM MYCA, deployed MINDEX, full Earth Simulator and physical DIRTNet demonstrations still require their actual qualified services and records.


## Version 1.2.0 verification

81 Python tests passed (including 23 new ranking, source-evidence and HTTP tests); 34 existing JavaScript view checks and 8 new workbench view/event checks passed. The new HTTP checks cover page delivery, validated submissions, persistence, export, rejection without saving, and request-token enforcement. Both ranking and matrix exports were recomputed by their CLI replay tools; altered result digests were rejected. `sample_results/workbench_validation.json` records this scope.

The ranking oracle uses invented ballots with independently hand-calculated totals A=3, B=5, C=1. Tied ranks average occupied points, abstentions do not invent winners, incomplete ballots and duplicate evaluator names are rejected. The synthetic report oracle has 36 matrix cells, 33 unknown cells, and three reports in Events/Infrastructure, with one declared common source group and one unknown source group. These checks verify arithmetic and data handling, not real intelligence accuracy.

Visual browser layout verification was not possible. The public Earth Simulator reached a WebGL initialization error in the inspection browser, which reported graphics disabled. This does not establish failure on the user's demonstration machine. Full live-feed and trained-backend integration remain unverified. The existing scenario suite was not relabeled as official COIN or counterintelligence evaluation.
