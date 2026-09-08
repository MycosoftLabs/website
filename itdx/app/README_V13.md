# ITDX local v1.3 — source workspace and fictional replay

Run `python launch.py` from this folder, keep the terminal open, and use the address it verifies. Python 3.10+ is required. Windows: `START_HERE_WINDOWS.bat`; macOS: `bash START_HERE_MAC.command`; Linux: `bash START_HERE_LINUX.sh`. The launcher uses an isolated environment if signing dependencies need installation. Node is optional, for developer tests and replay verification.

Open **Exercise workspace & replay** in the application sidebar. The new page has four views:

1. **Sources & citations.** Select a source, inspect extracted text or the original page image, capture an exact quotation, select its task reference, add your own note and reviewer label, then save. Notes are stored in local SQLite and never replace the source text. A reviewer label is not independently authenticated identity. Quotes must occur on the cited page.
2. **16 objectives.** Review the organizer's transcribed objective list, explicit implementation statuses and linked references. Attaching an Annex or map document does not implement the corresponding analytical task or establish evaluator acceptance.
3. **Synthetic map replay.** Play 20 minutes of fixed simulated time at 20× playback, scrub to a sample, select a marker and inspect observation age, measured error, RMSE, missing records, and coverage. Export the current GeoJSON or all 484 synthetic records.
4. **Integrity & export.** Run document checks, export review JSON for the Fusarium reader, or export originals plus notes in a signed ZIP. Preserve handling markings when moving exports.

The complete exercise download includes the ten newly supplied PDFs, 86 original-page previews, extracted page text and original-file hashes under `exercise_packs/itdx-training-documents/`. The supplied documents retain their **UNCLASSIFIED//FOUO**, **FOR TRAINING USE ONLY**, and exercise markings. The public GitHub code excludes this pack, all local state and private signing keys. If starting from GitHub, copy this exercise-pack directory from your supplied v1.3 download into `itdx/app/exercise_packs/`, then restart. Original 30 preparation documents remain bundled.

The narrative PDFs are cited source material. They are not georeferenced automatically and do not provide coordinates to the replay. Text extraction does not establish faithful reading of tables, graphics or scan content; compare the original page preview.

## What the replay measures

All markers, paths and the display corridor are invented near 0°N, 0°E. Paths and boundaries are authored graphics. They do not establish passable terrain, feasible movement, prediction or recommendations.

For independent, zero-mean Gaussian coordinate errors with σ = 35 m, the radial error has cumulative distribution `1 − exp(−r²/(2σ²))`. The nominal 95% observation-time radius is `35 × sqrt(−2 ln(0.05))`, approximately **85.67 m**. Coverage is the count of known simulated errors inside that radius divided by valid received reports. These finite replay measurements are not field calibration or a probability that a report is truthful.

| Fixed case at sample 120 | Coverage | Position RMSE | Data limitation shown |
|---|---:|---:|---|
| Demo unit | 117/121 = 96.7% | 48.91 m | Stated zero-mean noise model |
| Demo vehicle | 39/121 = 32.2% | 127.25 m | Added 140 m bias from sample 40 violates the model |
| Demo sensor | 107/110 = 97.3% | 46.33 m | 11 scheduled reports missing; missing reports excluded from the coverage denominator |
| Demo air marker | 109/114 = 95.6% | 51.06 m | Reports delayed 70 s; seven future arrivals excluded at replay end |

The delayed marker displays its last received observation and its age. The circle applies at that observation's timestamp. It is not a current-position bound. Known synthetic ground truth is used for evaluation only. No probabilities of threat, hostile intent, coercion or deception are inferred. No real military feed or command interface is included.

The position replay uses its own disclosed mathematical kernel; it is not presented as trained NLM inference. The existing NLM, Form Space, Borda, source-report and local algorithm prototypes remain accessible in the main app, with their existing boundaries. SQLite is not the production MINDEX service.

## Exports and checks

```sh
python run.py --self-test
python verify_workspace.py your-source-bundle.zip
python verify_workspace.py your-source-bundle.zip --trusted-key-sha256 YOUR_INDEPENDENTLY_PINNED_FINGERPRINT
node tests/test_replay.mjs
node verify_replay.mjs
```

Source bundle verification checks exact ZIP membership, file hashes, page-text bindings, quotation bindings, note-content digests and the optional Ed25519 signature. An included public key is not trusted identity by itself. A matching hash does not prove factual accuracy or permission to redistribute a source. `verify_replay.mjs` verifies the packaged mathematical kernel and recomputes the exact sample-120 frame and all measurements against the recorded hashes.

Keep the v1.2 folder to replay exports made by that version. v1.3 is installed in a new folder; copy prior `local_data/` only after making a backup. Existing signed sample bundles inherited from v1.2 remain v1.2 historical results; use the frozen v1.2 application for exact replay of those. New replay results are in `sample_results/replay_result.json`.

## Fusarium

The dedicated `/fusarium/itdx` application can host this complete workbench through an authenticated backend gateway. Use `service.py` with a server-only bearer secret and persistent data volume for that mode. Desktop users continue to use `launch.py`. See the included handoff `FUSARIUM_APP_SETUP.md` for setup and cross-app integration.

The corresponding website branch adds `/fusarium/itdx`, a shared ITDX control dock, and a synthetic GeoJSON layer in the existing CREP map. It retains the existing owner/MFA route protection and classification controls. The source reader imports review JSON into browser memory, verifies its page hashes and quotation bindings, and makes no upload request. Reload clears this imported source content. Original PDF images and files remain in the local application.

Open **ITDX workspace**, enable the demo, open **Earth Simulator**, then select **Focus demo**. Enablement never changes live registries; all synthetic features have `data_origin: SYNTHETIC_EXERCISE`. The layer reattaches after map style changes and removes only its own layers when disabled. Its appearance in the deployed WebGL engine must still be rehearsed by Cursor on the receiving machine. This package does not deploy production or establish all 16 tasks as complete.
