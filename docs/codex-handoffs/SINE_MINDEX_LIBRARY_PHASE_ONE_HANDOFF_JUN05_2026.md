# SINE + MINDEX Library Phase One Handoff - June 5, 2026

## Status

Phase One is documented for a later bundled deploy with the Earth Simulator changes.

Nothing was staged or committed by Codex. The working tree is dirty from multiple active tracks, so keep this phase scoped to the files listed below unless Morgan explicitly expands the deploy batch.

Latest local result:

- `3010` is back up.
- SINE / MINDEX Library API paths are green locally.
- Whole-repo TypeScript passed after shared deploy unblockers.
- Full `npm.cmd run build` passed after the Next server chunk path fix.
- Earth Simulator should be owned by the Earth agent from here forward; do not keep editing Earth files in this SINE pass without coordination.

## Files Codex Changed In This Phase

Website repo:

- `components/sensing/sine-acoustic-player.tsx`
- `components/mindex/tabs/library-tab.tsx`
- `next.config.js`
- `docs/codex-handoffs/MINDEX_ACOUSTIC_CLASSIFIER_FRONTEND_PLAN_JUN04_2026.md`
- `docs/codex-handoffs/SINE_ACOUSTIC_CLASSIFIER_FULL_CONTEXT_JUN04_2026.md`
- `docs/codex-handoffs/SINE_MINDEX_LIBRARY_PHASE_ONE_HANDOFF_JUN05_2026.md`

Shared deploy / Earth overlap:

- `app/dashboard/crep/CREPDashboardClient.tsx`
- `components/crep/layers/v3-overlays.tsx`

These two CREP files were touched only to unblock whole-repo `tsc` for the bundled deploy. Coordinate with the Earth Simulator Codex agent before staging or committing them.

Related external / local context used:

- `https://mycosoft.com/about`
- `MAS/mycosoft-mas/docs/codex-handoffs/MAS_NLM_LIBRARY_CODEX_HANDOFF_JUN04_2026.md`
- `MAS/mycosoft-mas/docs/MAS_NLM_MINDEX_LIBRARY_INTEGRATION_COMPLETE_JUN04_2026.md`
- `MINDEX/mindex/sine-acoustic-classifier` AI Studio prototype context
- Local acoustic reference clones under `.codex-artifacts/sine-repos/`

## Architecture Decision Captured

MINDEX Library is the shared NAS-backed catalog and memory layer. It is not one generic preview pane for every sensing file type.

Each sensing family gets a complete specialized app:

- SINE: acoustic files only.
- BlueSight: visual, optical, spectral, radar, LiDAR, radiation, Wi-Fi/Bluetooth sensing files.
- GANDHA: gas, VOC, VSC, smell, chemical blob, Bosch-style sensor files.
- Fungi Compute: fungal bioelectric / FCI / mycelium signal files.
- Future thermal and tactile apps should follow the same category-bound pattern.

Hard rule:

- SINE must not browse chemical, thermal, tactile, or visual files.
- GANDHA must not browse acoustic files.
- BlueSight must not browse gas files.
- Each app can read MINDEX Library, but only for its own category-specific file set.

## About Page Reference

The Mycosoft About page was used as the stack reference. It frames sensing as data sensors plus Fungi Compute, hydrophones, radar, VOC sensing, particle counters, Geiger detection, Wi-Fi sense, vibration, temperature/humidity, acoustic, optical, thermal, mechanical channels, and FCI. It links Fungi Compute + FCI, MINDEX, BlueSight, SINE, and GANDHA.

This is why the MINDEX Library tab should behave as a category-app launcher and not as a single generic all-file media preview.

## MAS / NLM Context Integrated

Cursor completed MAS-side integration notes:

- MAS has a `MindexLibraryClient`.
- MAS can pull MINDEX Library acoustic blobs and human tags for `acoustic_library` training data.
- MAS exposes a proxy on VM 188 for agents and n8n.
- Website hot path still uses MINDEX 189 / Website BFF. The SINE player should not suddenly route through MAS 188.

Important:

- Human tags and wave annotations now feed NLM training workflows.
- Model predictions and human corrections must stay side-by-side.
- Human correction should not erase model predictions.

## SINE Player Phase One Changes

`components/sensing/sine-acoustic-player.tsx`

Built / kept:

- Real MINDEX acoustic file browser.
- Acoustic-only data loader:
  - `/api/natureos/mindex/library?category=acoustic&limit=...`
- SINE status / visualisation / analysis endpoints:
  - `/api/mindex/sine/status`
  - `/api/mindex/sine/blobs/{id}/visualisation`
  - `/api/mindex/sine/blobs/{id}/analysis`
  - `/api/mindex/sine/blobs/{id}/analyze`
- Wave annotation and human identification paths:
  - `/api/natureos/mindex/library/wave-annotation`
  - `/api/natureos/mindex/library/human-identification`
- Real waveform/spectrogram canvas.
- Oscilloscope-style two-row knob bank.
- Selection / zoom / loop / reverse UI.
- Marker save UI.
- Human correction UI for wrong identifications.
- Signal stack categories beyond birds/rotors:
  - animal life
  - insects
  - air propellers
  - water propellers
  - impulse / explosions
  - ground / seismic
  - mechanical
  - weather / lightning
  - prototype / pattern
- Ground signal filter added after Air and before Short.
- SINE stack explorer:
  - L1 Physics DSP
  - L2 Deep / prototype
  - L3 Semantic heads
- Measurement rack:
  - centroid
  - average power
  - dB span
  - active band
  - cells
  - visible window
- `embedded` mode for rendering inside MINDEX Library.

## Signal Transcript Phase One Changes

Problem:

- MINDEX can return real detector events while `sound_transcripts` is empty.
- The UI previously showed an empty transcript panel even when analysis had real SINE detector events.

Change:

- If backend `sound_transcripts` exist, render them as `MINDEX transcript`.
- If backend transcripts are absent, derive `Real detector windows` from actual detector events only.
- Derived rows are explicitly marked `detector-derived`.
- No fake semantic labels are created.
- The active playhead card and canvas markers use the displayed transcript list.

Fields used for detector-derived windows:

- `label`
- `detector_id`
- `event_family`
- `event_type`
- `start_sec`
- `end_sec`
- `peak_sec`
- `frequency_hz`
- `frequency_min_hz`
- `frequency_max_hz`
- `confidence`
- `method`
- `model`
- `model_version`

Backend still needs to return first-class `sound_transcripts` later.

## MINDEX Library Tab Phase One Changes

`components/mindex/tabs/library-tab.tsx`

Change:

- Imported `SineAcousticPlayer`.
- Added `isSineCategory = activeCategory.id === "acoustic"`.
- When Acoustic is selected, the right-side Library workspace now renders:
  - `<SineAcousticPlayer embedded />`
- The older generic Library preview/details/right intake panels are not shown for Acoustic.
- Non-acoustic categories keep the existing Library player/file/details surface until their own complete apps are built.
- The outer Library header now tells the user that acoustic files, filters, and playback live inside SINE.

Intent:

- Acoustic should behave like the actual SINE app in MINDEX Library.
- Future BlueSight/GANDHA/Fungi Compute category apps should be embedded the same way.

## Backend / Cursor Context Preserved

MINDEX backend status from Cursor:

- 189 library APIs return real acoustic blobs.
- NAS-backed acoustic Library is mounted.
- ESC-50 and MBARI acoustic files are registered.
- SINE status reports 7 detectors.
- Wave annotations and human identifications persist.
- MAS can now consume MINDEX Library acoustic rows and human tags for NLM training.

Important backend follow-ups still needed:

- First-class `sound_transcripts` in analyze/classify responses.
- Higher-resolution waveform/spectrogram endpoints for long files.
- Windowed long-file analysis instead of blocking.
- Expanded `/api/mindex/sine/status` model registry.
- Real model weights / prototype banks for production classifiers.
- Keep all detector events normalized with:
  - `acoustic_domain`
  - `event_family`
  - `event_type`
  - `method`
  - `model_version`

## Verification Performed

Terminal:

- `GET http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=20`
  - returned `root_status: mounted`
  - returned `total_files: 2180`
  - returned real acoustic blobs from MBARI / ESC-50
  - returned NAS storage metadata
- `GET http://localhost:3010/api/natureos/mindex/library?category=acoustic&q=esc&limit=20`
  - returned `200`
  - returned `20` real ESC-50 rows from a `2000` result search set
- `POST http://localhost:3010/api/natureos/mindex/library/classify?id={esc50_blob_id}`
  - returned `200`
  - classified real file `1-100210-A-36.wav`
  - returned `identification_summary.top_label: bird_likely`
  - returned `12` frequency detections and `1` activity segment
- `GET http://localhost:3010/api/mindex/sine/status`
  - returned `status: ok`
  - returned `product: SINE`
  - returned `acoustic_blobs: 2180`
  - returned `detectors_registered: 7`
  - returned default detectors:
    - `frequency_fft`
    - `activity_auditok`
    - `bird_microsoft`
    - `uav_rotor`
    - `nps_discovery_match`
    - `deep_signal_features`
    - `visualisation_sonic`

TypeScript:

- `npx.cmd tsc --noEmit --pretty false`
- Passed with exit code `0`.
- The previous CREP blockers were fixed locally:
  - `app/dashboard/crep/CREPDashboardClient.tsx` now returns `aliases` from the Earth MYCA geocode helper.
  - `components/crep/layers/v3-overlays.tsx` now preserves `FacilityKind` typing through the filtered task list.

Production build:

- `npm.cmd run build`
- Passed with exit code `0`.
- Confirmed generated routes include:
  - `/sensing/sine/player`
  - `/natureos/mindex`
  - `/natureos/earth-simulator`
- Build produced environment warnings only. It did not fail.
- `next.config.js` was updated because Next 15 was resolving server chunks from the wrong folder during production build.

Browser, standalone SINE:

- Route tested:
  - `http://localhost:3010/sensing/sine/player`
- After waiting for NAS/API hydration:
  - `100 shown from 100 loaded`
  - selected real ESC-50 recordings from MINDEX/NAS
  - audio element exists
  - audio stream URL exists
  - audio `readyState: 4`
  - short ESC-50 clips report `5s` duration
  - waveform/spectrogram canvas exists
  - `Real detector windows` appears after saved analysis hydration
  - SINE stack panel appears
  - `Ground` filter appears after `Air` and before `Short`
  - signal stack categories include animal life, insects, air propellers, water propellers, impulse / explosions, ground / seismic, mechanical, activity, frequency, and pattern matches

Browser, embedded MINDEX Library:

- Route tested:
  - `http://localhost:3010/natureos/mindex`
- Opened Library.
- Acoustic category renders the embedded SINE player.
- It shows real acoustic files and the SINE signal stack.
- Generic duplicate file-category/intake panels are not shown for Acoustic.

Browser, Earth Simulator smoke:

- Route tested:
  - `http://localhost:3010/natureos/earth-simulator`
- Page loaded.
- Earth Simulator text and MYCA/device surfaces were present.
- Map canvas was visible.
- No further Earth Simulator edits should be made in this SINE handoff without the Earth agent.

## Known Phase One Caveats

Do not hide these in the deploy note.

1. Custom SINE play button still needs another pass.
   - Browser automation confirmed the audio element, stream URL, ready state, and duration.
   - The custom transport was changed to direct-bind the DOM button to the audio element.
   - Browser automation still could not conclusively prove media time advanced after clicking the custom button.
   - Human retest in the visible browser should be done before deploy if transport certainty is required.

2. Dev browser logged React runtime errors after hot reload:
   - `Cannot read properties of null (reading 'removeChild')`
   - `Should not already be working`
   - These appeared during hot reload / route retest. Recheck in a fresh browser tab before deployment.

3. Two CREP/Earth files were touched as shared deploy build unblockers.
   - Coordinate those exact changes with the Earth Simulator Codex agent before staging.
   - If the Earth agent has newer edits, re-run `tsc` and `npm.cmd run build` after merging the intended version.

4. This phase intentionally does not build BlueSight, GANDHA, Fungi Compute, thermal, or tactile full category apps.
   - It only establishes the category-app pattern and embeds SINE for Acoustic.

## Phase One Deploy Guidance

Bundle this with the Earth Simulator deploy only after:

1. Coordinate the two CREP TypeScript unblocker edits with the Earth Simulator agent.
2. Recheck `http://localhost:3010/sensing/sine/player`.
3. Recheck `http://localhost:3010/natureos/mindex` â†’ Library â†’ Acoustic.
4. Confirm the embedded SINE app loads 100 acoustic files.
5. Confirm Acoustic uses the SINE app and non-acoustic categories still use their own Library surfaces.
6. Human-click test the custom SINE transport.
7. Re-run TypeScript and production build after any Earth Simulator merge.

Recommended acceptance checks:

```powershell
Invoke-WebRequest -Uri "http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=5" -UseBasicParsing -TimeoutSec 45
Invoke-WebRequest -Uri "http://localhost:3010/api/mindex/sine/status" -UseBasicParsing -TimeoutSec 45
npx.cmd tsc --noEmit --pretty false
npm.cmd run build
```

Browser checks:

- `/sensing/sine/player`
  - file list loads
  - selected acoustic file exists
  - audio src exists
  - canvas renders
  - detector windows show after analysis hydration
- `/natureos/mindex`
  - Library tab opens
  - Acoustic category renders full embedded SINE app
  - non-acoustic category does not show SINE

## Phase Two Resume Prompt

Paste this when ready to continue:

```text
Continue SINE/MINDEX Library Phase Two from:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_MINDEX_LIBRARY_PHASE_ONE_HANDOFF_JUN05_2026.md

Do not stage or commit unless I explicitly approve.

First fix and verify the SINE custom play transport. The audio element loads real ESC-50 audio with readyState 4 and duration 5s, but the custom Play button still leaves it paused at 0s. Then verify embedded SINE inside /natureos/mindex Library > Acoustic. Keep SINE acoustic-only and preserve the category-app architecture for BlueSight, GANDHA, Fungi Compute, thermal, and tactile.
```
