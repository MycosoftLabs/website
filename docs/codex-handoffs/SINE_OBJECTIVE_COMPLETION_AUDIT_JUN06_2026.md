# SINE Objective Completion Audit

Date: June 6, 2026

Prepared by: Codex

Scope: requirement-by-requirement audit of the active SINE objective:

- merge useful Google AI Studio frontend ideas into the shared SINE player
- reject AI Studio mock/Gemini backend paths
- make waveform/spectrogram high-definition and oscilloscope-like using the Fungi Compute direction
- fully read/incorporate the ChatGPT prompt/research direction
- audit external audio-classifier repositories
- produce a clear scientifically useful SINE upgrade plan for Navy/Psathyrella buoy use
- produce Cursor backend prompt for real acoustic AI
- keep SINE honest until real backend PyTorch/TorchScript/ONNX/prototype/fusion/transcript evidence exists

This audit does not claim backend SINE is complete. It proves what has been completed in the Website/Codex lane and what remains backend work.

## Current Verdict

SINE is **not complete** as a real acoustic classifier.

Website/frontend preparation is substantially complete and verified for this phase. The backend now has useful registry, evidence, request-contract, and persisted-evidence plumbing, but the active classifier remains detector-only and still needs real model-backed inference, prototype/fingerprint search, fusion evidence generation, and evidence-linked transcript generation.

## Evidence Sources Inspected

Website repo:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\sensing\sine-acoustic-player.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\lib\mindex\sine-contract.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\sensing\sine\player\page.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\app\sensing\[slug]\page.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\components\mindex\tabs\library-tab.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_CLASSIFIER_CURSOR_HANDOFF_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_SYSTEM_UPGRADE_PLAN_JUN05_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_P0_BACKEND_IMPLEMENTATION_BLUEPRINT_JUN06_2026.md`

MINDEX repo:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\classifier.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\pipeline.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\event_views.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\visualisation.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\model_runtime.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\persisted_evidence.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\services\sine_acoustic\request_contract.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\mindex_api\routers\sine_acoustic.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\migrations\20260606_sine_model_registry_jun06_2026.sql`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\migrations\20260606_sine_analysis_evidence_jun06_2026.sql`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\tests\test_acoustic_event_views.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\tests\test_sine_model_runtime.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\tests\test_sine_registry_contract.py`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\docs\SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md`

Local AI Studio prototype:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\server.ts`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\src\components\AcousticPlayer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\src\components\ModelExplorer.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\src\components\LibraryTab.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\src\components\SINEStatus.tsx`
- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\MINDEX\mindex\sine-acoustic-classifier\src\types.ts`

External local audit workspace:

- `D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos`

## Current Source Recheck

Fresh source inspection on June 6 shows the Website/Codex lane is correctly preparing for real SINE evidence, but the backend inference objective is still incomplete.

Frontend source evidence:

- `components/sensing/sine-acoustic-player.tsx` imports `SINE_TARGET_DOMAINS`, `SINE_SOUND_TARGETS`, and the visualisation quality contract from `lib/mindex/sine-contract.ts`.
- `lib/mindex/sine-contract.ts` requires `model_outputs`, `prototype_matches`, `fusion_evidence`, `sound_transcripts`, `water`, `air`, `ground`, broad sound targets, human review, and evidence-backed transcripts.
- `components/sensing/sine-acoustic-player.tsx` requests 8192 waveform points, 1024 time frames, 256 frequency bins, FFT 2048, hop 128, and `quality=oscilloscope`.
- `components/sensing/sine-acoustic-player.tsx` only treats backend visualisation as high-definition when waveform/spectrogram dimensions meet the requested counts.
- `components/sensing/sine-acoustic-player.tsx` has display paths for model outputs, prototype matches, fusion evidence, sound transcripts, human tags, contested human/model labels, oscilloscope controls, spectrum, waterfall, grid, persistence, bands, peaks, and detector lanes.
- `app/sensing/sine/player/page.tsx` and `app/sensing/[slug]/page.tsx` route the SINE surfaces through the shared player.

AI Studio prototype source evidence:

- `MINDEX/mindex/sine-acoustic-classifier/server.ts` imports `GoogleGenAI` and `mockAcousticBlobs`.
- `server.ts` generates synthetic WAV buffers and synthetic waveform/spectrogram matrices.
- `server.ts` asks Gemini to produce `identification_summary`, `deep_signal_matches`, and `sound_transcripts`.
- `server.ts` has a deterministic heuristic fallback that invents semantic labels from mock blob metadata.
- Safe ideas from the prototype remain UI/product concepts only: high-contrast acoustic UI, transcript lanes, model architecture panels, and prototype vocabulary.

Backend source evidence:

- `mindex_api/services/sine_acoustic/classifier.py` still calls `run_full_analysis()`.
- `mindex_api/services/sine_acoustic/pipeline.py` still dispatches deterministic detectors only.
- `mindex_api/services/sine_acoustic/model_runtime.py` explicitly reports runtime/registry readiness and does not classify audio.
- `mindex_api/services/sine_acoustic/persisted_evidence.py` can read real evidence rows when they exist, but the active pipeline does not create learned `model_outputs`, real `prototype_matches`, linked `fusion_evidence`, or evidence-linked `sound_transcripts`.
- `MINDEX/mindex/docs/SINE_REAL_AI_CURRENT_CODE_AUDIT_JUN06_2026.md` is now the current MINDEX-side audit: the false-label honesty patch exists locally, but real learned inference is still missing.

External repo audit evidence:

- External checkouts exist under `D:\Users\admin2\Desktop\MYCOSOFT\CODE\.codex-artifacts\sine-repos`.
- The imfing checkout is `imfing-audio-classification`, not `audio-classification`.
- The GMTK checkout is a Git-object reference on Windows because old filenames with colons do not materialize cleanly; use `git show` or a Linux checkout if Cursor needs those source files.
- The audit uses these projects as implementation references, not vendored production code.

## Requirement Matrix

| Requirement | Current status | Evidence | Remaining work |
|---|---:|---|---|
| Use one shared SINE player across `/sensing/sine`, `/sensing/sine/player`, and MINDEX Library | Done | `app/sensing/sine/player/page.tsx` returns `<SineAcousticPlayer />`; `app/sensing/[slug]/page.tsx` returns `<SineAcousticPlayer />` when slug is `sine`; shared component is `components/sensing/sine-acoustic-player.tsx` | Keep future edits in shared component path |
| Merge safe AI Studio frontend concepts | Done for safe concepts | Shared player includes combined waveform/spectrogram workbench, detector lanes, architecture/prototype/fusion panels, chronological acoustic script panel, status/readiness panels, and high-contrast acoustic UI | Do not copy AI Studio mock backend |
| Reject AI Studio Gemini/mock/generated backend | Done in plan/frontend gate | `SINE_REAL_CLASSIFIER_CURSOR_HANDOFF_JUN06_2026.md` rejects `GoogleGenAI`, `mockAcousticBlobs`, generated WAVs, generated visualisation, metadata labels; frontend evidence gates reject fake semantics | Cursor must preserve this in backend |
| High-definition waveform/spectrogram like oscilloscope | Frontend proven, backend partially pending | `lib/mindex/sine-contract.ts` requests 8192 waveform points, 1024 time frames, 256 frequency bins, FFT 2048, hop 128, Hann window; browser probe showed `8192` waveform points and `256 x 1024` spectrogram from real audio; the shared player now only treats visualisation as high-definition when those requested counts are met | MINDEX backend must provide equivalent high-definition server/windowed visualisation for long files |
| Use Fungi Compute visual direction | Done in frontend | Shared player supports overlay, spectrogram, waveform, spectrum, waterfall, grid, persistence, band guides, peaks, event lanes, calibrated divisions, knobs, trigger modes, waveform envelope/trace/peak layers | Keep backend axes/metadata accurate |
| Read ChatGPT prompt/research direction | Done in docs | Handoff docs incorporate sound transcripts, DSP + 512D embeddings, prototype catalog, evidence fusion, target payload shape, hydrophone/Navy/Psathyrella framing | Backend must implement |
| Read external repos and incorporate baseline tools into plan | Done in audit/plan | `SINE_EXTERNAL_AUDIO_CODE_AUDIT_JUN06_2026.md` and `SINE_REAL_CLASSIFIER_CURSOR_HANDOFF_JUN06_2026.md` map each repo to concrete SINE use/reject guidance; local path correction confirms imfing is under `imfing-audio-classification` | Cursor must implement selected patterns in MINDEX |
| Include water, air, and ground domains | Done in frontend contract | `SINE_TARGET_DOMAINS = ["water", "air", "ground"]` | Backend models must actually cover these domains |
| Include broad sound categories beyond birds/UAV | Done in frontend contract | `SINE_SOUND_TARGETS` includes marine life, animals, insects, propellers, vessels, machinery, explosions, lightning, seismic, water pressure impulses, unknown/OOD, human-contested labels | Backend models/prototypes must actually return evidence for these categories |
| Human correction flow | Frontend ready; backend bridge partly pending | Shared player has Human identification panel and training review UI; backend annotations exist for library human identification from Cursor notes | Need Cursor to bridge human tags into `sine.human_review_queue` and `sine.training_example` beside model outputs |
| Real learned model inference | Not done | MINDEX `classifier.py` calls detector `run_full_analysis()`; `pipeline.py` only dispatches deterministic detectors; `model_runtime.py` reports registry/runtime readiness and explicitly says it does not classify audio | Cursor must build PyTorch/TorchScript/ONNX runner and register first model |
| Real prototype/fingerprint matching | Not done | `event_views.py` keeps `deep_signal_features` out of `deep_signal_matches`; `sine.prototype` and `sine.prototype_match` plumbing exists, but no real embedding/prototype search is wired into the analysis runner | Cursor must build embedding/prototype catalog and nearest-neighbor matching with vector checksums |
| Evidence fusion | Not done | Frontend can display `fusion_evidence`; `sine.fusion_evidence` schema and persisted evidence reader exist, but classifier does not generate real fusion rows | Cursor must implement fusion rows tied to model/prototype/detector evidence |
| Evidence-linked sound transcripts | Not done | Frontend can display evidence-backed transcripts and rejects unlinked transcript prose; `sine.sound_transcript` schema/read path exists, but classifier does not generate evidence-linked transcripts | Cursor must generate transcript rows only with evidence IDs |
| Navy/Psathyrella operational path | Planned, not implemented | Handoff requires 30-second windows, hydrophone/MBARI/Psathyrella bounded or queued analysis | Cursor must implement long-file/windowed and rolling-buffer analysis |
| Supabase integration | Not required for P0 | Current SINE target is MINDEX VM 189/Postgres and Website BFF; Supabase tools were not used because no SINE Supabase project/table was identified | Use Supabase only if a later task explicitly maps SINE data to Supabase |
| Mycosoft coordination | Partially available | Coordination skill was read; actual coordination MCP tools were not exposed in this session | Continue repo-local handoffs unless MCP tools become available |

## Browser Runtime Evidence

Probe target:

`http://localhost:3010/sensing/sine?codex_sine_fresh_probe=1780700396769`

Fresh-tab result after catalog ready:

- `data-sine-player-mode="standalone"`
- `data-sine-readiness="instrument-ready-ai-pending"`
- `data-sine-contract-status="pending"`
- `data-sine-contract-label="No analysis payload"`
- `data-sine-catalog-status="ready"`
- `data-sine-loaded-files="36"`
- `data-sine-filtered-files="36"`
- `data-sine-total-files="2000"`
- `data-sine-registry-backed-rows="true"`
- selected file: `1-100038-A-14.wav`
- audio: `readyState=4`, duration `5`
- `data-sine-scope-source="browser-real-audio"`
- `data-sine-scope-waveform-points="8192"`
- `data-sine-scope-spectrogram-rows="256"`
- `data-sine-scope-spectrogram-cols="1024"`
- one visible scope canvas: CSS about `826 x 320`, backing store `1652 x 640`

Existing analyzed-state tab:

- `data-sine-analysis-status="complete"`
- `data-sine-contract-status="contract_violation"`
- `data-sine-contract-label="Missing model status"`
- `data-sine-readiness="mindex-contract-failed"`
- `data-sine-model-runtime-live="false"`
- `data-sine-model-evidence-present="false"`
- `data-sine-model-targets-covered="0"`
- `data-sine-sound-targets-covered="0"`

Interpretation:

- The frontend can stream and inspect real acoustic files with high-definition browser-decoded scope data.
- The frontend correctly refuses to treat current backend detector output as scientific sound meaning.
- The Website BFF now exposes both SINE model list and model-detail proxy routes, so Cursor can prove registry rows and individual model artifacts/checksums through `/api/mindex/sine/models` and `/api/mindex/sine/models/{model_id}`.
- The backend must now return model/prototype/fusion/transcript evidence.

## External Repo Use Summary

Use as implementation references:

- `daisukelab/sound-clf-pytorch`: best P0 PyTorch log-mel/ResNetish/VGGish/CNN14 and split-long-file reference.
- `IBM/MAX-Audio-Classifier`: clean serving separation, top-k response, metadata/status proof.
- `ksanjeevan/crnn-audio-classification`: temporal CRNN/GRU architecture for evolving signals.
- `daisukelab/ml-sound-classifier`: rolling buffers, long-window aggregation, realtime concept.
- `GorillaBus/urban-audio-classifier`: normalized log-mel/MFCC helpers and evaluation metrics.
- `imfing/audio-classification`: engineered baseline DSP features.
- Local imfing checkout path: `.codex-artifacts/sine-repos/imfing-audio-classification`.
- `abishek-as/Audio-Classification-Deep-Learning`: multi-head baseline comparison only.
- `braydenoneal/neural-audio-classification`: TorchScript save/load sanity reference.
- OVH marine notebook: marine/hydrophone feature and 30-second window framing.

Do not vendor no-license code without review. Prefer reimplementation in MINDEX style with explicit artifact provenance.

## Backend Completion Gates

Cursor/backend cannot call SINE done until all of the following are proven:

1. A real model artifact exists on VM/NAS with SHA-256.
2. A label map exists with SHA-256.
3. `sine.model_artifact` or equivalent registry marks the model loadable and loaded.
4. `GET /api/mindex/sine/status` reports model registry truth.
5. `POST /api/mindex/sine/blobs/{id}/analyze` runs real PyTorch/TorchScript/ONNX or validated transformer inference.
6. At least one ESC-50 short clip returns `model_outputs[]` with `model_id`, artifact checksum, label-map checksum, top labels, scores, window bounds, and latency.
7. Missing/unsupported model cases return `model_unavailable`, `unknown`, or `out_of_domain`, not fake labels.
8. Prototype/fingerprint rows include prototype IDs, embedding model IDs, vector checksums, source/provenance, and distance/similarity.
9. Fusion rows link to model output and/or prototype match IDs.
10. Sound transcript rows link to model/prototype/fusion evidence IDs.
11. Human correction rows save human labels beside model predictions and create contested review items when they disagree.
12. Long MBARI/hydrophone/Psathyrella files use bounded windows or queued jobs, not whole-file blocking inference.
13. Website `3010` accepts the response as model/prototype/fusion evidence instead of contract violation.

## Current Blocker

The current blocker is not frontend instrumentation. It is backend model reality.

The current MINDEX backend has model/evidence registry plumbing, but the active analysis path still runs:

- `classifier.py -> run_full_analysis()`
- `pipeline.py -> deterministic detectors`
- heuristic detectors such as `bird_microsoft`, `uav_rotor`, `deep_signal_features`

That is useful signal evidence plus a better honesty contract. It is not SINE acoustic intelligence until a real inference runner produces model/prototype/fusion/transcript evidence from decoded audio.

## Recommended Next Action

Give Cursor:

`D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website\docs\codex-handoffs\SINE_REAL_CLASSIFIER_CURSOR_HANDOFF_JUN06_2026.md`

Cursor should start with:

1. implement `sine-esc50-resnetish-v1` or equivalent P0 PyTorch/TorchScript/ONNX model path
2. register model artifact/checksum/label map
3. return one real `model_outputs[]` response for an ESC-50 blob
4. keep detector-only runs honest
5. add windowed MBARI/Psathyrella proof

Codex/Website should then re-run the `3010` SINE probes and confirm `data-sine-model-evidence-present="true"` only when real backend evidence is present.
