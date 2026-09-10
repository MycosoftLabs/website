# CI Main Failures Fix — September 10, 2026

**Date:** September 10, 2026  
**Status:** CI-only — no 187 cutover  
**Repos:** `MycosoftLabs/website` (heap OOM), `MycosoftLabs/mycosoft-mas` (already green on latest main), `MycosoftLabs/mindex` (already green on latest main)  
**RJ Ricasata = CFO.** Mycosoft is pursuing CMMC L2 — this document does not claim CMMC compliance. Earth Sim Instant Deploy remains on hold until viewport-cull / memory governor ships. Do not cut `192.168.0.187`.

## What was red

| Run | Workflow | SHA | Failed job | Root cause |
|---|---|---|---|---|
| [34529513071](https://github.com/MycosoftLabs/website/actions/runs/34529513071) | CI | `e4e69d50` (main, PR 311) | `lint-and-build` / Production build | `next build` V8 heap ~4 GB → `FATAL ERROR: Reached heap limit` exit 134 |
| [34529513106](https://github.com/MycosoftLabs/website/actions/runs/34529513106) | Mycosoft CI/CD | `e4e69d50` | `Build & Push Image` | Same OOM inside `Dockerfile.production` (`NODE_OPTIONS=4096`) |
| [34529475634](https://github.com/MycosoftLabs/website/actions/runs/34529475634) | CI (PR 311) | `dfd197aa` | `lint-and-build` | Same |
| [34529475663](https://github.com/MycosoftLabs/website/actions/runs/34529475663) | Website CI (PR 311) | `dfd197aa` | `lint-and-build` | Same |
| [34529475631](https://github.com/MycosoftLabs/website/actions/runs/34529475631) | Mycosoft CI/CD (PR 311) | `dfd197aa` | `Build & Push Image` | Same |
| [34529275420](https://github.com/MycosoftLabs/website/actions/runs/34529275420) | Mycosoft CI/CD | `a4ae8668` (PR 310) | `Build & Push Image` | Same class |
| [34501852988](https://github.com/MycosoftLabs/website/actions/runs/34501852988) | Arraylake field bake | scheduled | `bake` | Cloudflare Tunnel SSH timeout. Infra, not this SHA. |
| [34505942043](https://github.com/MycosoftLabs/mycosoft-mas/actions/runs/34505942043) | mas-ci | `acf425f6` (then superseded) | `test-build` / `test (3.11)` | `ModuleNotFoundError: mycosoft_mas.nlm.formspace.contracts` — fixed later by PR 145; latest main [34513780217](https://github.com/MycosoftLabs/mycosoft-mas/actions/runs/34513780217) **success** |
| [34505403818](https://github.com/MycosoftLabs/mindex/actions/runs/34505403818) | platform-one-build | `8aea4851` (then superseded) | `build-hardened-image` | pytest plugin flag — fixed by PRs 13–15; latest main [34513294545](https://github.com/MycosoftLabs/mindex/actions/runs/34513294545) **success** |

Lint & Type Check and Unit Tests on website **passed**. Instant Deploy (fast) was **skipped** (no `[fast]`). No 187 cutover from these red runs.

Product on `main` (`e4e69d50`) was **not** reverted: ITDX tabs, Earth Sim Live Data binds, personnel, governor work, and the synthetic briefing stay in tree.

## Fix (website PR 312)

- Raise Next.js build heap to 8192 MB (`package.json` `build`, CI `NODE_OPTIONS`, `Dockerfile` / `Dockerfile.production` builder stage).
- Add 8 GB swap on GitHub `lint-and-build` jobs so runners do not kernel-OOM.
- `[no-deploy]` / `[ci-only]` / `[hold-187]` on the merge commit skips `Deploy to Production` and Instant Deploy cutover. Earth Sim viewport-cull / memory governor is **not** in `e4e69d50`; do not cut 187.

Do **not** revert ITDX tabs, Live Data, personnel, governor, or briefing. Do **not** require `SOURCERY_TOKEN`.

## Arraylake (not fixed in this SHA)

Scheduled bake still fails SSH through the Cloudflare tunnel. Do not start a second 187 website cutover from this note.

## Verify

1. `CI` / `Website CI` `lint-and-build` green.
2. Mycosoft CI/CD `Build & Push Image` green; `Deploy to Production` skipped when the commit message has `[no-deploy]` / `[hold-187]`.
3. Origin `192.168.0.187:3000` unchanged by this SHA.
