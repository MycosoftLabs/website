# NLM Model Training App Fix — Sep 11, 2026

**Date:** September 11, 2026  
**Status:** Complete  
**Live URL:** https://mycosoft.com/natureos/model-training

## Why it said MAS degraded

`/api/mas/health` forwarded MAS `/health` `status: degraded` from skip-startup collectors. The Agents tab (`MycaMasPanel`) treated anything except `status === 'online'` as **MAS DEGRADED**. Models GET was owner-gated (401) and `useModels` returned empty without login. MINDEX BFF hit wrong/unauthenticated paths and returned `[]`.

## What was plugged

- Public `GET /api/natureos/nlm-training` reads MAS NLM + MINDEX (via console or `/api/nlm/health`).
- `GET /api/natureos/nlm-training/models` prepends the live MAS NLM card. Login not required.
- `GET /api/natureos/nlm-training/mindex` uses MAS console taxa/compounds or `/api/mindex/taxa` + `/compounds` with service headers.
- MAS health BFF adds `ui_status: online` and `reachable` when 188:8001 answers. Skip-startup is a note, not an outage.
- `LiveNlmBanner` shows loaded / not Ollama / no forecast / MINDEX counts / cannot-train honesty.

## Honesty

- MAS **online** when the orchestrator is reachable.
- NLM is **not** Ollama. Forecast unqualified, `p` null.
- Training jobs unavailable on 188 fail-closed. Do not fake a run.
- Empty MINDEX rows = empty from source, not MAS down.

## Localhost 3010

This worktree was not used to restart or kill port 3010.
