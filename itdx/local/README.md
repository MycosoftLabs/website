# Mycosoft ITDX26 Algorithm Lab

A local, offline-first walkthrough of Tasks **12, 13, 8 and 14** using original Mycosoft modules, executable reference algorithms, source documents, fault scenarios and verifiable exports.

## Version 1.1 — measured scenario results

The scenario sweep now uses the selected dataset and constraint envelope. Every completed case is saved as a full run: open it from Test laboratory, inspect all four products, and export its signed evidence bundle. Unsupported cases show SKIP with a concrete prerequisite; they do not silently substitute demo data.

- **41-case sweep:** select an input in Test laboratory. Each row compares coverage, false alerts, missed positive records, event timing, graph quality and advisory dispositions with the unchanged capture using the same frozen model.
- **205 synthetic stress trials:** runs all 41 scenarios at seeds 11, 17, 23, 29 and 31. This uses the controlled generator regardless of the single-case input selector. Its rows are aggregate measurements; use the matching seed and Run case for a full exportable run.
- **Honest quality:** a functional PASS is separate from MEASURED, DEGRADATION_OBSERVED, NO_GROUND_TRUTH and INVALID_LINK_EVALUATION. Eligible-only F1 is accompanied by recall that counts abstained positives as misses. Quality status is a descriptive comparison, not a prescribed Army threshold.
- **Evidence age:** the default 300-second advisory evidence limit is explicit and configurable. Stale records and unresolved source aliases cannot ground a passing option. Age uses the recording's ingestion cutoff so offline historical replay is reproducible.
- **Audited injects:** every scenario records input hashes, changed fields, additions, removals and truth changes. Source-role shift swaps event-bearing signals, spatial displacement moves part of an event, and relation imbalance adds distinct unlabelled provenance records. These fixtures changed from v1.0; cross-version motif metrics are not a controlled algorithm-improvement claim.
- **Exports:** scenario and stress sessions export HTML, CSV and JSON. Individual signed bundles include their scenario impact assessment. Blank CSV labels, partial truth, null GeoJSON coordinates and unknown event identity are handled explicitly.

Precomputed results are in `sample_results/scenario_results.html` and `sample_results/five_seed_stress.html`; open them in your regular browser without starting a server. Their recorded hardware and timestamps describe the build validation machine. Run the tests in the app to measure your presentation computer. The one-row import test fixture is fabricated solely to test the importer and is not physical field evidence.

To update an existing installation: stop its launch terminal; extract this release into a **new folder**; copy the old `local_data` folder into the new `Mycosoft_ITDX26` folder; run the matching START_HERE launcher. Keep the old application folder for exact replay of its older signed exports. Do not overwrite the only copy of your operator data. Existing runs remain historical results and are not recomputed or relabeled as v1.1.

## Start here — repaired launcher

**Download and extract the entire updated ZIP. Open the extracted `Mycosoft_ITDX26` folder.** Opening `127.0.0.1` before starting the application will fail. A server running in the ChatGPT execution workspace is not reachable through the separate in-app browser tab.

- **Windows:** double-click **START_HERE_WINDOWS.bat**. It finds a compatible Python, or tries to install Python through WinGet. If WinGet is unavailable, it opens the official Python installer page. Normal operating-system installer prompts may require your input.
- **Mac:** double-click **START_HERE_MAC.command**, or run `bash START_HERE_MAC.command` in Terminal. If Python is absent, it opens the official installer page; install Python and run the launcher again.
- **Linux:** run `bash START_HERE_LINUX.sh`. Python 3.10+ is required; the launcher gives a package-manager instruction when Python is absent.

The launcher checks the extracted files, installs missing signing dependencies in an isolated application environment, finds an available port, waits for the real app to answer, then opens the verified address in your regular browser. **Keep the launch terminal open.** You do not need to type a localhost address. If port 8765 is occupied, the launcher selects another port and opens that address.

The app itself requires Python 3.10+. It does not need Node.js, a cloud account, a database server or a model download. The initial dependency installation requires internet only when the packages are missing. Subsequent local operation can be offline.

Python-based launch and diagnostics:

```sh
python launch.py
python launch.py --diagnose
python launch.py --smoke-test --no-install
```

On Mac/Linux, use `python3` if that is your Python command. If all candidate ports are occupied, use `python launch.py --port 8800`. The old launcher names still forward to the repaired startup process.

If launch fails, its terminal stays open on Windows/Mac and the error is saved to **local_data/startup.log**. Share that log to diagnose the actual computer. If you are offline and signing cannot be installed, the core app can be started explicitly with `python launch.py --allow-unsigned`; exports will clearly report unsigned status.

`run.py` remains available for direct/developer operation. Prefer `launch.py` for normal use because it waits for readiness and handles missing dependencies and occupied ports. Closing the terminal stops the application. Your datasets, runs, document imports and assessments remain in `local_data/`.

The launcher repair was tested on Linux, including actual HTTP startup, occupied-port fallback, dependency failure behavior and browser-dispatch ordering using a test callback. No browser security controls were disabled. Windows/macOS script syntax/source was reviewed but those operating systems were not available for execution testing. The full visual application still needs a rehearsal in your own regular browser.

Python installer references: [Microsoft's Windows Python installation guide](https://learn.microsoft.com/en-us/windows/dev-environment/python), [official Python macOS installers](https://www.python.org/downloads/macos/), [official Python Windows installers](https://www.python.org/downloads/windows/). The Windows bootstrap uses the WinGet package ID documented by Microsoft; the installed version should be verified on your computer.

## What you can do

- Run a reproducible 960-record coastal environmental fixture with independent training, validation and held-out captures.
- Compare a robust baseline, the native NLM encoder anomaly score, and a fitted 25-parameter temporal readout. Inspect training loss, calibration, detection delay and individual observations.
- Inspect typed source/observation graphs, inferred corroboration, pair metrics, source removal and leakage/type audits.
- Review three bounded advisory options, seven deterministic role traces, original AVANI verdicts, constraints and failure reasons.
- Explore a native CREP GeoJSON product on an offline coordinate map. Change replay time, hide stale evidence, compare observed-only projection, select a source and follow its proof.
- Inspect a frozen four-class Form Space atlas using the native 16D representation, declared reference distance, uncertainty and per-step distance change.
- Search all **29 supplied documents plus the preparation review**. Open originals, export extracted text and DOCX tables, and ask the native MYCA query interface for attributed source excerpts.
- Import CSV/JSON/GeoJSON measurements or PDF/DOCX/MD/TXT/SQL/image documents. Inputs and document prose remain separate. No sensor measurements are fabricated from narrative text.
- Run **41 cases**: clean replay plus 17 core, 7 field-component, 10 DIRTNet and 6 motif cases. Run the five-seed comparison. Results are measured, including zero or negative improvement.
- Save actual SME assessments. Export PDF, HTML, metrics CSV, GeoJSON, full JSON or a complete signed evaluation ZIP.
- Verify integrity independently and recompute the products from the frozen model and input snapshot.

## What code executes

| System | Executed here | Boundary |
|---|---|---|
| NLM | Original `NatureEmbeddingEncoder`, binary Merkle tree and frame-root functions | Local temporal logistic readout; no trained SSM/Mamba checkpoint |
| MINDEX | Original worldview metadata adapter; local SQLite evidence store and Form State records | No production PostgreSQL mutation or claim that SQLite is the deployed MINDEX service |
| MYCA | Original `MycaQueryInterface` with local document retrieval | Options use seven deterministic review roles; no multi-LLM agents or actuator calls |
| AVANI | Original scalar guardian, with optional Torch import adjustment | Declared cost/time/action checks are enforced in the app; approval is advisory |
| Earth Simulator | Original grid functions compiled by stripping TypeScript annotations | Offline angular coordinate view; not the full 3D application or a physics simulator |
| CREP | Original `CREPMapBridge` and search/domain data classes | Uses the run's actual observations and scores |
| Form Space | Native 16D coordinates, training-only frozen partition and versioned local atlas | Approximate distance is not treated as an equivalence relation; natural goal/attractor claims are not asserted |
| DIRTNet | Executable queue, deduplication, HMAC, equivocation, version and time checks | Software time simulation and public fixture keys; no radios, endurance or field identity qualification |

Exact upstream URLs, Git blob identities, execution status and adaptations are in `source_reference/UPSTREAM_MANIFEST.json` and visible in the app. Original proprietary Mycosoft code is included for this authorized local use; see `vendor/LICENSE.MYCOSOFT`. pypdf's license is in `vendor/LICENSE.PYPDF`.

Optional private-network service profiles support NLM health/sample inference, read-only MINDEX search, MYCA status and the full Earth UI link. Credentials are read from named environment variables. A healthy endpoint does not change the measured local backend or establish checkpoint qualification. Service samples are visibly separate. Full MYCA brain actions are not automatically invoked.

## The demonstration walkthrough

| Step | What to show | Suggested narration |
|---|---|---|
| Prepare | Dataset, source packet, scenario and constraints | “This is the evidence origin, the declared goal and the evaluation boundary.” |
| Pattern | Baselines, held-out scores and raw observation | “These algorithms see the same held-out records. The labels are separate from inference.” |
| Link | Recorded edges, inferred support, source removal | “Here is the support for this relationship, and here is what disappears when a source is removed.” |
| Options | Three envelopes, critique, AVANI and hard checks | “Each option exposes its resource and evidence constraints. Failed checks remain visible.” |
| Map and Form Space | Coordinate/time labels, state partition and proof | “These views project the same evidence and model identity.” |
| Challenge | Impossible constraints or altered message | “Now we introduce a contradiction and show the actual failure behavior.” |
| Export | Frozen model, outputs, signature and replay | “This packet lets another evaluator inspect and reproduce the computation.” |

Use the existing 25-minute script and 18-slide outline from **Data & documents** for your spoken framing. Suggested order for a short rehearsal: clean run → pattern evidence → source removal → impossible constraints → map → export. The seven walkthrough tabs include presenter cues.

## Data contract

A minimal CSV is supplied as `examples/observations.csv` and downloadable from the schema dialog. Sensor names carry units:

```csv
id,source_id,modality,observed_at,lat,lon,temperature_c,humidity_percent,pressure_hpa,gas_resistance_ohms,iaq_index,audio_level_db,fci_strength
field-001,site-a,thermal,2026-09-08T12:00:00Z,32.565,-117.129,23,55,1013,80000,42,35,0.4
```

JSON takes `{ "records": [...], "truth": { "observation-id": { "label": 0, "event_id": null } } }`. Put measurements under `variables`; leave labels outside observation objects. CSV's optional `label`/`event_id` columns are separated during import. Unlabeled imports run with the reference model and display accuracy as unmeasured.

Optional fields: `origin_id`, `source_name`, `modality`, `group`, `split`, `ingested_at`, `quality` (string list, semicolon-separated in CSV), `ontology`, `has_frame` and `crs`. Default split is test. For custom fitting, supply independent capture groups assigned to train/validation/test. A group cannot cross splits. Too little labeled training/validation data invokes explicitly labeled synthetic training captures.

Coordinates use `lat` and `lon`. EPSG:4326 is native; EPSG:3857 is converted with a retained original geometry. Unknown coordinate systems are omitted from precise maps. The default ontology is `nature-packet/v1`; unknown ontology causes abstention. Timestamps require a timezone. Non-finite values and conflicting IDs/origins are rejected. Limits: 16 MB per file, 12,000 observations, 250,000 candidate graph pairs. Split oversized captures into meaningful windows. PDF limit is 600 pages, DOCX expanded size 40 MB. Image-only pages are preserved without OCR.

The import origin is **IMPORTED_DATA_UNVERIFIED**. Uploading a file does not establish accepted field evidence.

## Verify and replay

From this application's folder:

```sh
python verify_bundle.py sample_results/verified_evaluation.zip
python replay.py sample_results/verified_evaluation.zip
python run.py --self-test
```

Verification checks file hashes, declared ZIP membership, canonical input/configuration/output roots, index-bound inclusion proofs and the Ed25519 signature when available. To establish signer identity, independently record and pass the key fingerprint:

```sh
python verify_bundle.py your-evaluation.zip --trusted-key-sha256 YOUR_PINNED_FINGERPRINT
```

Verifier exit codes: 0 = integrity and signature valid; 1 = invalid; 2 = unsigned or signature dependency missing. An included public key is not external identity proof. The supplied example fingerprint is in `sample_results/SIGNER_FINGERPRINT.txt`; its private key is excluded from this application package.

Replay checks the local code snapshot against the export, uses the frozen model directly, and compares predictions, graph, options, map and interaction scores. It refuses a mismatched source release. It does not refit or reinject a scenario. Bitwise replay was tested on Linux/Python 3.12; other platforms can have floating-point differences and will report a mismatch. Wall-clock timings and physical measurement truth are outside exact-output equality.

Test commands for developers, from this folder:

```sh
python run.py --self-test
python tests/http_acceptance.py
node tests/test_views.cjs
```

Node is only needed for the optional JavaScript view tests. The HTTP script starts an isolated loopback server on an available port and rewrites `sample_results` with new measured outputs. The core self-test uses temporary data. Neither writes to production services.

## Evidence and current limitations

The supplied example results contain actual local measurements and no invented SME assessment. The clean synthetic fixture is easy: a perfect readout F1 there is not a field-performance claim. The native rule-based anomaly score is also shown; it has much lower recall on this fixture. The five-seed comparison records **zero mean F1 gain from fusion over the temporal readout** on the clean fixture. Every result remains inspectable.

Read `VALIDATION.md` for release checks. The 41 case PASS results are functional invariant checks, not 41 demonstrations of detection quality. Motif checks verify specific input changes and retain measured detector degradation. A passing injection check does not establish successful detection. Synthetic clock drift, partitions and queue clearing are not physical radio or battery tests. The map's fine grid address is not sensor-location accuracy. Form distance is not validated physical velocity. Evidence references are not semantic entailment; unsupported-assertion rate requires adjudication.

Your packet provides internal preparation targets, including 90/120/240-second task caps, a 420-second integrated target, 5-second map target, 30-second cold map target and 300-second reconciliation target. The separate task caps sum to 450 seconds, so they cannot all be consumed within 420 seconds. This app measures CPU product timing and software queue timing. Browser cold-map rendering and real link reconciliation still need on-machine/field measurement.

**Not supplied:** final government agenda, official scenario/inject pack, acceptance rubric, accepted Coastal Sentinel field records, trained SSM/GNN checkpoints and qualified full agent/service deployments. The app exposes those gaps. It is not described as Army-certified or as satisfying a rubric that was not supplied.

## Files and local operation

- `run.py`, `itdx/`, `web/`: application and algorithm implementation.
- `vendor/`, `source_reference/`: original modules, upstream identities and reference contracts.
- `bundled_documents/`: 30 original files plus searchable extraction index.
- `sample_results/`: verified example export, reports, metrics, 41-case sweep, 205 stress trials, five-seed component results and test evidence. `prior_release_baseline.json` is explicitly a historical v1.0 fixture record.
- `tests/`: repeatable algorithm, HTTP and view tests.
- `local_data/`: created on launch; SQLite database, imported documents and local signing key. Back up this folder to preserve operator work. It is excluded from this release ZIP.

The server binds only to 127.0.0.1. Request-token and origin checks protect local mutations; the app does not require disabling browser policy, CORS or host validation. Default runs make no external calls. Stop the terminal to stop the server.


## Version 1.2.0 — source reporting and Borda evaluation

Use **Source reports & Borda** in the sidebar to open `/workbench.html`. The capability audit is at `/readiness.html`. Restart the launcher from this release; the new pages are not installed in an already running older copy. To preserve saved runs, keep the previous `local_data` directory when upgrading. New database tables are added without removing existing records.

The source-report workspace accepts HUMINT, SIGINT, OSINT, GEOINT, IMINT, MASINT, TECHINT and OTHER as provenance categories for supplied reports. It retains observed/reported/assessed status, ASCOPE/PMESII tags, source references, known common-source groups, optional confidence with a defined scale, review states, timestamps, locations and declared conflicts. A 36-cell matrix exposes unknowns; source groups are declarations, not proof of independence. JSON import/export preserves full cases. CSV exports contain reports or matrix rows. No military feed, automated intent assessment, or text-trained NLM backend is added.

Borda compares a fixed set of 2–20 outputs for one scenario and criterion. Use complete ordinal ranks (1 best) or explicitly convert 1–5 ratings (5 best) into ranks. Ties average the occupied points; all-null ballots abstain; partial ballots, duplicate evaluator identifiers and invalid numeric values are rejected. Equal evaluator weights are used. Results are relative preferences, not confidence, truth, official acceptance or decision authority. Changing the candidate set can change the result.

Save snapshots and export JSON or scores CSV. Recompute a ranking with `python rank_compare.py comparison.json`. A matching hash proves consistency with supplied inputs; these snapshots are not signed by an external source. Workbench snapshots are separate from the existing per-run ZIP exports. Original source references and rubric definitions require human validation.

Examples in `web/examples` are explicitly invented exercises. No actual evaluator ballots or intelligence reports were supplied. The existing 41 internal cases are not relabeled as official COIN/counterintelligence injects. The precise test values, government rubric, authorized data feeds, and full trained backends remain outstanding.

Recompute a source-matrix JSON export with `python review_replay.py case.json`. Both replay tools reject a stored result or result digest that disagrees with recomputation. They verify consistency, not source truth or external signer identity.
