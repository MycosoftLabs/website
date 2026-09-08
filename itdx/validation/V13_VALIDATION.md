# ITDX v1.3 validation — 2026-09-08

These are producer-environment software checks and deterministic synthetic measurements. They are separate from Army acceptance, field validation and deployed-system qualification.

| Check | Observed result |
|---|---|
| Active local app Python self-test | **92 tests passed**, including the previous 81 tests, 9 source workspace/HTTP tests and 2 authenticated-service tests |
| Existing JavaScript view tests | **42 checks passed**: 34 main views and 8 source/Borda workbench |
| New replay/map/import tests | **12 tests passed**: deterministic replay, arrival-time filtering, geodesic bounds, independent coverage/RMSE calculation, provenance/geometry, shared-core byte identity, map lifecycle and JSON source validation (some grouped within one test) |
| New shared TypeScript modules | Strict type check passed for the new page, four React components, session modules and replay store with real React, Next and MapLibre declarations. Gateway checked against the existing owner-helper return contract; not a full website build or auth integration test |
| Authenticated Python service | Unauthorized reads and tokenless writes rejected; a real clean evaluation completed and exported through authenticated HTTP |
| Gateway and shared session logic | Fixed path allowlist, mounted asset URLs, bounded response size, consumer callbacks, reference validation and failure isolation passed |
| Actual MapLibre style schema | All five layer definitions accepted by `@maplibre/maplibre-gl-style-spec`; zero validation errors |
| New PDF pack | 10 originals, 86 pages, 86 JPEG previews; original bytes match recorded SHA-256 |
| Local source HTTP | All 86 page previews and all ten original downloads returned successfully; scoped search, exact quotation saving, review export, invalid inputs and CSRF rejection checked |
| Full source bundle | 40 documents and 41 manifest members verified; Ed25519 signature valid; included public key not independently trusted |
| Fusarium JSON reader on actual export | 40 documents and **146 page hashes** verified; original PDFs intentionally not embedded or verified by this JSON reader |
| Replay sample 120 | Exact kernel, all 484 records and full frame recomputed against recorded hashes |
| Launch behavior | Readiness, occupied-port fallback, opening the browser only after verified readiness, and clean test shutdown passed on Linux/Python 3.12 |
| Browser visual rehearsal | **BLOCKED**: cloud browser reported `net::ERR_BLOCKED_BY_CLIENT` for the running local app; no rendered UI or WebGL appearance claimed verified |
| Full website CI / production deployment | **NOT RUN**; requires the receiving checkout, normal build environment, sign-in and staging rehearsal |

The numerical replay kernel has SHA-256 `59d49016d76b9185a7b421dd3b9225e8d476db271353414e0d1da5fba2196d89`. The sample-120 full frame has SHA-256 `4540099cbffac86e13fa03ebd39f135fc231d6e922340bd7025fc2e9921e3ec6` over the kernel's JSON serialization. See `app/sample_results/replay_result.json` and `app/verify_replay.mjs`.

Sample-120 coverage: clean 117/121; deliberately biased 39/121; missing-report stream 107/110 with 11 missing; delayed stream 109/114 with observation age 70 seconds. These finite counts are descriptive measurements under the disclosed synthetic generator. They do not estimate truthfulness, hostile intent or deception. The geometric circle remains tied to observation time.

Testing found and fixed a feature property collision that prevented the map filter from selecting asset points. The map lifecycle test now verifies all four asset features are present after their arrival times, style replacement preserves the selected replay frame, and disposing the layer leaves preexisting sources/layers intact. Launcher tests were updated to count installed document packs instead of assuming exactly 30 documents.

The ten new source PDFs, extracted text and page previews are excluded from public Git and included only in the owner's complete local exercise download. Original markings remain visible. The 188-file v1.2 snapshot stays byte-identical; no v1.3 run is relabeled as an older release.

Required receiving-machine gates: actual browser interaction and responsive layout, deployed map engine/style lifecycle, signed-in Fusarium navigation, full repository build/CI, and normal deployment review. Production MINDEX/MYCA/NLM connections, durable private source storage and official acceptance of all 16 tasks remain unestablished.
