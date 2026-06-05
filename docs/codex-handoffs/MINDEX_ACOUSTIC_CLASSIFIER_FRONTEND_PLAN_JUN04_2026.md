# MINDEX Library Acoustic Classifier - Frontend Plan and Handoff

Date: June 4, 2026  
Owner surface: `WEBSITE/website` frontend on `http://localhost:3010/natureos/mindex`  
Primary tab: MINDEX `Library`, category `Acoustic`  
Secondary route: `/sensing/sine/player`

## Clean Full-Context Packet

For the next ChatGPT/Cursor planning pass, use this newer clean packet first:

- `docs/codex-handoffs/SINE_ACOUSTIC_CLASSIFIER_FULL_CONTEXT_JUN04_2026.md`

That file condenses the current frontend state, Google AI Studio prototype intake, ChatGPT research prompt, external repository survey, Supabase/vector guidance, normalized event taxonomy, backend work list, API contract, acceptance tests, and paste-ready prompts.

This rolling handoff remains useful as detailed history, but the clean full-context packet is the preferred source for the next SINE classifier model plan.

## Scope

This handoff is acoustic-only.

Ignore chemistry, DNA computing, DWSIM, Cantera, molecular simulation, PubChem compound rendering, and all chemical-computer work for this pass. Those are separate MINDEX tracks and should not be mixed into the acoustic classifier plan.

The goal is to build a high-end acoustic identification app inside the MINDEX Library:

- Real NAS-backed acoustic files.
- Real audio playback from MINDEX stream APIs.
- Searchable, categorized file lists that do not become endless scrolling.
- Waveform, spectrogram, frequency, activity, and detection layers.
- Detector results for water, air, and ground recordings.
- A single SINE identification workflow that can classify and compare sounds.
- No mock clips, no fake results, no fake visualizations.

## June 4 Frontend Implementation Update

Codex has prepared the frontend for the acoustic-only classifier path.

Files updated for this pass:

- `components/sensing/sine-acoustic-player.tsx`
  - Rewritten as clean ASCII after a syntax/runtime issue.
  - Uses the working MINDEX Library catalog route for file discovery:
    - `/api/natureos/mindex/library?category=acoustic&limit=100`
  - Renders real acoustic rows from MINDEX/NAS when available.
  - De-dupes rows before render so duplicated backend blob IDs cannot generate React duplicate-key warnings.
  - Uses `cache: "no-store"`, request timeouts, and caught failures for Library, visualisation, analysis, and analyze requests so the player cannot sit forever on an unresolved loading state.
  - Auto-selects the smallest returned acoustic clip instead of the first backend row, because MBARI often returns 518 MB WAVs first.
  - Skips automatic visualisation/analysis preload for files larger than 75 MB; those large files still play and can be explicitly analyzed by the user.
  - Adds server-backed acoustic search against the Library BFF (`q=...`) so queries such as `esc` load ESC-50 rows instead of only filtering the first visible MBARI page.
  - Adds a clear-search icon button and native DOM event fallbacks for search and row selection.
  - Aggregates grouped detector arrays from analysis responses:
    - `frequency_detections`
    - `activity_segments`
    - `bird_detections`
    - `uav_detections`
    - `nps_detections`
    - `deep_signal_matches`
  - Keeps waveform/spectrogram blank with honest copy until backend visualisation data exists.
  - Fixes duplicate React keys when duplicate blob IDs come back from backend pages.
- `components/mindex/tabs/library-tab.tsx`
  - Adds `Run SINE classification` in the Acoustic player.
  - Calls `POST /api/natureos/mindex/library/classify?id={blobId}`.
  - Merges returned server detector groups into the selected file so detector lanes update immediately.
  - Normalizes backend event fields such as `start_sec`, `end_sec`, `peak_sec`, and `freq_hz`.
  - Fixes duplicate React keys in the Library file list.
- `app/api/natureos/mindex/library/route.ts`
  - De-dupes duplicate backend blob IDs before rows reach React.
  - Normalizes grouped detector arrays in Library rows.
- `app/api/natureos/mindex/library/classify/route.ts`
  - Adds a query-safe BFF wrapper for Cursor's new backend route:
    - `POST /api/mindex/library/blobs/{id}/classify`

Verification evidence gathered during this thread:

- Earlier, while `3010` was listening, `GET /sensing/sine/player` returned `200`.
- Earlier browser checks showed no runtime overlay and no duplicate-key warnings after the duplicate-key patch.
- Earlier `GET /api/natureos/mindex/library?category=acoustic&limit=100` returned 100 visible rows and preserved backend total `2180`.
- Earlier `GET /api/natureos/mindex/library?category=acoustic&limit=1000` returned 995 visible rows after de-duping duplicate IDs and preserved backend total `2180`.
- Current direct backend check from the website machine to `http://192.168.0.189:8000/api/mindex/library/blobs?category=acoustic&limit=5` returns 5 real rows and backend total `2180`.
- Current direct backend visualisation check on the first returned MBARI file, `MARS-20160128T000000Z-2kHz.wav`, timed out at 35 seconds; that file is 518,400,332 bytes, so large-file visualisation needs backend chunking/caching or frontend explicit-run behavior.
- Current `3010` check after Cursor brought the dev server back up:
  - `/sensing/sine/player` returns `200`.
  - Browser shows `Library (ready)` with `100 shown / 2,180 total`.
  - Browser console has no runtime errors, duplicate-key warnings, or warning/error logs during load, search, selection, or analyze.
  - Search `20160126` filters to one MBARI row.
  - Clear-search returns the visible file list to `100 shown / 2,180 total`.
  - Search `esc` calls backend-filtered Library data and shows ESC-50 files such as `1-100038-A-14.wav`.
  - The selected ESC-50 WAV stream resolves through `/api/natureos/mindex/library/file?id=...&remote_id=...`.
  - `GET /api/mindex/sine/blobs/{esc50-id}/visualisation` returns `200` with waveform data.
  - Browser `Run full SINE analysis` on the ESC-50 clip returns detector rows: bird, deep signal, frequency peaks, and activity.
  - `POST /api/natureos/mindex/library/classify?id={esc50-id}` returns grouped detector data in about 2.1 seconds.
- Current stream state: the local BFF file route honors byte-range requests for NAS-backed WAVs; large MBARI files are still intentionally kept out of immediate full analysis until backend long-window processing is ready.
- `npx.cmd tsc --noEmit --pretty false` reports only unrelated CREP errors:
  - `app/dashboard/crep/CREPDashboardClient.tsx(6878,9)` missing `aliases`.
  - `components/crep/layers/v3-overlays.tsx(999,11)` `kind` string not assignable to `FacilityKind`.

Current acoustic frontend limit:

- Playback and classification still depend on backend stream/classify stability.
- The UI is wired to call the new classify route, but the real button result must be proven after Cursor confirms `189:8000`, DB, SINE dependencies, and stream/classify are stable from the website host.

## June 4 SINE Player Upgrade - Current Codex Pass

Codex replaced the temporary player UI with a real-data SINE workbench in:

- `components/sensing/sine-acoustic-player.tsx`

What changed:

- The route now opens as a high-contrast cyan/black SINE workbench instead of a plain table/player page.
- The first load now uses `q=esc` and `limit=100` so the player starts on short ESC-50 clips that can actually play and analyze immediately.
- The app still shows the full reported SINE library count from the BFF (`2,180` acoustic files) while avoiding the current expensive `limit=500` path.
- `All loaded` clears the short-clip search and loads the broader MBARI catalog page without blanking the UI.
- File list is categorized/filterable by:
  - signal context: all, water, air, ground, short
  - source: e.g. `esc50`, `mbari_pacific_sound`
  - text search: source, file, sensor, label, path
- No mock rows, no generated clips, no fake transcripts, and no client-side pretend classifier results.
- The selected file header now shows source, sensor, path, size, inferred water/air/ground context, sample rate, and license.
- Audio playback uses the real `stream_url` returned by `/api/natureos/mindex/library`.
- Playback has custom controls and status while keeping the hidden HTML audio element as the real transport.
- The visualization is a single integrated timeline canvas:
  - spectrogram layer from backend `visualisation.spectrogram`
  - waveform envelope from backend `visualisation.waveform`
  - detector lane overlays from real SINE analysis events
  - playhead, hover cursor, time labels, and frequency labels
- Detector rows are normalized from grouped backend fields:
  - `frequency_detections`
  - `activity_segments`
  - `bird_detections`
  - `uav_detections`
  - `nps_detections`
  - `deep_signal_matches`
- The detector table now shows detector, label, confidence, time, frequency, and model/method.
- The signal-stack panel summarizes frequency peaks, activity segments, bird hits, rotor hits, and deep-signal matches.
- The transcript panel is wired to `sound_transcripts`, but it stays honestly empty until the backend returns real transcript windows.
- Long recordings over `25 MB` stream/play, but immediate full analysis is disabled in this player until long-window analysis/chunking exists.
- File browsing is bounded inside the left Library rail. Visible rows are grouped by source and inferred signal context so the page does not become an endless flat list.
- Detector lanes are bounded inside the lower analysis panel. Results are grouped by detector (`frequency_fft`, `activity_auditok`, `bird_microsoft`, `uav_rotor`, `nps_discovery_match`, `deep_signal_features`) and each detector group can collapse independently.
- The right-side transcript, human identification, signal stack, and recording detail panels now stay inside the workbench height on desktop instead of extending the full page downward.

## Human Identification Correction Requirement

Morgan added a critical active-learning requirement:

When SINE identifies a recording incorrectly, the operator must be able to correct it in the UI and save that correction as a human-tagged identification. Example: SINE says `UAV`, Morgan knows the sound is `lightning`. The system must store both:

- the model hypothesis and confidence at the time of review
- the human label, confidence, notes, and whether it disputes the model

The human tag must not erase the model result. The later training/evaluation system should compare human tags against model predictions because either side can be wrong. Disagreements should become high-value review/training samples.

Frontend work added:

- `components/sensing/sine-acoustic-player.tsx`
  - Adds a `Human identification` panel beside the selected recording.
  - Lets the user enter:
    - known sound label
    - category (`weather`, `marine_bioacoustics`, `terrestrial_bioacoustics`, `vessel`, `uav`, `mechanical`, `geophysical`, `unknown`)
    - human confidence
    - notes/evidence
    - whether the tag disputes the current SINE result
  - Sends the current model summary, selected file context, and current playback time with the human tag.
  - Does not fake a successful save.
- `app/api/natureos/mindex/library/human-identification/route.ts`
  - New Website BFF route.
  - Forwards:
    - `POST /api/natureos/mindex/library/human-identification`
    - to MINDEX:
    - `POST /api/mindex/library/blobs/{blob_id}/human-identification`

Backend work Cursor/new SINE agent must add:

```sql
CREATE TABLE IF NOT EXISTS library.acoustic_human_identification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  analysis_run_id uuid NULL,
  human_label text NOT NULL,
  human_category text NULL,
  human_confidence numeric NULL,
  human_notes text NULL,
  disputes_model boolean NOT NULL DEFAULT true,
  model_top_label text NULL,
  model_confidence numeric NULL,
  model_summary jsonb NULL,
  event_context jsonb NULL,
  file_context jsonb NULL,
  review_status text NOT NULL DEFAULT 'human_tagged_pending_model_review',
  training_eligible boolean NOT NULL DEFAULT true,
  created_by text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Required MINDEX routes:

- `POST /api/mindex/library/blobs/{id}/human-identification`
  - validates the blob is acoustic
  - stores the human tag and model snapshot
  - returns the saved row
- `GET /api/mindex/library/blobs/{id}/human-identifications`
  - returns human tags and model disagreements for the file
- `GET /api/mindex/sine/training/human-tags`
  - returns training-eligible human-tagged samples for model planning/export
- Optional:
  - `PATCH /api/mindex/library/blobs/{id}/human-identification/{tag_id}`
  - `POST /api/mindex/sine/training/export-human-tags`

Required behavior:

- Never overwrite `identification_summary` with the human tag.
- Store model and human labels side by side.
- Mark mismatches as contested samples.
- Include latest human tags in `GET /api/mindex/library/blobs/{id}` once implemented so SINE can display prior corrections.
- Later model training should use these as active-learning review samples, not blind truth labels.
- If the human tag says `lightning` but the model strongly says `UAV`, preserve both and queue it for verification against other evidence.

## Wave Editor Annotation Requirement

Morgan requested Edison-style wave editing behavior inside the SINE player:

- Select a region with two waveform clicks: start and end.
- Loop only the selected region.
- Play slower or faster with playback rate control.
- Preview the selected region in reverse for short clips.
- Zoom into the selected region and reset back to the full file.
- Clear the selection with a third left-click, right-click, or middle-click.
- Add named markers at the current playback cursor.
- Save selected regions, zoom state, marker labels, and playback flags to MINDEX.

Frontend work added:

- `components/sensing/sine-acoustic-player.tsx`
  - Adds region start/end selection to the waveform canvas.
  - Renders a translucent selected region and two region boundary lines.
  - Renders saved/unsaved marker flags on the canvas and marker chips below it.
  - Adds loop, reverse, playback speed, zoom region, reset zoom, clear, add marker, and save wave notes controls.
  - Uses the selected region for loop playback and reset behavior.
  - Uses Web Audio for real reverse playback of short selected clips instead of faking reverse with a visual-only cursor.
  - Keeps long files honest: long MBARI files can stream normally, but expensive reverse decode remains limited to short clips.
- `app/api/natureos/mindex/library/wave-annotation/route.ts`
  - New Website BFF route.
  - Forwards:
    - `POST /api/natureos/mindex/library/wave-annotation`
    - to MINDEX:
    - `POST /api/mindex/library/blobs/{blob_id}/wave-annotation`

Backend work Cursor/new SINE agent must add:

```sql
CREATE TABLE IF NOT EXISTS library.acoustic_wave_annotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blob_id uuid NOT NULL REFERENCES library.blob(id) ON DELETE CASCADE,
  analysis_run_id uuid NULL,
  selection jsonb NULL,
  zoom jsonb NULL,
  markers jsonb NOT NULL DEFAULT '[]'::jsonb,
  loop_enabled boolean NOT NULL DEFAULT false,
  reverse_enabled boolean NOT NULL DEFAULT false,
  playback_rate numeric NOT NULL DEFAULT 1,
  file_context jsonb NULL,
  created_by text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Required MINDEX routes:

- `POST /api/mindex/library/blobs/{id}/wave-annotation`
  - validates the blob is acoustic
  - validates selection times are within file duration when duration is known
  - stores region, marker, zoom, and playback metadata
  - returns the saved annotation row
- `GET /api/mindex/library/blobs/{id}/wave-annotations`
  - returns prior regions and markers for the selected file
- Optional:
  - `PATCH /api/mindex/library/blobs/{id}/wave-annotation/{annotation_id}`
  - `DELETE /api/mindex/library/blobs/{id}/wave-annotation/{annotation_id}`

Required behavior:

- Do not store wave annotations as frontend-only state.
- Region and marker annotations should be available to later classifier training, review queues, and transcript alignment.
- Markers can become supervised event windows when they include human labels such as `lightning strike`, `propeller pass`, `bird call`, or `whale sweep`.
- Keep model detections, human identification tags, and wave annotations separate but joinable by `blob_id` and `analysis_run_id`.

Why `limit=100` is intentional:

- Browser and terminal testing showed `/api/natureos/mindex/library?category=acoustic&limit=500` can take about 13 seconds and return the storage-connected fallback with no `blobs`.
- `/api/natureos/mindex/library?category=acoustic&limit=100&q=esc` returns real ESC-50 rows.
- `/api/natureos/mindex/library?category=acoustic&limit=100` returns real MBARI rows.
- The frontend therefore loads fast, useful slices and lets the user switch sources instead of making the first screen wait on a heavy catalog request.

Verification from this pass on `http://localhost:3010/sensing/sine/player`:

- Browser reload showed no Next build overlay and no compile/runtime error text.
- Header showed:
  - NAS free space: `7346.7 GB free`
  - Library: `2,180 files`
  - Detectors: `7 active`
- ESC-50 short-clip page showed `100 shown from 100 loaded` with real WAV rows.
- Selected audio element state before play:
  - stream URL: `/api/natureos/mindex/library/file?id=...&remote_id=...`
  - `readyState: 4`
  - `duration: 5`
  - `error: null`
- After pressing the custom play button:
  - `paused: false`
  - `currentTime` advanced to about `1.8s`
  - same stream URL
  - no audio error
- Pressing `Run SINE analysis` from the browser returned real detector rows:
  - `Bird Likely`
  - `Frequency` peaks around `3.25-3.40 kHz`
  - `Activity`
  - `NPS`
  - `UAV`
  - `Deep Signal`
- The detector table showed 15 relevant rows in the tested run.
- The transcript panel remained in the empty state because the current backend response does not yet include `sound_transcripts`.
- Clicking `All loaded` loaded real MBARI rows, including `mbari_pacific_sound / hydrophone / water`, without falling into the empty fallback.
- `npx.cmd tsc --noEmit --pretty false` reports no SINE errors. It still reports existing unrelated CREP errors:
  - `app/dashboard/crep/CREPDashboardClient.tsx(6878,9)` missing `aliases`
  - `components/crep/layers/v3-overlays.tsx(1006,11)` `kind: string` not assignable to `FacilityKind`

Current frontend constraints:

- The SINE canvas pixel check could not use `getContext()` from the in-app browser evaluation sandbox, but browser screenshot verification showed detector rows and the SINE workbench rendering.
- The player does not invent `sound_transcripts`; the backend must return them.
- The player does not compute 512D embeddings locally; the backend must return deep-signal/prototype matches.
- The player does not run long MBARI analysis in-browser; backend chunking/windowing is needed for long recordings.
- The player does not show fake model names or fake classifier state; it only displays returned detector/model/method strings.

## June 4 High-Definition Scope Patch

Codex also added a higher-resolution SINE scope layer to `components/sensing/sine-acoustic-player.tsx`.

This is frontend visualization work only. It does not claim new model intelligence. It makes the real backend waveform, spectrogram, and detector output easier to inspect.

Added controls:

- Scope mode:
  - `Overlay`
  - `Spectrogram`
  - `Waveform`
- Visualization toggles:
  - grid
  - frequency peak labels
  - detector lanes
- Palette selector:
  - marine cyan
  - plasma
  - thermal
- Wave gain selector:
  - `0.5x`
  - `1x`
  - `2x`
  - `4x`
  - `8x`

Added scope readouts:

- dominant frequency
- visible frequency range
- dynamic range / power range
- FFT peak count

Rendering upgrades:

- Canvas backing resolution increased to `1800 x 560`.
- Major and minor oscilloscope-style grid lines were added.
- Spectrogram and waveform can be inspected separately or as an overlay.
- Frequency peak markers can be labeled directly on the canvas.
- Detector lanes remain optional so dense analysis output does not bury the waveform.

Browser verification from the active `3010` SINE route:

- Header showed NAS free space, 2,180 acoustic files, and active SINE detectors.
- ESC-50 clip `1-100038-A-14.wav` loaded as the selected short clip.
- The canvas rendered waveform and spectrogram output from real backend visualisation data.
- Toggling spectrogram-only mode, peak labels, thermal palette, and wave gain updated the visible scope without a build overlay.
- `npx.cmd tsc --noEmit --pretty false` still reports no SINE TypeScript errors; remaining TypeScript failures are the unrelated CREP errors listed above.

## June 4 Cursor Annotation Backend Completion

Cursor deployed the persistence layer that the SINE frontend was already calling.

Reported MINDEX backend commits:

- `b340465` - API/tables/routes for wave annotations and human identifications.
- `92ee960` - completion documentation.

Reported deployed backend pieces on MINDEX VM `192.168.0.189`:

- Tables:
  - `library.acoustic_wave_annotation`
  - `library.acoustic_human_identification`
- Migration:
  - `migrations/20260604_library_wave_human_annotations_jun04_2026.sql`
- Logic:
  - `mindex_api/services/library_annotations.py`
- Routes:
  - `POST /api/mindex/library/blobs/{id}/wave-annotation`
  - `GET /api/mindex/library/blobs/{id}/wave-annotations`
  - `POST /api/mindex/library/blobs/{id}/human-identification`
  - `GET /api/mindex/library/blobs/{id}/human-identifications`
  - `GET /api/mindex/library/blobs/{id}` now includes:
    - `wave_annotations`
    - `human_identifications`
    - `latest_human_identification`

Reported verification:

- VM `POST .../wave-annotation`: `200`, `status: saved`
- `localhost:3010` BFF wave save: `200`
- `localhost:3010` BFF human-identification: `200`
- `http://localhost:3010/sensing/sine/player`: `200`

Codex frontend compatibility patch after Cursor completion:

- `app/api/natureos/mindex/library/wave-annotation/route.ts`
  - keeps the existing POST passthrough
  - adds GET passthrough for saved wave notes
  - tries plural `wave-annotations` first and singular `wave-annotation` as a fallback
- `app/api/natureos/mindex/library/human-identification/route.ts`
  - keeps the existing POST passthrough
  - adds GET passthrough for saved human identifications
  - tries plural `human-identifications` first and singular `human-identification` as a fallback
- `app/api/natureos/mindex/library/route.ts`
  - maps backend `wave_annotations`
  - maps backend `human_identifications`
  - maps backend `latest_human_identification`
- `lib/mindex/library-files.ts`
  - extends `MindexLibraryBlob` with saved annotation and human-tag fields
- `components/sensing/sine-acoustic-player.tsx`
  - hydrates saved region/markers from backend annotations when a recording is selected
  - marks loaded markers as saved
  - shows a saved wave-note summary near the marker controls
  - reads saved human tags and shows the latest human tag beside the current SINE result
  - updates the local saved-record view immediately after successful save responses

## June 4 Signal Context Update

Morgan added a required acoustic context:

- `Ground`

The SINE signal filter now reads:

1. All
2. Water
3. Air
4. Ground
5. Short

Ground recordings cover:

- underground sound
- seismic acoustic data
- soil recordings
- surface-ground sensors
- geophones
- ground-contact sensors

Frontend inference now classifies a file as `ground` when metadata/source/path includes:

- `ground`
- `soil`
- `underground`
- `seismic`
- `geophone`
- `surface`

Backend/model work should add an explicit `acoustic_environment: "ground"` value for soil, underground, seismic, and surface recordings instead of relying on frontend inference.

Verification:

- Browser reload on `http://localhost:3010/sensing/sine/player` showed no build/runtime overlay.
- Signal filter rendered in the required order: `All`, `Water`, `Air`, `Ground`, `Short`.
- Clicking `Ground` safely filtered the current ESC-50 page to zero rows because those files are air/environmental microphone clips.
- The selected recording, player, analysis summary, and scope canvas remained mounted while Ground had no matching files.
- The filter was restored to `Short` after verification.

## June 4 Signal Stack Taxonomy Update

Morgan clarified that the Signal stack must not be limited to birds and generic rotor hits. SINE must represent the full acoustic domain across air, water, and ground.

Frontend display update:

- The Signal stack now groups real returned detector events into broader acoustic categories:
  - `Animal life`
  - `Insects`
  - `Air propellers`
  - `Water propellers`
  - `Impulse / explosions`
  - `Ground / seismic`
  - `Activity`
  - `Frequency`
  - `Pattern matches`
- Counts still come only from real detector events returned by MINDEX/SINE. The UI does not invent detections.
- Current heuristic grouping reads real event `detector_id`, `label`, `category`, `engine`, `model`, and metadata text. Backend should replace this with explicit normalized `event_family` / `acoustic_domain` fields.

Backend/model requirement:

- Add a normalized acoustic taxonomy to every event:
  - `acoustic_domain`: `air`, `water`, `ground`, or `unknown`
  - `event_family`: one of:
    - `animal_life`
    - `insect`
    - `air_propeller`
    - `water_propeller`
    - `vessel_engine`
    - `uav`
    - `aircraft`
    - `impulse_explosion`
    - `weather_lightning`
    - `earthquake_seismic`
    - `geophysical`
    - `mechanical`
    - `frequency_peak`
    - `activity_segment`
    - `unknown_pattern`
  - `event_type`: specific label such as `bird_call`, `whale_sweep`, `dolphin_click`, `cricket_stridulation`, `quadrotor_blade_pass`, `boat_cavitation`, `lightning_strike`, `earthquake_tremor`, `explosion_impulse`, `unknown_repeating_tone`.
- Add dedicated detector heads or adapters for:
  - broad animal bioacoustics, not only birds
  - insect sounds
  - marine mammal and underwater animal sounds
  - UAV/quad/helicopter/airplane propellers
  - vessel/boat/submarine/cavitation propellers
  - explosions, lightning, thunder, gunshot, and pressure-wave impulses
  - earthquake, geophone, soil, underground, and surface-ground vibrations
  - recurring unknown patterns
- SINE transcripts should explain these physical events in chronological windows.

## June 4 Oscilloscope Control Update

Morgan clarified that SINE must behave like an inspection instrument, not a fixed waveform preview. The user needs to tune the waveform and spectrogram the way an operator tunes an oscilloscope or signal analyzer.

Frontend update in `components/sensing/sine-acoustic-player.tsx`:

- Added tunable scope controls:
  - visual mode: overlay, spectrogram, waveform
  - grid toggle
  - peak marker toggle
  - detector lane toggle
  - spectrogram palette
  - time width / magnification
  - frequency low cutoff
  - frequency high cutoff
  - waveform gain
  - waveform height
  - spectrogram contrast
  - spectrogram opacity
  - canvas/scope height
  - playback volume
  - detector lane row density
- The canvas backing resolution was increased and the rendered height is adjustable.
- Frequency controls now window the spectrogram and hide peak markers outside the selected frequency range.
- Time width changes the current viewport around the playhead, while the existing region zoom still works.
- Waveform gain and playback volume are separate:
  - waveform gain changes visual amplitude
  - playback volume changes what the operator hears
- Saved wave annotations now include a `scope` payload so backend/MYCA can persist how a signal was inspected.

Continuation update:

- The SINE canvas cursor now reports both time and frequency under the pointer.
- The SINE canvas cursor now also reports normalized waveform amplitude at the pointer when waveform data is available.
- The visible scope stats now include seconds-per-division and Hz-per-division.
- The waveform renderer now uses per-pixel min/max buckets with an average trace instead of a simple point polygon. This preserves detail at dense zoom levels and behaves more like an oscilloscope/audio editor envelope.
- The scope can export the current waveform/spectrogram/detection view as a PNG for review, reports, and handoffs.
- The scope includes optional acoustic band guides over the real spectrogram:
  - ground / seismic
  - rumble / engines
  - calls / voice band
  - animal / machine detail
  - high insect / ultrasonic edge
- The spectrogram includes an intensity legend derived from the selected recording's real spectrogram matrix. These are visual inspection aids only; they are not classifier detections.
- The scope now labels frequency ticks, time ticks, and normalized waveform amplitude directly on the canvas so the player reads more like an oscilloscope or audio editor instead of a decorative preview.
- The scope now supports instrument-style wheel interaction:
  - normal wheel zooms the visible time window around the cursor
  - Shift+wheel pans the visible time window
  - Alt+wheel tightens or widens the visible frequency window around the cursor
- Wheel-based time zoom is stored in the same wave-annotation `zoom` field, and frequency-window changes are stored in the existing `scope.frequency_min_hz` / `scope.frequency_max_hz` fields when the operator saves wave notes.
- The right rail now includes `Window measurements`, computed only from the visible `visualisation.spectrogram.power_db` cells:
  - spectral centroid
  - average power
  - min/max dB range
  - sampled spectrogram cell count
  - band power bars for ground/seismic, rumble/engines, calls/voice, animal/machine detail, and high insect/ultrasonic edge
- These measurements are not classifier labels. They are physical readouts from the current scope window and should be considered operator/science instrumentation.
- Detector table rows are now selectable. The right rail includes `Event inspector`, which shows the selected detector event or the event nearest the current playhead:
  - detector label
  - detector family
  - confidence
  - time window
  - anchor time
  - frequency
  - category/model/method metadata when returned by MINDEX
- This inspector is for human review and model debugging. It must never invent labels; it only reflects detector events returned by the SINE backend.
- Human identification saves now include detector-event review context when a detector event is selected or active under the playhead:
  - `event_context.current_time_sec`
  - `event_context.detector_event`
  - `detector_event_key`
  - `detector_event`
  - `file_context.detector_event`
- `file_context.detector_event` is included because the current MINDEX backend already persists `file_context`; Cursor should promote this into first-class event context fields once stable `event_id` values exist.
- The player includes a native browser audio control bound to the same selected NAS stream as the custom transport. Keep this fallback because large and browser-specific media paths are easier to validate through native controls.
- The custom Play/Pause control now gives immediate playback feedback and reports when the browser context cannot expose native audio playback methods. Do not treat that message as a missing NAS stream if the audio element is loaded and the file endpoint returns WAV bytes.
- The custom transport now reconciles missed `loadedmetadata` / `canplay` events by checking the audio element's current ready state. This prevents the control from staying on "Loading audio metadata..." after the WAV is already decoded.
- The right-side analysis rail now renders real `deep_signal_matches` as "Prototype matches".
- The right-side analysis rail now renders real `diagnostics` as "Analysis diagnostics".
- These panels must stay empty-state only when the classifier has not returned those fields. Do not synthesize prototype matches or diagnostics in the frontend.

Current 3010 verification from Codex:

- `GET /api/natureos/mindex/library?category=acoustic&limit=100&q=esc` returns real ESC-50 rows from the NAS-backed library.
- Empty/all-file library requests can currently report a nonzero acoustic count while returning no rows. The frontend now falls back to a short playable acoustic query so the player does not open empty.
- A real ESC-50 clip (`1-100038-A-14.wav`) loaded with a native audio control and real stream URL.
- Running SINE analysis from the UI returned 17 real detector events:
  - 12 frequency peaks
  - 1 activity segment
  - additional grouped detector events
- That same analysis did not return `sound_transcripts`, `deep_signal_matches`, or `diagnostics`; those remain backend/model work and should not be faked in the frontend.

Backend/MYCA requirement:

- Persist the `scope` object on wave annotations:
  - `visual_mode`
  - `time_magnification`
  - `frequency_min_hz`
  - `frequency_max_hz`
  - `waveform_gain`
  - `waveform_height`
  - `spectrogram_palette`
  - `spectrogram_contrast`
  - `spectrogram_opacity`
  - `scope_height_px`
  - `lane_rows`
  - `grid_enabled`
  - `band_guides_enabled`
  - `peaks_enabled`
  - `lanes_enabled`
- These controls should also become backend query parameters for visualisation generation so MINDEX can return pre-windowed / pre-rendered waveform and spectrogram data for long files.
- Backend should eventually expose the same window measurements server-side for large files and MYCA/NLM automation:
  - `window_start_sec`
  - `window_end_sec`
  - `frequency_min_hz`
  - `frequency_max_hz`
  - `spectral_centroid_hz`
  - `avg_db`
  - `min_db`
  - `max_db`
  - `cell_count`
  - `band_measurements[]`
- Backend should include stable event IDs in every SINE detector event so the frontend can persist selections, review decisions, and human corrections against exact events instead of generated frontend keys:
  - `event_id`
  - `analysis_run_id`
  - `detector_id`
  - `event_family`
  - `start_sec`
  - `end_sec`
  - `peak_sec`
  - `frequency_hz`
  - `confidence`
  - `model`
  - `metadata`
- Backend human-identification persistence should stop dropping rich `event_context`; it should store the posted event context directly and join it to the matching detector event when `event_id` / `detector_event_key` is present.

## June 4 MYCA / Nature Learning Model Automation Requirement

Morgan clarified that SINE is not only a human player. The same tools are beneficial to the Nature Learning Model and MYCA, which must be able to run detection, interaction, and identification classification automatically even when no human is using the UI.

Backend/MAS/MYCA requirements:

- Add an automated SINE analysis queue for new acoustic library blobs.
- Trigger analysis when:
  - a file lands in the NAS acoustic library
  - a human saves a wave annotation
  - a human saves a corrected identification
  - MYCA/NLM requests re-analysis for training or review
- Store model detections, sound transcripts, embeddings, visualisation summaries, and human corrections as first-class MINDEX records.
- Return `deep_signal_matches` and `diagnostics` consistently from analyze/classify responses so the frontend can render:
  - matched prototype label
  - similarity score
  - prototype/source/category
  - segment start/end
  - model or embedding version
  - distance when available
  - latency/sample-rate/channel/window diagnostics
- Expose analysis status to MYCA/NLM:
  - not analyzed
  - queued
  - running
  - ready
  - needs human review
  - model/human disagreement
  - failed with reason
- MYCA should be able to ask MINDEX for:
  - unseen acoustic files
  - files with low confidence
  - files with human/model disagreement
  - files similar to a selected acoustic fingerprint
  - new files for a device, source, environment, species, vessel, or seismic context
- Human corrections must not overwrite model outputs. They become labeled training and review evidence.

## External Acoustic Code Audit - June 4

Morgan asked Codex to actually inspect the acoustic repositories instead of naming them as inspiration. Codex cloned or downloaded these references into a temporary local audit folder and inspected the usable code paths. None of these repos should be blindly copied into MINDEX. They should be adapted as licensed, reproducible backend modules or model-training references.

Temporary audit folder used by Codex:

- `C:\Users\Owner1\AppData\Local\Temp\codex-sine-acoustic-repos`

### AI Studio SINE Prototype

Local prototype path:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier`

Useful frontend/spec pieces:

- `src/types.ts`
  - Clean target response shape:
    - `identification_summary`
    - `activity_segments`
    - `frequency_detections`
    - `bird_detections`
    - `uav_detections`
    - `nps_detections`
    - `deep_signal_matches`
    - `sound_transcripts`
    - `diagnostics`
- `src/components/AcousticPlayer.tsx`
  - Good layout ideas for a chronological sound-transcript panel, detector timeline lanes, deep-signal match cards, and top identification summary.
- `src/components/ModelExplorer.tsx`
  - Good explanation structure for SINE as a layered engine:
    - Layer 1: deterministic DSP
    - Layer 2: deep embedding
    - Layer 3: semantic detector heads / prototype bank
- `src/components/SINEStatus.tsx`
  - Good compact detector readiness/status pattern.
- `src/App.tsx`
  - Useful high-level two-mode console idea: Library workbench plus model/architecture explainer.
  - Do not copy its fixed telemetry strings or fake system-load values into production.

Do not use as production classifier:

- The prototype `src/data/acousticData.ts` contains mock acoustic blobs. Do not copy those rows into MINDEX or the Website.
- The prototype `server.ts` uses generated/mock audio paths, synthetic WAV generation, fake storage totals, and Gemini-style JSON generation from metadata. That is not acceptable for production MINDEX classifier output.
- Any mock WAV generation, synthetic waveform/spectrogram generation, fake file count, fake storage count, or fabricated classification output must stay out of the production Website and MINDEX backend.
- Gemini, MYCA, or any other language model may explain, summarize, or help triage detector output after real analysis exists. They must not invent detector lanes, confidence, sound transcripts, or prototype matches from filenames or metadata.
- The useful part is the contract and UI organization, not the simulated analysis.

### Fungi Compute Visualizer References

Website files inspected:

- `components/fungi-compute/oscilloscope.tsx`
- `components/fungi-compute/stft-spectrogram.tsx`
- `components/fungi-compute/spectrum-analyzer.tsx`
- `components/fungi-compute/signal-fingerprint.tsx`
- `components/fungi-compute/pattern-timeline.tsx`

Useful rendering patterns now partially adapted into SINE:

- resize-aware canvas rendering
- oscilloscope grid and cursor concepts
- separate waveform and spectrogram inspection modes
- FFT peak markers
- spectrum/waterfall-style display thinking
- scoped stats/readouts near the canvas
- cursor/crosshair-style inspection readouts
- compact pattern timelines for event history
- exportable inspection state and saved review context

Do not copy:

- Fungi Compute biological terminology and fungal electrical labels should not leak into SINE. SINE is acoustic: hydrophone, transducer, microphone, geophone, water, air, ground, frequency, waveform, spectrogram, detector lane, source, event.
- `signal-fingerprint.tsx` currently includes simulated fungal species signatures. SINE must not use simulated species signatures; acoustic fingerprints must come from real decoded files, model embeddings, stored prototypes, or human tags.

### Repository Audit Table

| Source | What Codex inspected | Useful SINE integration | Production cautions |
| --- | --- | --- | --- |
| `IBM/MAX-Audio-Classifier` | `README.md`, `app.py`, `core/model.py` | Strong model-serving reference for a general AudioSet head. Uses VGGish embeddings, PCA/quantization, a classifier over 527 AudioSet labels, top-k post-processing, and a deployable API wrapper. Useful as the general environmental sound head or as an ONNX/Torch-compatible replacement target. | Old TensorFlow/Keras/MAX stack. Do not drop this directly into the API container unless dependency compatibility and licensing are reviewed. Prefer an adapter or modern ONNX/PyTorch equivalent. |
| `daisukelab/sound-clf-pytorch` | `README.md`, `src/models.py`, `src/libs.py`, `src/augmentations.py` | Best PyTorch training reference in this batch. Uses 5-second log-mel windows, 64 mel bins, split-all inference for long files, ResNetish/VGGish-style adaptive pooling, Lightning training, mixup, normalization, and spectrogram augmentation. Good foundation for SINE windowed model training and long MBARI chunk aggregation. | Tutorial repo, not a ready MINDEX service. Needs model weights, dataset registration, export path, evaluation, and reproducible packaging. |
| `ksanjeevan/crnn-audio-classification` | `README.md`, `crnn.cfg`, `config.json`, `run.py`, `net/model.py`, `net/audio.py`, `eval/infer.py`, `data/transforms.py` | Important temporal-model reference. Uses variable-length audio, GPU mel-spectrogram computation, 128-band mel features, spectrogram whitening, phase-vocoder time stretching, CNN feature extraction, 2-layer bidirectional LSTM, packed padded sequences, and fold metrics. This should inform SINE's temporal event classifier for propellers, animal calls, insects, impulses, seismic windows, and long hydrophone clips. | UrbanSound8K scope and torchparse dependency; not a plug-and-play production service. Needs modern packaging, trained SINE weights, ONNX/TorchScript export, and MINDEX event taxonomy mapping. |
| `daisukelab/ml-sound-classifier` | `README.md`, `realtime_predictor.py`, `lib_train.py`, `sound_models.py` | Useful for live/edge audio flow: PyAudio chunk queue, log-mel conversion per chunk, prediction smoothing with a rolling geometric mean, MobileNetV2/AlexNet lightweight models, samplewise normalization, and Raspberry Pi style deployment. Good fit for Jetson/buoy live-stream inference and local device buffering. | Old TensorFlow 1/Keras stack. Use the architecture ideas and smoothing pattern; rebuild with current runtime for MINDEX. |
| `GorillaBus/urban-audio-classifier` | `README.md`, `include/helpers.py` | Useful preprocessing and taxonomy reference for terrestrial/urban events: MFCC, log-mel, STFT, normalization, class/fold metadata, precision/recall/F1 reporting, augmentation concepts. Helps SINE distinguish everyday air-side event classes from nature/marine classes. | Mostly notebooks and educational code. Not production service code. |
| `imfing/audio-classification` | `README.md`, `feat_extract.py`, model scripts | Useful compact classical feature extractor: MFCC, chroma, mel, spectral contrast, tonnetz, plus SVM/MLP/CNN baselines. Good for explainable diagnostic vectors and low-cost similarity tests when deep models are not ready. | Older Python/Keras conventions and small ESC-10/ESC-50 demo scope. Use as feature inspiration, not as the final classifier. |
| `abishek-as/Audio-Classification-Deep-Learning` | `README.md`, `AudioClassification/functions.py` | Demonstrates ANN/CNN1D/CNN2D comparison, MFCC-based file prediction, Django upload wrapper, and model-comparison reporting. Useful only as a reminder that SINE should record model family, latency, and prediction-time diagnostics. | Demo web app with `.h5` assets and older dependencies. Do not integrate directly into MINDEX. |
| `braydenoneal/neural-audio-classification` | `README.md`, `src/spectrogram.py`, `src/neural_network.py`, `src/predict.py` | Useful for spectrogram-as-image workflow and simple TorchScript save/load pattern. The README also catalogs FFT, wavelet, CWT, and synchrosqueezing references for future advanced time-frequency work. | Spoken-digit dataset scope is not SINE's target. The sample code uses fixed images and toy labels. Use only the TorchScript and visual-feature idea. |
| `ilge/gmtk-audio-classification` | `README.md`, git tree | Useful temporal decoding reference: HMM/Gaussian-mixture event smoothing, AFTE filterbank temporal envelopes, ranked discriminative features, and online decoding designed to reduce false positives from intermittent sounds. Relevant to SINE detector lanes and confidence smoothing for lightning, impulse, propeller, and activity segments. | Windows checkout has invalid-path files; it is old GMTK/Bayesian code. Use as a temporal smoothing/state-machine design reference, not as a direct dependency. |
| OVH marine sound classification notebook | `notebook-marine-sound-classification.ipynb` | Direct marine classifier reference using Watkins-style marine mammal folders, 30-second Librosa feature extraction, spectral centroid/bandwidth/rolloff/zero-crossing/MFCC stats, label encoding, and a 45-class classifier. Useful for SINE marine bioacoustics head and whale/dolphin/seal taxonomies. | Notebook/tutorial. Needs dataset licensing, real model training, and evaluation before production use. |

### Existing Acoustic References Already In The Plan

These remain required acoustic-only integrations:

- `dimastatz/deep-signal`
  - Use for deep signal / pattern-identification foundations.
  - Required production output: embedding or pattern-match events in `deep_signal_matches`.
- `pschatzmann/arduino-audio-tools` frequency detection reference
  - Use for deterministic frequency detection behavior.
  - Required production output: dominant frequency, confidence, method metadata, time window.
- `microsoft/acoustic-bird-detection`
  - Use for bird detector model path.
  - Required production output: bird likelihood, species/group when possible, model version, confidence.
- `amsehili/auditok`
  - Use for activity segmentation.
  - Required production output: activity windows that drive later classifier windows.
- `pcasabianca/Acoustic-UAV-Identification`
  - Use for UAV/rotor acoustic detection.
  - Required production output: rotor harmonic / UAV labels, confidence, harmonic evidence.
- `nationalparkservice/acoustic_discovery`
  - Use for nature acoustic discovery labels and reference library.
  - Required production output: NPS-style match events and source metadata.

### Production SINE Architecture Required From The Audit

The next SINE backend/model pass should build this as a real pipeline:

1. Library blob selection:
   - Read `library.blob` acoustic rows.
   - Resolve stream path without exposing NAS paths.
   - Preserve source, label, environment, sample rate, duration, codec, license, hash, and manifest ID.
2. Decoder and normalizer:
   - Decode WAV now and support FLAC/MP3/future containers.
   - Normalize to float arrays.
   - Preserve channels and sample-rate diagnostics.
   - Support range/window decode for long files.
3. Windowing:
   - Use short windows for ESC-50 and rolling windows for MBARI/long hydrophone files.
   - Default model windows should support 5 seconds and 30 seconds, with overlap.
   - Long files must use async chunked jobs, not blocking 3010 or the browser.
4. Deterministic DSP:
   - FFT peaks.
   - STFT/spectrogram.
   - spectral centroid.
   - spectral bandwidth.
   - rolloff.
   - zero-crossing rate.
   - RMS/activity.
   - impulse/shock detection.
   - rotor harmonic detection.
   - AFTE/filterbank envelope features for temporal events.
5. Activity segmentation:
   - Use Auditok-style regions before expensive classifiers.
   - Each event window must have `start_sec`, `end_sec`, `confidence`, and method metadata.
6. Deep embeddings:
   - Target 512D SINE embedding space.
   - Store model version, window bounds, vector quality, and environment.
   - Compare by cosine similarity against a prototype catalog.
7. Detector heads:
   - General AudioSet/environmental sound head.
   - Broad animal bioacoustics head.
   - Insect sound head.
   - Bird head.
   - UAV/rotor head.
   - Aircraft/helicopter/air-propeller head.
   - Marine mammal / hydrophone head.
   - Water propeller / vessel / submarine / cavitation head.
   - Impulse/lightning/explosion/geophysical head.
   - Ground/seismic/geophone head.
   - Unknown recurring fingerprint head.
8. Temporal model head:
   - Add a CRNN-style model path for event sequences.
   - Candidate shape from audited repo:
     - mel spectrogram front-end
     - CNN feature extractor
     - bidirectional LSTM or comparable temporal model
     - packed/window-aware sequence handling
     - confidence smoothing over time
   - Use this for signals where time evolution matters: whale sweeps, dolphin clicks, insects, rotor blade-pass patterns, cavitation, lightning/explosion impulses, earthquake tremors, and unknown repeating patterns.
9. Model registry and weights:
   - Store model artifacts under `/mnt/nas/mindex/models/acoustic/`.
   - Track:
     - `model_id`
     - `model_family`
     - `model_version`
     - `input_sample_rate_hz`
     - `window_sec`
     - `hop_sec`
     - `label_space`
     - `event_family` coverage
     - `training_dataset_manifest_id`
     - `metrics`
     - `artifact_path`
     - `created_at`
   - Prefer TorchScript or ONNX for stable serving. Do not depend on notebook-only code.
10. Prototype catalog:
   - Store curated prototypes for known species, natural events, mechanical events, vessel/propeller signatures, and recurring unknowns.
   - Use Postgres/pgvector or the agreed MINDEX/Supabase vector layer, but frontend access must stay through MINDEX APIs.
   - Supabase connector check on June 4 showed an active healthy project named `Mycosoft.com Production`; if Supabase is used, the backend should still expose a MINDEX-owned API facade and keep secrets/server credentials out of the UI.
   - Required prototype fields:
     - `prototype_id`
     - `label`
     - `event_family`
     - `acoustic_domain`
     - `source_dataset`
     - `embedding`
     - `embedding_model_version`
     - `confidence_calibration`
     - `license`
     - `review_status`
11. Temporal smoothing:
   - Use rolling prediction queues and/or HMM-style smoothing to avoid one-frame false positives.
   - Preserve contested cases for human review.
12. Sound transcripts:
   - Produce chronological physical event descriptions, not spoken-language transcripts.
   - Example concepts: low-frequency whale sweep, broadband impulse, propeller blade-pass harmonic, cavitation band, bird chirp burst, insect tonal pulse, lightning strike, ambient hydrophone bed.
13. Persistence:
   - Store analysis runs, events, visualisation summaries, embeddings, prototype matches, sound transcripts, wave annotations, and human tags.
   - Never overwrite model predictions with human tags; store both.
14. API output:
   - Return the normalized response shape documented below so the frontend can render without guessing field names.

## AI Studio Spec To Preserve In Backend Planning

The pasted AI Studio specification defines the target SINE contract. The production MINDEX routes should preserve this shape even if the public endpoint name stays under `/api/mindex/...`.

Canonical production routes today:

- `POST /api/mindex/sine/blobs/{id}/analyze`
- `POST /api/mindex/library/blobs/{id}/classify`
- Website BFF:
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `POST /api/natureos/mindex/library/classify?id={id}`

Optional model-service route:

- `POST /api/classify`

Required response fields for the model-service and MINDEX adapters:

```json
{
  "identification_summary": {
    "top_label": "Humpback Whale Song (A5 Segment Major)",
    "category": "marine_bioacoustics",
    "type": "whales_vocalization",
    "confidence": 0.962,
    "ood_score": 0.041
  },
  "activity_segments": [
    {
      "start_sec": 0.0,
      "end_sec": 3.5,
      "confidence": 0.91,
      "acoustic_domain": "water",
      "event_family": "animal_life",
      "event_type": "whale_sweep"
    }
  ],
  "frequency_detections": [
    {
      "start_sec": 1.2,
      "end_sec": 3.2,
      "freq_hz": 340,
      "confidence": 0.94,
      "acoustic_domain": "water",
      "event_family": "frequency_peak",
      "event_type": "dominant_peak"
    }
  ],
  "bird_detections": [],
  "uav_detections": [],
  "nps_detections": [],
  "deep_signal_matches": [
    {
      "label": "Megaptera novaeangliae (North Pacific)",
      "score": 0.965,
      "source": "MBARI Oceanographic Archive 2024",
      "segment_start": 4.5,
      "segment_end": 12.0
    }
  ],
  "sound_transcripts": [
    {
      "start_sec": 0.0,
      "end_sec": 3.5,
      "label": "Low-pitch Whale Vocal",
      "description": "Deep resonating low-frequency song introduction featuring descending whistles.",
      "sound_source": "Humpback Whale (Megaptera novaeangliae)",
      "confidence": 0.94,
      "frequency_range": "120 Hz - 400 Hz"
    }
  ],
  "diagnostics": {
    "latency_ms": 12,
    "sample_rate_in": 44100,
    "channels": 1
  }
}
```

Backend modules required by that contract:

1. Audio frame decoder:
   - Decode WAV, FLAC, MP3, and future audio containers.
   - Normalize sample arrays to float amplitude ranges.
   - Preserve channel count, source sample rate, duration, codec, and decode diagnostics.
2. Deterministic DSP:
   - STFT/spectrogram.
   - FFT dominant peaks.
   - zero-crossing rate.
   - spectral centroid.
   - Auditok-style activity segmentation.
   - impulse/shock detection.
   - rotor harmonic detection.
3. Deep representation:
   - Move from the current small embedding field to a real 512D embedding manifold.
   - Store model version, embedding dimensionality, window bounds, and vector quality.
4. Prototype retrieval:
   - Compare embeddings against a MINDEX prototype catalog using cosine similarity.
   - Store prototypes for marine species, broad animal calls, insect sounds, UAV/air-propeller classes, vessel/water-propeller signatures, seismic/ground signatures, impulse events, and unknown recurring fingerprints.
   - Use Postgres/pgvector or the agreed MINDEX vector service; if Supabase is used for shared prototype management, expose the same results through MINDEX BFF so the frontend has one route.
5. Temporal classifier:
   - Add a CRNN-style head for time-evolving patterns.
   - Use mel spectrogram front-end, CNN feature extractor, bidirectional LSTM or equivalent temporal model, and window-aware aggregation.
   - Cover animal calls, insects, propellers, vessel cavitation, impulse/explosion events, and seismic/ground windows.
6. Sound transcript narrator:
   - Return chronological `sound_transcripts`.
   - Descriptions must explain physical acoustic mechanics: sweep, chirp, pulse, blade passage, cavitation, broadband impulse, rumble, echo, pressure wave, ambient bed.
   - Do not make speech transcripts. These are physical sound-event transcripts.

## Prompt For New SINE Classifier Planning Agent

Use this exact context:

```text
You are designing the next production SINE acoustic classifier for Mycosoft MINDEX.

Scope is acoustic only. Ignore chemistry, DNA computing, DWSIM, Cantera, PubChem, and molecular work.

Current system:
- Website frontend repo: D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
- SINE player route: http://localhost:3010/sensing/sine/player
- Current frontend file: components/sensing/sine-acoustic-player.tsx
- MINDEX backend VM: 192.168.0.189:8000
- NAS: /mnt/nas/mindex/Library/acoustic on VM, SMB \\192.168.0.105 on Windows
- Current acoustic file sources: esc50 and mbari_pacific_sound
- Current BFF catalog: GET /api/natureos/mindex/library?category=acoustic&limit=100&q=esc
- Current analyze route: POST /api/mindex/sine/blobs/{id}/analyze
- Current classify route: POST /api/mindex/library/blobs/{id}/classify
- Current frontend starts on ESC-50 short clips because MBARI long files are too large for immediate analysis.

Current verified behavior:
- ESC-50 rows load.
- WAV playback works through the BFF stream URL.
- Audio reaches readyState 4, duration 5 seconds, and play advances currentTime.
- Run SINE analysis returns real detector rows.
- Detector groups render in the UI.
- `sound_transcripts` are not returned yet.
- Long MBARI recordings load as browse/play targets, but immediate full analysis is disabled until backend chunking/windowing exists.

Required model/API target:
- Build a SINE classifier that returns:
  - identification_summary
  - activity_segments
  - frequency_detections
  - bird_detections
  - uav_detections
  - nps_detections
  - deep_signal_matches
  - sound_transcripts
  - diagnostics
- The classifier must support terrestrial microphones, underwater hydrophones, and ground/seismic/geophone recordings.
- It must distinguish physical sound events: whale/dolphin vocalizations, bird calls, insect/tonal signatures, propellers/UAVs, vessel/engine/cavitation, explosions/impulse events, acoustic activity, and unknown recurring patterns.
- It must cover every major acoustic domain:
  - air: birds, insects, mammals, drones, quadcopters, helicopters, airplanes, explosions, lightning, and mechanical noise
  - water: whales, dolphins, fish, hydrophone events, boats, vessel engines, underwater propellers, cavitation, submarine/mechanical hum, and pressure impulses
  - ground: soil/underground sound, geophone/seismic data, earthquake/tremor signals, surface vibration, and buried mechanical signatures
- The transcript output is not spoken-language transcription. It is a chronological explanation of the physical sound events in the audio.
- Use deterministic DSP plus deep embeddings. The target embedding space is 512D with cosine similarity against a MINDEX prototype catalog.
- Store model weights/prototypes under NAS models/acoustic and return all results through MINDEX APIs. Do not make the frontend invent classifier output.

External acoustic references Morgan requested:
- https://github.com/dimastatz/deep-signal
- https://github.com/pschatzmann/arduino-audio-tools/wiki/Simple-Frequency-Detection
- https://github.com/microsoft/acoustic-bird-detection
- https://github.com/amsehili/auditok
- https://github.com/pcasabianca/Acoustic-UAV-Identification
- https://github.com/nationalparkservice/acoustic_discovery
- Sonic Visualiser UI reference: https://www.sonicvisualiser.org/

Additional acoustic classifier repos Codex audited for this plan:
- https://github.com/GorillaBus/urban-audio-classifier
- https://github.com/IBM/MAX-Audio-Classifier
- https://github.com/abishek-as/Audio-Classification-Deep-Learning
- https://github.com/daisukelab/ml-sound-classifier
- https://github.com/daisukelab/sound-clf-pytorch
- https://github.com/ilge/gmtk-audio-classification
- https://github.com/ksanjeevan/crnn-audio-classification
- https://github.com/imfing/audio-classification
- https://github.com/braydenoneal/neural-audio-classification
- OVH marine sound classification notebook using Watkins-style marine mammal sound data

The audited repos should be treated as engineering references. Do not paste old demo apps into MINDEX. Build reproducible MINDEX adapters, model packages, and training/inference jobs with license review and real verification.

Deliver a production plan with:
1. architecture,
2. model/data flow,
3. database/vector schema,
4. API request/response contracts,
5. backend implementation milestones,
6. frontend integration milestones,
7. evaluation metrics,
8. long-recording/chunking strategy,
9. deployment and verification checklist,
10. human correction / active-learning workflow,
11. Edison-style wave annotation persistence,
12. risks and honest limits.
```

## Morgan's Acoustic Requirements

The Library tab must support acoustic recordings from hydrophones, transducers, microphones, ultrasonic sensors, and environmental audio sources.

The SINE acoustic player must be comparable in spirit to Sonic Visualiser:

- Detailed waveform view.
- Detailed spectrogram view.
- Frequency layer.
- Event/activity segments.
- Time cursor/playhead.
- Detections overlaid on the audio.
- Detector table with confidence, timestamp, frequency, and label.
- Pattern matching for repeated signals.
- Air, water, and ground acoustic contexts handled separately.

The acoustic classifier must recognize and organize patterns such as:

- Animal bioacoustics across air and water, not only birds.
- Birds, mammals, amphibians, bats, whales, dolphins, fish, and other identifiable animal sounds.
- Insects and stridulation patterns such as crickets, cicadas, katydids, bees, mosquitoes, beetles, and unknown insect pulses.
- Whales, dolphins, and underwater animal sounds.
- Hydrophone events.
- Microphone events.
- Geophone, soil, underground, and surface-ground recordings.
- Air propellers: UAVs, quadcopters, helicopters, airplanes, jets, and blade-pass signatures.
- Water propellers: boats, vessels, submarines, thrusters, cavitation, and marine-engine signatures.
- Explosions, lightning, thunder, gunshots, detonation, pressure-wave, and other impulse events.
- Earthquake, tremor, landslide, buried mechanical, and other ground/seismic signatures.
- Tonal signatures.
- General acoustic activity regions.
- Unknown recurring acoustic fingerprints.

The Library UI must not show empty decorative panels. Visualizations only render from selected real files, real decoded browser audio, or real backend visualisation data.

## Required Acoustic Source Integrations

These are the acoustic-only upstream projects and references Morgan asked to use. They are not considered complete until they are actually installed or adapted, connected to MINDEX backend APIs, and visible in the frontend with verified outputs.

| Source | Purpose | Required Integration State |
| --- | --- | --- |
| `https://github.com/dimastatz/deep-signal` | Deep signal / pattern-identification foundation | Backend adapter or service path that can embed/match audio blobs and return matches to the Library/SINE UI. |
| `https://github.com/pschatzmann/arduino-audio-tools/wiki/Simple-Frequency-Detection` | Frequency detection reference | Frequency detector that returns dominant frequency, confidence, time window, and method metadata. |
| `https://github.com/microsoft/acoustic-bird-detection` | Bird detector reference inside broader animal bioacoustics | Bird adapter/model plan, while the final SINE taxonomy also supports mammals, amphibians, bats, marine life, insects, and unknown animal calls. |
| `https://github.com/amsehili/auditok` | Acoustic activity detection | Activity/voice/sound-region segmentation used before classification. |
| `https://github.com/pcasabianca/Acoustic-UAV-Identification` | Air propeller / UAV reference | UAV detector adapter with quadcopter, drone, helicopter, airplane, and blade-pass evidence. |
| `https://github.com/nationalparkservice/acoustic_discovery` | National Park acoustic discovery reference/library | Reference detector/library for natural acoustic pattern discovery and ecological sound labels. |
| Sonic Visualiser reference UI | Visual detail target | Frontend should support waveform, spectrogram, annotation lanes, detector layers, and detailed inspection. |

## Required Acoustic Data Sources

The Library must use real MINDEX/NAS data. Known acoustic ingest state from Cursor handoffs:

- NAS path on MINDEX VM: `/mnt/nas/mindex/Library/acoustic/{source_id}/`.
- ESC-50 was reported complete: 2,000 normalized 16 kHz WAV files.
- MBARI Pacific Sound ingest was reported running or completed into NAS-backed Library storage.
- Cursor reported the backend had `library.blob` and `library.manifest` tables.
- Cursor reported APIs:
  - `GET /api/mindex/library/catalog`
  - `GET /api/mindex/library/blobs?category=acoustic`
  - `GET /api/mindex/library/blobs/{id}/stream`
  - `POST /api/mindex/library/import`
  - `GET /api/mindex/sine/status`
  - `GET /api/mindex/sine/detectors`
  - `GET /api/mindex/sine/library/blobs`
  - `GET /api/mindex/sine/library/blobs/{id}/stream`
  - `GET /api/mindex/sine/blobs/{id}/analysis`
  - `GET /api/mindex/sine/blobs/{id}/visualisation`
  - `POST /api/mindex/sine/blobs/{id}/analyze`
  - `POST /api/mindex/library/blobs/{id}/classify`

The frontend must treat these reports as claims until verified from the website machine and browser.

## Cursor Backend Contract To Preserve

Cursor initially defined the acoustic classifier as a seven-detector SINE stack on MINDEX. Treat these detector names as the current backend entry points, not as the final taxonomy. The final classifier must map all detector outputs into broad air/water/ground acoustic families.

| Detector | Purpose |
| --- | --- |
| `frequency_fft` | FFT peak frequencies |
| `activity_auditok` | Acoustic activity segments |
| `bird_microsoft` | Bird likelihood now, then one input to the broader animal-life family |
| `uav_rotor` | Rotor harmonics now, then one input to the broader air-propeller family |
| `nps_discovery_match` | NPS-style profile match |
| `deep_signal_features` | Spectral embedding / similarity |
| `visualisation_sonic` | Waveform and spectrogram |

Cursor-reported backend entry point:

- `classify_acoustic_file()` in `mindex_api/services/sine_acoustic/classifier.py`

Cursor-reported backend additions:

- `event_views.py` maps flat detection events into grouped Library fields:
  - `frequency_detections`
  - `activity_segments`
  - `bird_detections`
  - `uav_detections`
  - `nps_detections`
  - `deep_signal_matches`
  - `identification_summary`
- Backend should extend every detection event with normalized fields:
  - `acoustic_domain`: `air`, `water`, `ground`, or `unknown`
  - `event_family`: `animal_life`, `insect`, `air_propeller`, `water_propeller`, `vessel_engine`, `uav`, `aircraft`, `impulse_explosion`, `weather_lightning`, `earthquake_seismic`, `geophysical`, `mechanical`, `frequency_peak`, `activity_segment`, `unknown_pattern`
  - `event_type`: concrete subtype such as `bird_call`, `whale_sweep`, `dolphin_click`, `cricket_stridulation`, `quadrotor_blade_pass`, `boat_cavitation`, `lightning_strike`, `earthquake_tremor`, `explosion_impulse`, or `unknown_repeating_tone`
- `POST /api/mindex/library/blobs/{id}/classify`
  - Runs the classifier and returns grouped JSON for acoustic blobs.
- `GET /api/mindex/library/blobs/{id}`
  - Attaches latest saved classification when analysis exists.
- `POST /api/mindex/sine/blobs/{id}/analyze`
  - Persists to Postgres and returns the same grouped fields for SINE player and Library.
- `tests/test_acoustic_event_views.py`
  - Cursor reported this test passes locally.

Honest limits Cursor reported:

- Current detectors are scipy/auditok/heuristic code, not full production ONNX for every class.
- Bird, animal, insect, UAV, aircraft, water-propeller, impulse, lightning, and ground/seismic production weights are next dedicated model steps.
- Future acoustic model weights should live on NAS under `models/acoustic/`.
- Deep Signal is represented by feature/embedding work for now, not necessarily a full clone of every upstream project.

## Current Frontend Inventory

### Main MINDEX route

File: `components/natureos/mindex-dashboard.tsx`

The MINDEX dashboard currently includes this tab order:

1. Overview
2. Data
3. Library
4. Encyclopedia
5. Pipeline
6. Integrity
7. Ledger
8. Network
9. Bio
10. Chemistry
11. M-Wave
12. Agents

The Library tab is mounted through:

- `components/mindex/tabs/mindex-nav-items.ts`
- `components/natureos/mindex-dashboard.tsx`
- `components/mindex/tabs/library-tab.tsx`

### Main Library tab

File: `components/mindex/tabs/library-tab.tsx`

Current acoustic-relevant frontend capabilities:

- Supports Library categories including `acoustic`.
- Fetches Library catalog from `/api/natureos/mindex/library?category=...&q=...&limit=100`.
- Shows storage status and SINE status.
- Shows categorized file list grouped by source/class.
- Has instant client-side file filtering text.
- Selects a file and renders a player/details panel.
- For acoustic files, renders `SineAcousticPanel`.
- Uses `<audio controls>` with `blob.stream_url`.
- Consumes backend-provided detector arrays when present:
  - `deep_signal_matches`
  - `frequency_detections`
  - `activity_segments`
  - `bird_detections`
  - `uav_detections`
  - `nps_detections`
- Browser-decodes selected audio when possible and computes fallback display-only:
  - dominant frequency detections
  - activity segments
- Renders a canvas with rows for:
  - waveform
  - spectrogram-like energy
  - frequency
  - activity
  - bird
  - UAV
  - NPS/deep signal
- Shows detector summaries and event rows.

Important frontend limitation:

- Browser-computed frequency/activity is only local visualization support. It is not a replacement for backend classifier results and must not be presented as trained identification.

### Standalone SINE player

File: `components/sensing/sine-acoustic-player.tsx`

Current capabilities:

- Loads blobs from `/api/natureos/mindex/library?category=acoustic&limit=100`.
- Selects first blob by default.
- Streams selected audio through the blob `stream_url` returned by the Library BFF, or falls back to `/api/mindex/sine/library/blobs/{id}/stream`.
- Loads `/api/mindex/sine/blobs/{id}/visualisation`.
- Loads `/api/mindex/sine/blobs/{id}/analysis`.
- Can call `POST /api/mindex/sine/blobs/{id}/analyze`.
- Draws waveform and spectrogram canvas from backend visualisation data.
- Shows a detector event table from both `events[]` and grouped detector arrays.

Current limitations:

- File browsing is basic.
- It is less integrated with MINDEX Library UX than `library-tab.tsx`.
- It has rough copy/encoding artifacts that need cleanup.
- It should be treated as a secondary route unless the team decides to merge it into the Library acoustic classifier.

### Frontend BFF routes

Current SINE routes under `app/api/mindex/sine`:

- `status/route.ts`
- `detectors/route.ts`
- `library/blobs/route.ts`
- `library/blobs/[id]/stream/route.ts`
- `blobs/[id]/analysis/route.ts`
- `blobs/[id]/visualisation/route.ts`
- `blobs/[id]/analyze/route.ts`

Current MINDEX Library routes:

- `app/api/natureos/mindex/library/route.ts`
- `app/api/natureos/mindex/library/file/route.ts`
- `app/api/natureos/mindex/library/classify/route.ts`

Current BFF behavior:

- Proxies to `MINDEX_API_URL` / `MINDEX_API_BASE_URL`.
- Uses `fetchMindexWithAuthRetry`.
- Maps enriched Library rows into frontend Library blob fields.
- Streams remote files through the backend when local NAS root is not mounted on the website host.
- Proxies the Library classify action through `/api/natureos/mindex/library/classify?id={blobId}`.

## Current Blockers and Truth Rules

### Do not claim integration until all layers exist

An acoustic source integration is done only when all of these are true:

1. The source code or model is installed, vendored, containerized, or otherwise reproducibly available.
2. Licensing is reviewed and documented.
3. Backend adapter exists.
4. Backend API returns detector output for a real blob.
5. Result is persisted or cached in MINDEX where appropriate.
6. Frontend renders the result for a real selected file.
7. Browser playback works for that same file.
8. Terminal smoke and browser screenshot verify it.

### No mock data

No fake audio, fake waveform, fake spectrogram, fake detector result, fake file count, fake confidence, or fake "classified" state.

When the backend is down or a detector is not ready, the UI must say the real operational state in a clean user/operator way.

### Data visibility

The file list must not be endless scrolling. Required UX:

- Category selector.
- Acoustic selected by default for this pass.
- Search bar directly near the file list.
- Grouping by source/dataset/class/environment.
- Loaded count vs total count.
- Pagination or load-more controls.
- Selected file details below or beside file list.
- Player at the top of the file/details area.
- No duplicate "source categories" panel that repeats the files.

## Desired Library Acoustic UX

The MINDEX Library acoustic classifier should be a full-screen workbench within the Library tab.

Suggested layout:

```text
Library / Acoustic

[Category chips or compact selector] [Search acoustic files...] [Refresh]

Left / center:
  Storage + source summary strip
  Player and SINE classifier workbench
    Audio controls
    Waveform lane
    Spectrogram lane
    Frequency lane
    Detection lanes
    Pattern/segment timeline

Right:
  Files
    grouped list
    selected file highlighted
    pagination/load more
  File details
    source, label, environment, duration, sample rate,
    codec, license, manifest, hash, detector status
```

The user should be able to:

- Search "hydrophone", "bird", "drone", "ESC-50", "MBARI", a species/common name, or a label.
- Select a real file.
- Hear the audio.
- See waveform and spectrogram from that audio.
- Run or inspect SINE analysis.
- See detections and confidence.
- Compare a selected file against saved fingerprints.
- Tell whether a detector result is saved, pending, or unavailable.

## Required Backend Contract for the New Acoustic Classifier

The new model/Cursor backend work should normalize responses so the frontend does not need many one-off field guesses.

### Blob list

Endpoint:

```http
GET /api/mindex/library/blobs?category=acoustic&limit=100&cursor=...
```

Required response shape:

```json
{
  "ok": true,
  "category": "acoustic",
  "total": 2180,
  "limit": 100,
  "cursor": null,
  "next_cursor": "opaque-cursor",
  "items": [
    {
      "id": "blob-id",
      "category": "acoustic",
      "title": "Human readable title",
      "filename": "clip.wav",
      "source_id": "esc50",
      "source_name": "ESC-50",
      "source_url": "https://...",
      "label_primary": "dog bark",
      "label_secondary": "animal",
      "acoustic_environment": "air",
      "duration_sec": 5.0,
      "sample_rate_hz": 16000,
      "channels": 1,
      "codec": "pcm_s16le",
      "mime_type": "audio/wav",
      "size_bytes": 160000,
      "license": "CC BY ...",
      "content_hash": "sha256:...",
      "stream_url": "/api/mindex/library/blobs/blob-id/stream",
      "analysis_status": "ready",
      "detector_status": {
        "frequency": "ready",
        "activity": "ready",
        "bird": "pending",
        "uav": "pending",
        "nps": "ready",
        "deep_signal": "ready"
      }
    }
  ]
}
```

### Stream

Endpoint:

```http
GET /api/mindex/library/blobs/{id}/stream
```

Required behavior:

- Supports browser playback.
- Uses correct `Content-Type`.
- Supports range requests.
- Does not expose raw NAS filesystem paths.

### Analysis

Endpoint:

```http
GET /api/mindex/sine/blobs/{id}/analysis
```

Required response:

```json
{
  "ok": true,
  "blob_id": "blob-id",
  "status": "ready",
  "events": [
    {
      "id": "event-id",
      "detector_id": "bird",
      "label": "Bird call",
      "class_name": "bird",
      "species": "optional species",
      "confidence": 0.91,
      "start_sec": 1.23,
      "end_sec": 2.12,
      "frequency_hz": 3400,
      "bandwidth_hz": 800,
      "environment": "air",
      "method": "microsoft-acoustic-bird-detection",
      "model_version": "..."
    }
  ],
  "summary": {
    "top_label": "Bird call",
    "confidence": 0.91,
    "event_count": 7,
    "duration_sec": 5.0
  }
}
```

### Visualisation

Endpoint:

```http
GET /api/mindex/sine/blobs/{id}/visualisation
```

Required response:

```json
{
  "ok": true,
  "duration_sec": 5.0,
  "waveform": {
    "times": [0, 0.01],
    "amplitudes": [0.1, -0.05]
  },
  "spectrogram": {
    "times": [0, 0.02],
    "frequencies": [100, 200, 400],
    "power_db": [[-80, -60], [-70, -55], [-90, -85]]
  },
  "layers": [
    {
      "id": "animal_life",
      "label": "Animal life",
      "events": []
    }
  ]
}
```

### Analyze

Endpoint:

```http
POST /api/mindex/sine/blobs/{id}/analyze
```

Required behavior:

- Starts analysis if missing or stale.
- Returns existing ready analysis immediately when already available.
- Can return `202` with job ID if analysis is queued.
- Does not block UI indefinitely.

## Frontend Work Still Needed

### Priority 0

- Verify that `http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=5` returns real acoustic rows from the website host.
- Verify that `http://localhost:3010/api/mindex/sine/status` returns detector status.
- Verify that one selected acoustic `stream_url` plays in the browser.
- Fix any BFF route mismatch between `/api/mindex/library/blobs/{id}/stream` and `/api/mindex/sine/library/blobs/{id}/stream`.
- Ensure file IDs with slashes, spaces, or encoded characters stream correctly.
- Ensure the Library acoustic file list shows loaded/total and does not appear empty when backend returns rows.

### Priority 1

- Make the acoustic file list compact, grouped, searchable, and paginated/load-more.
- Keep the player/classifier at the top of the workbench.
- Show file details under or beside the file list, not as a duplicate category-source panel.
- Move SINE status into a compact operational strip, not a giant card.
- Show detector readiness per selected file.
- Clean up copy so it says human-readable audio facts, not backend jargon.
- Remove rough encoding artifacts from the standalone SINE player if it remains user-facing.

### Priority 2

- Merge the best standalone SINE player pieces into the Library tab or intentionally route the Library acoustic category to the standalone SINE workbench.
- Add visual annotation layers that match detector results.
- Add a pattern-matching panel:
  - similar known sounds
  - matched source library
  - confidence
  - distance/embedding score
  - environment
  - source dataset
- Add saved fingerprint display once backend exposes fingerprints.

### Priority 3

- Add compare mode for two or more clips.
- Add "find similar" action for a selected recording.
- Add detector filter toggles.
- Add keyboard/transport controls.
- Add region selection and annotation creation when backend supports writing annotations.

## Test Checklist

Run these without staging or committing.

Terminal:

```powershell
Invoke-RestMethod "http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=5"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/status"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/detectors"
Invoke-RestMethod "http://localhost:3010/api/mindex/sine/library/blobs?category=acoustic&limit=5"
```

Browser:

1. Open `http://localhost:3010/natureos/mindex`.
2. Go to `Library`.
3. Select `Acoustic`.
4. Confirm real files load.
5. Search within acoustic files.
6. Select a real file.
7. Confirm audio controls load duration metadata.
8. Play the file.
9. Confirm waveform/spectrogram area is not blank when real visualisation or decoded audio is available.
10. Confirm detector table/layers show real analysis results or a clear "not analyzed yet" state.
11. Run SINE analysis only if backend supports it.
12. Save a screenshot of the populated acoustic classifier state.

TypeScript:

```powershell
npx.cmd tsc --noEmit --pretty false
```

Known unrelated TypeScript errors may exist elsewhere in the repo; do not hide new MINDEX/Library errors behind them.

## Paste-Ready Prompt for the Acoustic Classifier Model

Use this prompt for the new model that will design/build the absolute acoustic classifier:

```text
You are building the MINDEX Library acoustic classifier for Mycosoft.

Focus only on acoustic classification. Ignore chemistry, DNA computing, DWSIM, Cantera, molecular simulation, and PubChem work.

The target frontend is WEBSITE/website on http://localhost:3010/natureos/mindex, specifically the MINDEX Library tab with category Acoustic. The backend is MINDEX on VM 192.168.0.189 and NAS-backed Library storage under /mnt/nas/mindex/Library/acoustic.

Hard rules:
- No mock audio.
- No fake waveform.
- No fake spectrogram.
- No fake detector result.
- No fake file counts.
- Use only real MINDEX/NAS audio rows and real analysis output.
- If a detector is not ready, show an honest pending/unavailable state.
- Do not expose credentials, raw NAS paths, or internal token details in UI.

Build SINE as a high-end audio identification workbench inside the MINDEX Library:
- Real audio playback.
- Searchable categorized acoustic file list.
- Loaded count vs total count.
- Pagination or load-more, not endless scrolling.
- File details with source, dataset, label, environment, codec, duration, sample rate, hash, license, and detector status.
- Waveform layer.
- Spectrogram layer.
- Frequency detection layer.
- Acoustic activity regions.
- Animal-life detection layer for birds, mammals, amphibians, bats, marine mammals, fish, and unknown animal calls.
- Insect detection layer for crickets, cicadas, katydids, bees, mosquitoes, beetles, stridulation, and unknown insect pulses.
- Air-propeller detection layer for UAVs, quadcopters, drones, helicopters, airplanes, jets, rotor harmonics, and blade-pass signatures.
- Water-propeller detection layer for boats, ships, submarines, thrusters, cavitation, and marine-engine signatures.
- Impulse detection layer for explosions, gunshots, lightning, thunder, detonation, pressure waves, and shock events.
- Ground/seismic detection layer for geophones, soil, underground sound, earthquakes, tremors, landslides, and surface vibration.
- NPS/nature sound discovery layer.
- Deep-signal/pattern matching layer.
- Detector results table with confidence, time range, frequency, method, and label.
- Similar-sound/pattern matching panel.
- Normalize every event with `acoustic_domain`, `event_family`, and `event_type` so the UI can group results without guessing from detector names.

Required acoustic integrations:
- dimastatz/deep-signal for signal pattern matching or embedding-based similarity.
- pschatzmann arduino-audio-tools frequency detection reference for frequency detection behavior.
- microsoft/acoustic-bird-detection as one bird-call adapter inside broader animal bioacoustics.
- amsehili/auditok for acoustic activity detection.
- pcasabianca/Acoustic-UAV-Identification as one air-propeller/UAV adapter inside broader aircraft and rotor detection.
- nationalparkservice/acoustic_discovery for nature acoustic discovery references.
- Sonic Visualiser style as the visual detail target.
- IBM/MAX-Audio-Classifier style AudioSet/VGGish general sound head.
- daisukelab/sound-clf-pytorch style PyTorch log-mel/ResNetish long-window classifier.
- daisukelab/ml-sound-classifier style live/edge chunking and rolling prediction smoothing.
- GorillaBus/urban-audio-classifier style terrestrial event taxonomy/preprocessing.
- imfing/audio-classification style classical feature diagnostics.
- OVH/Watkins style marine mammal acoustic classifier features.
- ksanjeevan/crnn-audio-classification style CRNN temporal classifier for long and variable-length event sequences.
- GMTK/HMM temporal smoothing concepts for reducing one-frame false positives.

Required editor and review behavior:
- Two-click waveform region selection.
- Loop selected region.
- Playback speed control.
- Reverse selected region preview for short clips.
- Zoom into selected region and reset zoom.
- Clear selection with right click, middle click, or third left click.
- Add named markers.
- Save selection, markers, playback flags, and zoom as backend wave annotations.
- Let the operator correct a wrong identification and save it as a human-tagged identification without deleting the model prediction.
- Preserve human/model disagreements as active-learning review samples.

Backend APIs should normalize these endpoints:
- GET /api/mindex/library/blobs?category=acoustic&limit=100&cursor=...
- GET /api/mindex/library/blobs/{id}
- GET /api/mindex/library/blobs/{id}/stream
- POST /api/mindex/library/blobs/{id}/classify
- POST /api/mindex/library/blobs/{id}/human-identification
- POST /api/mindex/library/blobs/{id}/wave-annotation
- GET /api/mindex/sine/status
- GET /api/mindex/sine/detectors
- GET /api/mindex/sine/blobs/{id}/analysis
- GET /api/mindex/sine/blobs/{id}/visualisation
- POST /api/mindex/sine/blobs/{id}/analyze

Frontend files to inspect first:
- components/mindex/tabs/library-tab.tsx
- app/api/natureos/mindex/library/route.ts
- app/api/natureos/mindex/library/file/route.ts
- app/api/natureos/mindex/library/classify/route.ts
- app/api/mindex/sine/status/route.ts
- app/api/mindex/sine/detectors/route.ts
- app/api/mindex/sine/library/blobs/route.ts
- app/api/mindex/sine/library/blobs/[id]/stream/route.ts
- app/api/mindex/sine/blobs/[id]/analysis/route.ts
- app/api/mindex/sine/blobs/[id]/visualisation/route.ts
- app/api/mindex/sine/blobs/[id]/analyze/route.ts
- components/sensing/sine-acoustic-player.tsx

Deliverables:
1. Verify terminal API access from the website host.
2. Verify browser playback of a real Library acoustic file.
3. Render waveform/spectrogram/detection layers from real data.
4. Implement or connect the missing classifier UI pieces.
5. Keep all frontend changes scoped to MINDEX Library/SINE unless explicitly approved.
6. Do not stage, commit, or deploy until Morgan explicitly approves.
```

## Coordination Note for Cursor

Cursor should focus backend work on the normalized acoustic contract above:

- Ensure all listed SINE endpoints are reachable from the website host.
- Ensure stream endpoints support browser audio playback and range requests.
- Ensure detector adapters return consistent event fields.
- Ensure analysis/visualisation data is stored or cached for real NAS blobs.
- Ensure ESC-50 and MBARI acoustic rows expose source, label, environment, duration, sample rate, codec, license, and stream URL.
- Ensure detector readiness/status is visible per blob and globally.
- Do not mark any acoustic source integration complete until the frontend can show the real detector result on a real selected file.

## Paste-Ready Cursor Backend Prompt - Next Hard Blockers

```text
You are Cursor working on the MINDEX backend for the SINE acoustic classifier. Codex owns the Website frontend and has updated the SINE player at:

D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\sensing\sine-acoustic-player.tsx

Current verified frontend behavior on http://localhost:3010/sensing/sine/player:
- Real acoustic file rows load from the NAS-backed MINDEX library.
- Native browser audio control is bound to the selected stream URL.
- Scope canvas renders real waveform/spectrogram visualisation when returned.
- Scope cursor displays time, frequency, and waveform amplitude.
- Waveform renderer expects dense real waveform arrays and renders per-pixel min/max envelope.
- UI can run POST /api/mindex/sine/blobs/{id}/analyze through the Website BFF.
- A real ESC-50 file returned 17 detector events, including 12 FFT peaks and 1 activity segment.
- Frontend now renders real `deep_signal_matches` in a Prototype matches panel.
- Frontend now renders real `diagnostics` in an Analysis diagnostics panel.

Current backend blockers that must be fixed without faking data:
1. Empty/all-file library request:
   - GET /api/mindex/library/blobs?category=acoustic&limit=100 currently can report a nonzero total but return zero rows.
   - Fix this so the all-file request returns actual acoustic rows, not only q=esc.
   - Codex added a frontend fallback, but backend must be corrected.

2. Sound transcripts:
   - Analyze/classify responses must return chronological `sound_transcripts`.
   - These are physical sound-event transcripts, not speech transcripts.
   - Each transcript should include start_sec, end_sec, label, description, sound_source when known, confidence, and frequency_range.
   - Examples: broadband impulse, rotor harmonic band, animal call, insect pulse train, vessel cavitation, ground tremor.

3. Deep signal / prototype matches:
   - Analyze/classify responses must return `deep_signal_matches`.
   - Required fields:
     - label
     - score or confidence
     - source/source_name/dataset
     - segment_start
     - segment_end
     - category/event_family/type
     - prototype_id when available
     - model or embedding_model_version
     - distance/cosine_distance when available
   - Store real prototypes/fingerprints in MINDEX. Do not invent matches from filename or metadata.

4. Diagnostics:
   - Analyze/classify responses must return `diagnostics`.
   - Include latency_ms, sample_rate_in, channels, duration_sec, window_count, decode_format, model_version, detector_versions, and any backend queue/cache state that is useful to operators.
   - Do not expose credentials, internal tokens, or raw secret paths.

5. Visualisation quality:
   - GET /api/mindex/sine/blobs/{id}/visualisation must return real waveform and spectrogram arrays generated from decoded audio.
   - For long MBARI files, support window/range parameters instead of blocking.
   - Suggested query params:
     - start_sec
     - end_sec
     - frequency_min_hz
     - frequency_max_hz
     - max_waveform_points
     - max_spectrogram_columns
   - Return enough waveform resolution for the frontend envelope renderer to show real detail.

6. Normalized event taxonomy:
   - Keep existing detector IDs if needed, but add normalized fields so frontend does not guess:
     - acoustic_domain: air, water, ground, unknown
     - event_family: animal_life, insect, air_propeller, water_propeller, impulse, ground_seismic, activity, frequency, prototype_match, unknown
     - event_type: precise class when known
   - Bird and UAV are only subcategories. SINE must cover all animal sounds, insect sounds, explosions, lightning/thunder, earthquakes/ground sounds, propellers in water, UAVs, aircraft, helicopters, vessels, and recurring unknowns.

7. Persistence:
   - Persist analysis runs, detector events, transcripts, prototype matches, diagnostics, wave annotations, and human identifications.
   - Human identifications must not overwrite model predictions.
   - Human/model disagreement must be queryable for active learning.

Acceptance tests:
- From the website host:
  - GET http://localhost:3010/api/natureos/mindex/library?category=acoustic&limit=100 returns rows without q=esc.
  - GET http://localhost:3010/api/mindex/sine/status returns ok.
  - GET http://localhost:3010/api/mindex/sine/blobs/{id}/visualisation returns waveform and spectrogram arrays for a short ESC-50 file.
  - POST http://localhost:3010/api/mindex/sine/blobs/{id}/analyze returns:
    - identification_summary
    - frequency_detections
    - activity_segments
    - deep_signal_matches
    - sound_transcripts
    - diagnostics
- Browser:
  - Open http://localhost:3010/sensing/sine/player.
  - Confirm files appear without a search fallback.
  - Select a real file.
  - Confirm audio duration metadata loads.
  - Run SINE analysis.
  - Confirm detector lanes, Prototype matches, Sound transcript, and Analysis diagnostics all populate from real backend response.

Hard rule:
No mock audio, no synthetic waveform pretending to be real, no fake detector result, no fabricated prototype match, no fake diagnostics.
```

## Jun 4 Frontend Control Pass - Oscilloscope/Amp Strip

Codex updated the SINE player control surface in `components/sensing/sine-acoustic-player.tsx`.

Current frontend state:

- The scope controls are real rotary knobs, not slider bars.
- The knob bank sits directly under the Overlay / Spectrogram / Waveform / Grid / Bands / Peaks / Lanes buttons.
- The bank is exactly two rows of five controls on the desktop SINE layout:
  - Time width
  - Frequency low
  - Frequency high
  - Wave gain
  - Wave height
  - Spec contrast
  - Spec opacity
  - Scope height
  - Volume
  - Lane rows
- Each knob is compact, equal-width, and uses `minmax(0, 1fr)` columns so the control strip does not force horizontal scroll.
- Browser verification on `http://localhost:3010/sensing/sine/player` measured:
  - `knobCount: 10`
  - `rowCount: 2`
  - `overflowX: false`
  - first row widths: `160px` each
  - second row widths: `160px` each
  - dial size: `32x32`
- The SINE stream route was terminal-tested with a real ESC-50 file:
  - `GET /api/natureos/mindex/library?category=acoustic&limit=1&q=esc` returned rows.
  - `GET /api/natureos/mindex/library/file?...` returned `200`, `Content-Type: audio/wav`, `441044` bytes.
- Fresh browser navigation decoded the selected audio element:
  - `duration: 5`
  - `readyState: 4`
  - `error: null`
- The custom Play button no longer calls `preventDefault()` before media playback. This was removed because it can break browser media activation.
- Browser automation still could not prove audible playback because automation clicks left the media element paused even when the audio was decoded and ready. Manual user click remains the real acceptance test for sound output.
- TypeScript check still stops on unrelated CREP files before a clean project result:
  - `app/dashboard/crep/CREPDashboardClient.tsx` missing `aliases`
  - `components/crep/layers/v3-overlays.tsx` `kind` string not assignable to `FacilityKind`

Do not regress these frontend behaviors in the next pass:

- No endless horizontal knob strip.
- No oversized knob cards.
- No bars/sliders for scope controls.
- No mock waveform, detector, or audio data.
- Keep user-facing SINE text acoustic and human-readable.

## Jun 4 Frontend Taxonomy Pass - Normalized Detector Families

Codex updated `components/sensing/sine-acoustic-player.tsx` so the SINE player is no longer visually locked to the old narrow detector groups.

Current frontend behavior:

- The player still consumes real backend fields only. It does not fabricate detector events.
- The player accepts current legacy grouped arrays:
  - `frequency_detections`
  - `activity_segments`
  - `bird_detections`
  - `uav_detections`
  - `nps_detections`
  - `deep_signal_matches`
- The player is now ready for broader backend groups:
  - `animal_detections`
  - `insect_detections`
  - `air_propeller_detections`
  - `water_propeller_detections`
  - `vessel_detections`
  - `impulse_detections`
  - `weather_detections`
  - `ground_seismic_detections`
  - `mechanical_detections`
  - `geophysical_detections`
  - `unknown_pattern_detections`
- The player preserves raw `detector_id`, but detector lane grouping now prefers normalized `event_family`.
- Legacy categories are canonicalized for display:
  - `bird` -> `animal_life`
  - `uav` / `rotor` -> `air_propeller`
  - `frequency` / `fft_peak` -> `frequency_peak`
  - `activity` -> `activity_segment`
  - `nps` / `deep_signal` -> `prototype_match`
  - `seismic` / `ground` / `earthquake` -> `ground_seismic`
  - `lightning` / `thunder` -> `weather_lightning`
- The detector filter row now includes `Mechanical`.
- The signal stack includes broad categories instead of bird/rotor only:
  - Animal life
  - Insects
  - Air propellers
  - Water propellers
  - Impulse / explosions
  - Ground / seismic
  - Mechanical
  - Activity
  - Frequency
  - Pattern matches
- Human identification snapshots now carry:
  - `acoustic_domain`
  - `event_family`
  - `event_type`
  - `method`
  - `model_version`
  - frequency range fields when present

Verification on `http://localhost:3010/sensing/sine/player`:

- Browser reload succeeded with no build/runtime error.
- File list populated after load delay: `100 shown from 100 loaded`.
- Knob bank stayed exactly `5 + 5` rows with no X/Y overflow.
- `POST http://localhost:3010/api/mindex/sine/blobs/a1d6356b-da3a-4685-a4b3-e9f25ba62b00/analyze` returned:
  - `status: complete`
  - `event_count: 17`
  - `frequency_detections: 12`
  - `activity_segments: 1`
  - `animal_detections: 1`
  - `insect_detections: 1`
  - `air_propeller_detections: 1`
  - `ground_seismic_detections: 1`
  - `sound_transcripts: 1`
- Running the UI analysis button on a short ESC-50 clip displayed normalized detector lane groups:
  - `Frequency peaks 12`
  - `Prototype matches 2`
  - `Animal life 1`
  - `Activity segments 1`
  - `Air propellers 1`
- The old raw lane headings `Bird`, `UAV`, and `Deep Signal` no longer appear as top-level groups; they remain as detector details under broader families.

Backend contract for Cursor:

- Keep returning raw `detector_id` for traceability.
- Add normalized fields to every detector event:
  - `acoustic_domain`
  - `event_family`
  - `event_type`
  - `method`
  - `model_version`
- Do not rely on frontend canonicalization forever. Frontend canonicalization is a compatibility bridge for current legacy responses, not the final source of truth.
- Return the broader grouped arrays listed above when those detectors exist.
- Continue returning legacy arrays during transition so the current UI does not break.

## Jun 4 Frontend Visualizer Pass - High-Definition Scope Rendering

Codex inspected the existing Fungi Compute visualization components:

- `components/fungi-compute/oscilloscope.tsx`
- `components/fungi-compute/stft-spectrogram.tsx`
- `components/fungi-compute/spectrum-analyzer.tsx`

Useful patterns applied to SINE:

- Scope-like cyan grid with major/minor divisions already existed and was kept.
- SINE now uses robust percentile-based dB scaling for the spectrogram color range instead of raw min/max only.
- This prevents one loud/quiet bin from flattening the whole spectrogram.
- SINE now draws two real traces from backend spectrogram power data when peak markers are enabled:
  - cyan centroid/ridge trace
  - amber peak-frequency trace
- These traces come from `visualisation.spectrogram.power_db`, `frequencies`, and `times`.
- No fake waveform, fake spectrogram, or fake detector data was introduced.

Verified on `http://localhost:3010/sensing/sine/player`:

- Browser reload succeeded with no build/runtime error.
- File list hydrated to `100 shown from 100 loaded`.
- Real selected ESC-50 file: `1-100038-A-14.wav`.
- Native audio metadata remained available: 5s, 16 kHz, 430.7 KB.
- Running SINE analysis showed:
  - `17 events`
  - normalized detector families still visible
  - high-resolution canvas backing: `2400 x 640`
  - CSS display size: about `844 x 320`
- Screenshot inspection showed the spectrogram has stronger contrast and visible real spectral ridge/peak traces.

Current backend visualisation limitation:

- `GET /api/mindex/sine/blobs/a1d6356b-da3a-4685-a4b3-e9f25ba62b00/visualisation` returned real data, but it is still low resolution:
  - waveform amplitudes: about `800`
  - spectrogram rows: `64`
  - spectrogram columns: `44`
- Frontend interpolation can make this readable, but it cannot create scientific detail that the backend did not compute.
- Cursor/backend must add windowed high-resolution visualisation:
  - `max_waveform_points` should support at least `4096`, `8192`, and `16384`.
  - `max_spectrogram_columns` should support at least `512`, `1024`, and `2048` for short clips.
  - `frequency_bins` should support at least `256`, `512`, and `1024`.
  - Long MBARI files must support `start_sec`, `end_sec`, `frequency_min_hz`, and `frequency_max_hz` windows.
  - Waveform should return real envelope arrays: `min[]`, `max[]`, and `rms[]` matching `times[]`.
  - Spectrogram should return real dB power values with metadata for STFT window size, hop length, FFT size, window type, and sample rate.

## Jun 4 Frontend Control Strip Pass - Oscilloscope / Guitar Amp Knobs

User direction:

- The SINE visual controls should look like a hardware control surface, closer to an oscilloscope or guitar amp.
- They should not be sliders.
- They should not create their own scrollable panel.
- They should live as a clean second control row under the waveform / spectrogram / overlay buttons.

Codex frontend update:

- The oscilloscope control bank is now a compact two-row faceplate:
  - 10 total controls.
  - Desktop layout is exactly `5 + 5`.
  - The bank is `overflow-hidden`, not internally scrollable.
  - Individual controls are smaller `42px` channel strips with `24px` round knobs.
  - The faceplate uses darker amp/scope styling with inset glass/metal lighting.
- Browser verification on `http://localhost:3010/sensing/sine/player`:
  - `childCount: 10`
  - `rowCount: 2`
  - `countsByRow: [5, 5]`
  - `overflowX: false`
  - `overflowY: false`

Current controls in the strip:

- Time width
- Frequency low
- Frequency high
- Wave gain
- Wave height
- Spec contrast
- Spec opacity
- Scope height
- Volume
- Lane rows

## Jun 4 Frontend Identification Normalization Pass

Issue found during browser verification:

- `POST /api/mindex/sine/blobs/{id}/analyze` returned a valid real MINDEX SINE result.
- The UI could still show `No identification yet` because the frontend only trusted one response shape.
- Current backend responses can include useful identification data in:
  - `identification_summary`
  - `classification.identification_summary`
  - `summary`
  - `classification.summary`

Codex frontend update:

- Added tolerant summary normalization in `components/sensing/sine-acoustic-player.tsx`.
- The SINE player now derives `IdentificationSummary` from the real backend response shapes above.
- It preserves:
  - top label / label
  - category / type
  - confidence / out-of-domain score
  - status
  - engine / model
  - dominant frequency
  - detector counts
  - detector status

Verified on `http://localhost:3010/sensing/sine/player`:

- Real selected ESC-50 file: `1-100038-A-14.wav`.
- Running the UI `Run SINE analysis` button populated:
  - visible model result: `Spectral Embedding`
  - `17 events`
  - model/version state from `mindex_sine_v1` / `deep_signal_features`
  - normalized detector lane families
- After analysis, the page no longer showed `No identification yet`.

Terminal evidence:

- `POST http://localhost:3010/api/mindex/sine/blobs/a1d6356b-da3a-4685-a4b3-e9f25ba62b00/analyze` returned:
  - `status: complete`
  - `identification_summary.top_label: spectral_embedding`
  - `identification_summary.confidence: 1.0`
  - `identification_summary.engine: deep_signal_features`
  - `identification_summary.model: mindex_sine_v1`
  - `identification_summary.dominant_frequency_hz: 101.5625`
  - `identification_summary.detector_counts.frequency: 12`
  - `identification_summary.detector_status.*: ok`

Follow-up fix in the same pass:

- Saved analysis hydration now also shows the identification without forcing a new run.
- The saved-analysis endpoint returns `summary.detector_status` plus `events`, but not always `identification_summary`.
- Frontend now derives a fallback identification from real saved detector events when the summary is partial:
  - first `deep_signal_features`
  - then prototype-match events
  - then strongest non-frequency detector
  - then frequency peak only as a last real-data fallback
- Browser verification after reload:
  - `100 shown from 100 loaded`
  - `Identification: Spectral Embedding`
  - `Confidence: 100.0%`
  - `Dominant: 3.40 kHz`
  - `Events: 17`
  - `No identification yet` no longer appeared after saved analysis hydration.

Transport/playback hardening:

- Direct media seeks were replaced with a safe helper that tries `fastSeek()` first and falls back to `currentTime`.
- Region looping, reset, and scrub now use the same safe seek path.
- Reverse playback was converted to a memoized callback so loop/reverse/speed controls are current when play is pressed.
- The play button now uses one `onClick` transport path instead of mixed pointer/click dispatch.
- Browser automation caveat: the in-app automated click returned `play() failed because the user didn't interact with the document first`; the real stream still loaded with `duration: 5`, `readyState: 4`, and no `Audio playback is unavailable` or `Playback seek is unavailable` status. A manual user click in the browser remains the final playback proof.

## Jun 4 Frontend Canvas Navigator Pass - Edison / Oscilloscope Overview Strip

User direction:

- The SINE wave editor should feel closer to Edison / oscilloscope tooling.
- It needs visible region selection, zoom context, playhead context, and a way to see where the current zoom sits inside the whole recording.
- No fake waveform or spectrogram data is allowed.

Codex frontend update:

- Added a bottom overview navigator inside the SINE canvas.
- The navigator is drawn only from real `visualisation.waveform` arrays:
  - `times`
  - `amplitudes`
  - `min`
  - `max`
  - `rms`
- The navigator now shows:
  - mini full-file waveform
  - current visible zoom window
  - selected loop/region window
  - current playhead
  - real detection lanes above the overview strip
- Selection/marker vertical lines now stop above the overview strip so the editor does not visually smash into the bottom scrollbar/overview region.

Browser verification:

- `http://localhost:3010/sensing/sine/player?codex_sine_navigator=...`
- File list hydrated: `100 shown from 100 loaded`.
- Saved analysis hydrated: `Spectral Embedding`.
- Knob bank stayed `5 + 5`.
- Canvas rendered at about `844 x 320` CSS pixels, backed by `2400 x 640`.
- Visual crop showed:
  - detection lane bars
  - bottom overview waveform strip
  - current window outline
  - no clipping at the lower edge of the canvas.

Remaining backend limitation:

- The overview strip can only be as scientifically detailed as the backend waveform arrays.
- Current backend visualisation is still low resolution for high-end analysis.
- Cursor/backend still needs high-resolution windowed visualisation endpoints with larger waveform point counts and spectrogram column/bin counts, as listed above.

## Jun 4 Frontend Measurement Rack Pass - Real Spectrogram Readouts

Goal:

- Make the SINE scope more scientifically useful, not just visually nicer.
- Surface instrument-style measurements directly under the waveform/spectrogram canvas.
- Keep all readouts derived from the real MINDEX `visualisation.spectrogram` response.

Codex frontend update:

- Added a six-card scope measurement rack under the SINE canvas.
- The rack updates with the visible time/frequency window and uses `computeScopeMeasurements(...)`.
- Readouts:
  - Centroid
  - Average power
  - dB span
  - Active band
  - Cells
  - Window
- Card values now wrap instead of truncating, so labels such as `Animal / machine detail` are visible inside the card.

Browser verification on `http://localhost:3010/sensing/sine/player`:

- File list hydrated: `100 shown from 100 loaded`.
- Saved analysis hydrated: `Spectral Embedding`.
- Measurement rack rendered from real ESC-50 spectrogram data.
- Example real readouts observed:
  - `Centroid: 3.60 kHz`
  - `Avg power: -63.4 dB`
  - `dB span: 85.2 dB`
  - `Active band: Animal / machine detail`
  - `Cells: 2,816`
  - `Window: 0s-5s / 0.0 Hz-8.00 kHz`

Backend note:

- These readouts are currently constrained by backend resolution.
- Once Cursor/backend adds higher waveform/spectrogram resolution and windowed analysis, this rack will become much more useful for actual signal inspection.

## Jun 4 Frontend Detector Layer Map Pass - Real Stack Explorer

AI Studio prototype idea used:

- AI Studio had a visual model explorer for `L1: Physics DSP`, `L2: Deep Embed`, and `L3: Semantic Heads`.
- The useful part was the stack/layer mental model.
- The mock/speculative content was not copied into the production player.

Codex frontend update:

- Added a real detector layer map inside the SINE stack panel.
- It is built from:
  - live registered detectors from `GET /api/mindex/sine/status` / Library SINE metadata
  - `identification_summary.detector_status`
  - actual detector events from the selected analysis
- Layers:
  - `L1 Physics DSP`: FFT peaks, activity gates, waveform/spectrogram extraction.
  - `L2 Deep / prototype`: embeddings, profile matching, prototype similarity.
  - `L3 Semantic heads`: animal, vehicle, impulse, weather, and domain-specific labels.
- Each detector row shows:
  - detector id
  - observed method/model when present
  - status
  - event count for the current recording

Browser verification on `http://localhost:3010/sensing/sine/player`:

- File list hydrated: `100 shown from 100 loaded`.
- Saved analysis hydrated: `Spectral Embedding`.
- Real stack explorer rendered:
  - `7 registered`
  - `L1 Physics DSP`: `13 events`
  - `frequency_fft / fft_peak / ok / 12`
  - `activity_auditok / auditok / ok / 1`
  - `visualisation_sonic / method pending / ok / 0`
  - `L2 Deep / prototype`: `2 events`
  - `deep_signal_features / spectral_embedding / ok / 1`
  - `nps_discovery_match / library_profile_match / ok / 1`
  - `L3 Semantic heads`: `2 events`
  - `uav_rotor / harmonic_stack_uav / ok / 1`
  - `bird_microsoft / mel_harmonic_bird_score / ok / 1`

Backend note:

- This frontend map is real but shallow because backend status is currently shallow.
- Cursor/backend should expand `/api/mindex/sine/status` with per-detector:
  - layer
  - method
  - model/version
  - dependency status
  - input/output schema
  - model availability / weights path
  - last calibration / benchmark result
  - whether it is heuristic, deterministic DSP, neural, or prototype retrieval.

## Jun 4 MINDEX Library Embed Pass - Category Apps, Not Generic Preview

Morgan clarified the Library architecture:

- MINDEX Library is not supposed to be one generic preview pane for every file type.
- Each sensing family gets a complete specialized app that owns its own files, classifier, visualization, and pattern recognition.
- SINE is the complete acoustic app.
- BlueSight should own visual / optical / spectral / radar / LiDAR / Wi-Fi sensing data.
- GANDHA should own gas, VOC, VSC, smell, particle, and chemical sensing data.
- Fungi Compute should own fungal bioelectric / FCI signal playback and analysis.
- Future tactile, thermal, and other category apps should follow the same rule.

About page reference used:

- `https://mycosoft.com/about`
- The page currently frames the stack as data sensors plus Fungi Compute, hydrophones, radar, VOC sensing, particle counters, Geiger detection, Wi-Fi sense, vibration, temperature/humidity, acoustic, optical, thermal, mechanical channels, FCI, and links `Fungi Compute + FCI`, `MINDEX`, `BlueSight`, `SINE`, and `GANDHA`.

Codex frontend update:

- `components/sensing/sine-acoustic-player.tsx` now supports `embedded` mode.
- `embedded` mode removes the full-page fixed background and lets SINE live inside another app surface.
- `components/mindex/tabs/library-tab.tsx` now routes the `Acoustic` category to `<SineAcousticPlayer embedded />`.
- The MINDEX Library acoustic area no longer shows the older generic right-side preview/details panel.
- The SINE player still fetches only:
  - `/api/natureos/mindex/library?category=acoustic&limit=...`
  - `/api/mindex/sine/...`
  - wave annotations and human identifications for acoustic blobs
- Non-acoustic categories keep the current category-specific Library file/player surface until their full apps are built.

Hard rule for future agents:

- Do not make SINE browse chemical, thermal, tactile, or visual files.
- Do not make GANDHA browse audio files.
- Do not make BlueSight browse gas files.
- MINDEX Library is the shared catalog, but each classifier/player app must remain category-bound.

## Jun 4 Frontend Signal Transcript Pass - Real Detector Windows

Problem:

- MINDEX can return real detector events while `sound_transcripts` is still empty.
- The UI previously showed an empty Sound transcript card even when SINE analysis had real FFT/activity/prototype/semantic events.

Codex frontend update:

- `SoundTranscript` now tracks whether a row came from:
  - backend `sound_transcripts`
  - real detector events
- If backend transcripts exist, the UI renders them as `MINDEX transcript`.
- If backend transcripts are absent, the UI derives chronological `Real detector windows` from actual `DetectionEvent` rows.
- The derived windows use only real event fields:
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
- The UI labels them `detector-derived` so they are not mistaken for final semantic sound transcripts.
- The active playhead card and canvas transcript markers now use the same displayed transcript list.

Backend note:

- Cursor/backend should still produce first-class `sound_transcripts` from analyze/classify.
- The frontend fallback is only to expose real signal windows immediately when the backend has not synthesized transcript text yet.
