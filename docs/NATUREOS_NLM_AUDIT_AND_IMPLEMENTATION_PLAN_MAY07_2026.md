# NatureOS NLM Audit and Implementation Plan - May 7, 2026

## Executive Summary

NatureOS is partially wired, but the NLM training stack is not yet a fully operational model engine in the same sense as an LLM training/inference service.

The website now reaches the real MAS NLM endpoints and can submit training actions to `http://192.168.0.188:8001/api/nlm/training/*`. A smoke `start` request was accepted by MAS and produced a real run id. The backend then exposed the next blocker: the MAS trainer defaulted to root-owned `/models` and `/data` paths and failed with `Permission denied: '/models'`. The source defaults were patched to use `NLM_HOME` or `~/.mycosoft/nlm`.

The deeper issue is architectural: the authoritative NLM repository (`MAS/NLM`) contains a real sensory world-model codebase with PyTorch tests, while the MAS training router currently calls a lightweight MAS-side `mycosoft_mas.nlm.trainer.NLMTrainer` that prepares placeholder category data and only records metadata. To make NLM truly operational, MAS must dispatch jobs into the standalone NLM engine or the MAS trainer must be replaced with the real NLM training stack.

## What Is Working

- `MAS/NLM` Python test suite passes: `126 passed`.
- MAS exposes mounted NLM endpoints:
  - `GET /api/nlm/health`
  - `GET /api/nlm/model/status`
  - `GET /api/nlm/training/runs`
  - `POST /api/nlm/training/start`
  - `POST /api/nlm/training/stop`
- Website NLM BFF now resolves MAS/MINDEX through the LAN-safe helpers instead of fragile loopback envs.
- Website NLM BFF now POSTs training actions to `/api/nlm/training/{action}`.
- WorldView health and unified search are online from localhost.
- MYCA/MAS status is reachable through `/api/myca/status`.

## What Is Not Working Yet

- NLM model is not loaded in MAS: `/api/nlm/model/status` returns `status: "not_loaded"`.
- MAS NLM health is degraded because no model runtime is active.
- The accepted MAS training job failed before the source patch because the trainer used `/models`.
- MAS training still uses placeholder training data in `mycosoft_mas/nlm/trainer.py`; it does not yet train the real six-sense NLM world model from `MAS/NLM/nlm/training/trainer.py`.
- `app/api/natureos/nlm-training/mindex` is wired and authenticated, but MINDEX returns empty taxa/all-life stats right now.
- OpenAQ feed proxy is wired, but upstream MAS returns `503` for `/api/natureos/feeds/openaq/measurements`.
- Ancestry kingdom stats endpoint is wired, but MINDEX returns `[]`, so the all-life migration/ETL is not populated.
- The dashboard still uses Firestore as a control-plane UI for models, pipelines, runs, frames, variants, and fingerprints. That is useful metadata, but it is not the model engine itself.

## Source of Truth Decision

Use `MAS/NLM` as the source of truth for the actual NLM engine:

- Core model: hybrid sensory world model with deterministic preconditioning, RootedNatureFrames, six sensory streams, SSM/graph/sparse-attention fusion, prediction heads, and AVANI.
- API process: `nlm.api.main:app`.
- MAS role: orchestration, governance, MYCA/MAS commands, and job dispatch.
- MINDEX role: persistence, graph/vector store, lineage, and telemetry provenance.

The MAS-side `mycosoft_mas.nlm.trainer.NLMTrainer` should become a bridge to the real engine or be replaced by the real `MAS/NLM` trainer.

## Required NLM Engine Contract

The NLM engine needs these production endpoints:

- `GET /health` - process liveness.
- `GET /ready` - model/data readiness.
- `GET /v1/models` - loaded/available model registry view.
- `POST /v1/models/load` - load a checkpoint or registry alias.
- `GET /v1/datasets` - available training/eval datasets from MINDEX/NAS.
- `POST /v1/runs` - create a training run.
- `GET /v1/runs` - list runs.
- `GET /v1/runs/{run_id}` - run status, metrics, checkpoints.
- `GET /v1/runs/{run_id}/events` - streaming logs/metrics.
- `POST /v1/runs/{run_id}/cancel` - stop a run.
- `POST /v1/evaluate` - run evaluation against a named test suite.
- `POST /v1/infer` - next-state/anomaly/prediction inference.
- `POST /v1/embed` - RootedNatureFrame or packet embeddings.
- `POST /v1/export` - export checkpoint to serving format.

The website dashboard should read/write through the website BFF only; the BFF should proxy to MAS, and MAS should dispatch to NLM.

## Tools Needed

- PyTorch as the core training runtime. PyTorch DistributedDataParallel is the low-level scale path for synchronized distributed training.
- Hugging Face Accelerate for a simple single-node to multi-node training launcher around native PyTorch loops.
- Ray Train when the NLM needs cluster scheduling, multi-node workers, Ray Data, and dashboard visibility.
- Hugging Face Datasets streaming for large acoustic/environmental datasets that cannot be fully downloaded before training.
- MLflow Tracking and Model Registry for run metrics, checkpoint lineage, version aliases, and promotion.
- DVC for dataset and pipeline versioning around NAS-hosted files, raw audio, frame exports, and derived parquet/jsonl manifests.
- Qdrant for vector storage of NLM embeddings, scene/audio/frame indexes, and cross-modal retrieval payloads.
- Postgres for run state, job records, dataset manifests, lineage pointers, and dashboard queries.
- Redis/RQ or Celery for local job queues if Ray is not used.

References:

- PyTorch distributed docs: https://docs.pytorch.org/docs/stable/distributed.html
- Hugging Face Accelerate docs: https://huggingface.co/docs/accelerate/main/index
- Ray Train docs: https://docs.ray.io/en/latest/train/train.html
- Hugging Face Datasets streaming: https://huggingface.co/docs/datasets/dataset_streaming
- MLflow tracking/model registry docs: https://www.mlflow.org/docs/latest/ml/tracking
- DVC docs: https://dvc.org/doc/user-guide/what-is-dvc
- Qdrant collections/search docs: https://qdrant.tech/documentation/concepts/collections/

## Implementation Phases

### Phase 1 - Make Current Stack Honest and Runnable

- Deploy the MAS path fix so `NLM_HOME` defaults to `~/.mycosoft/nlm` instead of `/models`.
- Set explicit production envs:
  - `NLM_HOME=/opt/mycosoft/nlm` or another writable service path.
  - `NLM_MODEL_DIR=$NLM_HOME/models`
  - `NLM_CHECKPOINT_DIR=$NLM_HOME/models/checkpoints`
  - `NLM_TRAINING_DATA_DIR=$NLM_HOME/data/training`
  - `NLM_API_URL=http://192.168.0.188:8200`
  - `MINDEX_API_KEY=<prod key>`
- Start the standalone NLM FastAPI service on `192.168.0.188:8200`.
- Add a MAS health probe that reports both MAS NLM router health and standalone NLM engine readiness.
- Add dashboard polling for MAS run ids and update Firestore run records with live MAS/NLM status.

### Phase 2 - Replace Placeholder Training

- Replace `mycosoft_mas.nlm.trainer.NLMTrainer` with either:
  - a bridge that calls standalone NLM `/v1/runs`, or
  - the real `MAS/NLM/nlm/training/trainer.py` imported as a package dependency.
- Remove placeholder samples from MAS training paths.
- Make training data preparation pull from MINDEX/NAS manifests:
  - RootedNatureFrames.
  - MycoBrain telemetry.
  - SporeBase bioaerosol samples.
  - Hyphae/Mushroom environmental streams.
  - WorldView/CREP spatial events.
  - Acoustic/maritime datasets from the NLM data-source plan.
- Persist run metadata to Postgres and MLflow, not only in-process memory.

### Phase 3 - Production Model Runtime

- Implement NLM model serving with explicit model load/unload and readiness.
- Store checkpoints in NAS/S3-compatible object storage and register model versions in MLflow.
- Push embeddings to Qdrant/MINDEX with collection names and vector dimensions documented.
- Add model evaluation suites:
  - frame reconstruction/next-state prediction,
  - anomaly detection,
  - sensor modality dropout,
  - acoustic classification,
  - ecological grounding/AVANI veto,
  - search/retrieval quality.

### Phase 4 - CI/CD and Dashboard Completion

- Move `docs/nlm-cicd/Dockerfile` and workflow templates into the `MAS/NLM` repo.
- Add CI jobs for tests, lint, docker build, API smoke, and one tiny CPU training run.
- Add dashboard views for:
  - datasets,
  - live run logs,
  - checkpoint browser,
  - model registry aliases,
  - evaluation reports,
  - NLM engine readiness versus MAS orchestration readiness.

## Test Plan

- Website focused lint:
  - `npm run lint -- --file app/api/natureos/nlm-training/route.ts --file app/api/natureos/nlm-training/status/route.ts --file app/api/natureos/nlm-training/mindex/route.ts --file app/api/natureos/nlm-training/mycobrain/route.ts --file app/api/natureos/feeds/openaq/measurements/route.ts --file lib/nlm/supabase-auth-hooks.ts`
- Website route smoke:
  - `GET /api/natureos/nlm-training`
  - `GET /api/natureos/nlm-training/status`
  - `POST /api/natureos/nlm-training` with `action=start`
  - `POST /api/natureos/nlm-training` with `action=stop`
- NLM repo:
  - `python -m pytest tests -q`
- MAS focused tests:
  - `python -m pytest tests/test_memory_integration.py tests/test_calibration_pipeline.py tests/test_inventory.py tests/test_harness_smoke.py -q`
  - `python -m pytest tests/test_unified_latents.py -q`
  - `python -m pytest tests/llm/test_backend_selection_modes.py -q`
- Runtime:
  - verify `/api/nlm/health` is healthy,
  - verify `/api/nlm/model/status` is loaded,
  - verify a one-epoch training job writes checkpoints,
  - verify dashboard run status updates without fake metrics.

## Current Verification Results

- Website focused lint: passed.
- TypeScript scan for touched NLM files: no matching errors.
- Full website typecheck: still fails on many unrelated existing repo errors.
- `MAS/NLM` tests: `126 passed`.
- MAS focused tests: `93 passed`, `1 skipped`.
- Full MAS test suite: timed out after 184 seconds in this desktop run.
- WorldView health: online.
- Unified search for San Diego: returns results.
- OpenAQ: upstream MAS returns 503.
- Ancestry kingdoms: endpoint online but empty.
- NLM training POST: accepted by MAS and returned run id.
- NLM training backend before deploy of the path fix: failed on `/models` permission.
- Local MAS trainer smoke after the path fix: initializes and writes under `~/.mycosoft/nlm`.
