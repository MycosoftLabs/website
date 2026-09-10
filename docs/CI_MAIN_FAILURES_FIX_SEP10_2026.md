# CI Main Failures Fix — September 10, 2026

**Date:** September 10, 2026  
**Status:** CI-only — no 187 cutover  
**Repos:** `MycosoftLabs/website` (this note), `MycosoftLabs/mindex` (pytest plugin)  
**RJ Ricasata = CFO.** Mycosoft is pursuing CMMC L2 — this document does not claim CMMC compliance. Instant Deploy / Earth Sim OOM hold still applies (`docs/ITDX_INSTANT_DEPLOY_OOM_HOLD_SEP10_2026.md`).

## What was red (last 24–48h)

| Run | Workflow | SHA | Failed job | Root cause |
|---|---|---|---|---|
| [34529513071](https://github.com/MycosoftLabs/website/actions/runs/34529513071) | CI | `e4e69d50` (main, PR 311) | `lint-and-build` / Production build | `next build` V8 heap ~4 GB → `FATAL ERROR: Reached heap limit` exit 134 |
| [34529513106](https://github.com/MycosoftLabs/website/actions/runs/34529513106) | Mycosoft CI/CD | `e4e69d50` | `Build & Push Image` | Same OOM inside `Dockerfile.production` (`NODE_OPTIONS=4096`) |
| [34529475634](https://github.com/MycosoftLabs/website/actions/runs/34529475634) | CI (PR 311) | `dfd197aa` | `lint-and-build` | Same |
| [34529475663](https://github.com/MycosoftLabs/website/actions/runs/34529475663) | Website CI (PR 311) | `dfd197aa` | `lint-and-build` | Same |
| [34529475631](https://github.com/MycosoftLabs/website/actions/runs/34529475631) | Mycosoft CI/CD (PR 311) | `dfd197aa` | `Build & Push Image` | Same |
| [34529275420](https://github.com/MycosoftLabs/website/actions/runs/34529275420) | Mycosoft CI/CD | `a4ae8668` (PR 310) | `Build & Push Image` | Same class |
| [34501852988](https://github.com/MycosoftLabs/website/actions/runs/34501852988) | Arraylake field bake | `045eaa29` | `bake` | Cloudflare Tunnel SSH timeout (port 65535). Infra, not this SHA. |
| [34505403818](https://github.com/MycosoftLabs/mindex/actions/runs/34505403818) | platform-one-build | `8aea4851` | `build-hardened-image` | `pytest --suppress-no-test-exit-code` unrecognized (plugin missing) |

Lint & Type Check and Unit Tests on website **passed**. Instant Deploy (fast) was **skipped** (no `[fast]`). No 187 cutover from these red runs.

**MAS:** no failed Actions in the last 48h (oldest reds are June–August scheduled dependency jobs).

## Fix (this SHA)

- Raise Next.js build heap to 8192 MB (`package.json` `build`, CI `NODE_OPTIONS`, `Dockerfile` / `Dockerfile.production` builder stage).
- Add 8 GB swap on GitHub `lint-and-build` jobs so private runners do not kernel-OOM.
- `[no-deploy]` / `[ci-only]` on the merge commit skips `Deploy to Production`. Earth Sim viewport-cull / memory governor is **not** in `e4e69d50`; do not cut 187.

Do **not** revert ITDX tabs, Live Data, personnel, governor, or briefing. Do **not** require `SOURCERY_TOKEN`.

## Arraylake (not fixed in this SHA)

Scheduled bake still fails SSH through the Cloudflare tunnel. Restart `cloudflared` on the VM when an operator owns that lane. Do not start a second 187 website cutover from this note.

## Verify

1. `CI` / `Website CI` `lint-and-build` green.
2. Mycosoft CI/CD `Build & Push Image` green; `Deploy to Production` skipped when the commit message has `[no-deploy]`.
3. Origin `192.168.0.187:3000` unchanged by this SHA.
