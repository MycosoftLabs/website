# Cursor handoff — implement and rehearse the ITDX v1.3 integration

**Latest owner direction:** ITDX is its own full workbench in Fusarium, independent of Earth Simulator. Cursor owns the Earth left-panel ITDX tab. Read [integration/FUSARIUM_APP_SETUP.md](integration/FUSARIUM_APP_SETUP.md) first for the authenticated backend, full application shell and cross-app context contract.

The owner is handing you this work now. This is an incremental branch on top of `codex/itdx-live-integration-handoff-20260908` / draft PR #298 in `MycosoftLabs/website`. Start with this file for v1.3, then read the original `CURSOR_HANDOFF.md` for the broader service inventory. This supplement supersedes the original document's statement that v1.3 has not been implemented, for the bounded features listed here only.

## Deliverables and source of truth

| Path | Role |
|---|---|
| `itdx/local/` | Frozen v1.2 release, unchanged; retain for old signed-export replay |
| `itdx/app/` | Active v1.3 local app, including all prior local prototypes and the new source workspace |
| `itdx/app/exercise_packs/` | Ignored local document packs; only README committed |
| `lib/itdx/replay-core.mjs` | Canonical deterministic fictional replay; byte-identical to `itdx/app/web/replay-core.mjs` |
| `lib/itdx/map-layer.mjs` | Shared MapLibre source/layer lifecycle; only `itdx-fictional-replay*` IDs |
| `lib/itdx/replay-store.ts` | In-memory playback/selection state shared across Fusarium routes |
| `components/itdx/` | Source reader, persistent replay dock, map adapter and scoped CSS |
| `app/fusarium/(dashboard)/itdx/page.tsx` | New protected Fusarium page, inheriting dashboard owner/MFA controls |
| `components/fusarium/fusarium-layout-client.tsx` | Adds the dock outside the full-height app workspace |
| `app/dashboard/crep/CREPDashboardClient.tsx` | Adds the replay layer beside existing overlays; no changes to live asset handlers |
| `itdx/integration/test_map_layer.mjs` | Style lifecycle and private JSON import tests |
| `itdx/validation/V13_VALIDATION.md` | Actual tests, remaining gates and measurements |

The downloadable complete v1.3 app contains the ten new owner-supplied exercise PDFs and 86 page previews. They retain their UNCLASSIFIED//FOUO and training markings and are deliberately absent from this public Git branch, including their extracted text and images. Copy the ignored exercise-pack directory from that download locally; do not force-add it to Git. Preserve the existing owner controls. This work does not authorize public publication of these source PDFs or their content.

## First session on the home computer

1. Fetch the new `codex/itdx-document-workspace-20260908` branch. It includes the previous handoff through its parent. Inspect current repository instructions and compare against any newer Earth/Fusarium changes before merging. The two existing website integration edits are deliberately small, but CREPDashboardClient is large and may conflict with concurrent work.
2. Keep `itdx/local/` unchanged. Use `itdx/app/` for v1.3. Copy `exercise_packs/itdx-training-documents/` from the private complete download into that active app. Start in a new directory with a backed-up copy of any old operator data.
3. Run `python itdx/verify_handoff.py`, then from `itdx/app/` run `python launch.py`. Keep the launcher terminal open. It checks dependencies and readiness, chooses an available port and opens your machine's actual loopback address.
4. Confirm the bootstrap shows v1.3.0 and 40 documents with the exercise pack installed, or 30 without it. Exercise workspace should show 86 exercise PDF pages. Page-image rendering is packaged and does not need an external tile service or OCR installation at runtime.
5. Install the website's normal lockfile dependencies using its normal package manager. This change adds no website runtime dependencies. Compile and run the website in the receiving environment, use your existing Fusarium sign-in and MFA, and visit `/fusarium/itdx`.
6. In the local source workspace, export review JSON. Load it in Fusarium's ITDX page. Expect all page hashes to verify; the JSON does not contain the original PDF bytes. It is kept only in that page's memory and cleared by reload. Durable private document storage is a separate future integration requiring an authorized private backend.

## Required visible rehearsal

Record your actual browser, OS, application commit, map engine and results. Do not replace a failed gate with a success label.

- Open the dock across Fusarium routes. It must not resize the map workspace or cause the entire application shell to rerender every playback tick. Its small collapsed control is the persistent entry point.
- Enable demo → Earth Simulator → Focus demo. Verify four generic invented assets near 0°N, 0°E by sample 7, four authored track lines, the display boundary/corridor and observation-time circles. At sample 0 the delayed and missing streams have no position yet.
- Confirm live assets remain in their own sources. Clicking a demo point selects its own detail panel and does not invoke live asset actions. Turning off the demo removes only its prefixed sources/layers.
- Switch the actual basemap/style, navigate to another Fusarium app and back, toggle the demo repeatedly and scrub time. No duplicate listeners or orphan layers should accumulate. Check the deployed V3/globe engine's handling of the same MapLibre instance passed to the other overlay components. If a newer engine uses a different adapter, connect this existing fictional GeoJSON through that adapter and run the same checks; do not fabricate a live-data integration result.
- Verify the observation age reads 70 s for the delayed stream after it begins, including sample 120. The circle describes observation-time model error. It must not silently become a current-position prediction.
- Select the biased stream after sample 40. Its stated zero-mean assumption is broken and measured coverage falls. At sample 120 expect 39/121 inside the circle and RMSE approximately 127.25 m. The clean case should be 117/121 and approximately 48.91 m.
- Export GeoJSON and measurements. Confirm all features carry SYNTHETIC_EXERCISE and no source document positions entered the replay. Compare local and shared-web output identities.
- Review the ten new PDFs with their markings, including image-rich pages. Exact quotation capture must bind to its selected page. Invalid quotations must fail, saved notes must survive local app restart, and task reference links must open the correct original document.
- Export a signed source ZIP, verify it independently, then change a member and verify rejection. Test JSON import with a changed page and an invalid quote; both must fail before displaying a newly imported workspace.

## Commands and expected scope

```sh
python itdx/verify_handoff.py
cd itdx/app
python run.py --self-test
node tests/test_views.cjs
node tests/test_workbench_views.cjs
node --test tests/test_replay.mjs
node verify_replay.mjs
```

From repository root: `node --test itdx/integration/test_map_layer.mjs`. Private-pack tests skip explicitly if the pack is absent. Shared-core equality check skips only when run from the standalone app download outside a website checkout.

Run the receiving repository's normal TypeScript/lint/build gates and a browser rehearsal. The producer tested the new modules separately; the full production website build, owner-authenticated map rendering and live deployment were not executed in the producer's workspace. Its cloud browser blocked localhost with ERR_BLOCKED_BY_CLIENT. No browser, authentication or network policy was weakened.

## Integration boundaries to preserve

This release connects a fixed fictional replay to the shared Earth map and adds a cited source-document workflow. The position module is disclosed numerical simulation, not a trained NLM result. The local NLM/Form Space prototypes, Borda count, ASCOPE/PMESII source review and provenance tools remain separate, inspectable modules. No generative model is required for the replay calculations.

MINDEX production persistence, durable private source storage, production MYCA jobs, trained NLM checkpoint execution and cross-service traces have not been added by this supplement. Keep connection states explicit; a healthy endpoint or imported JSON file does not make them integrated. Do not mark all 16 objectives implemented: the registry still distinguishes local prototypes, partial support, unimplemented tasks and missing evaluator acceptance. The ten PDFs are reference material, not a complete official acceptance rubric.

The replay does not consume real military locations, derive routes from the OPORD, assess feasible maneuver, infer hostile intent/deception, or issue commands. Do not reinterpret authored display boundaries as terrain constraints or nominal uncertainty as probability of report truth. Deploy only the reviewed synthetic/document-review features through the normal staging and production process after the actual integration gates pass.

## Demonstration sequence

Source page → exact quotation → saved reviewer note → task-reference status → fictional map replay → delayed observation → biased sensor → measured coverage → export → independent verification. State the input origin and timestamp before discussing any number. This is a demonstrable evidence workflow with reproducible mathematics; final Army evaluation remains external.
