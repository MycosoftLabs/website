# CI Main Failures Fix — September 10, 2026

**Date:** September 10, 2026  
**Status:** Website main `CI` green. Docker image build green. **No 187 cutover.**  
**Repos:** `MycosoftLabs/website`, `MycosoftLabs/mycosoft-mas` (latest main green), `MycosoftLabs/mindex` (latest main green)  
**RJ Ricasata = CFO.** Mycosoft is pursuing CMMC L2 — this document does not claim CMMC compliance.

## Failed runs (root cause)

| Run | Workflow | Cause | Fix SHA | New status |
|---|---|---|---|---|
| [34529513071](https://github.com/MycosoftLabs/website/actions/runs/34529513071) | CI (main, PR 311 `e4e69d50`) | `next build` V8 heap ~4 GB, exit 134 | [8730266e](https://github.com/MycosoftLabs/website/commit/8730266e5d184e348665e033aab5bc240394e690) | **success** — [34533704688](https://github.com/MycosoftLabs/website/actions/runs/34533704688) |
| [34529513106](https://github.com/MycosoftLabs/website/actions/runs/34529513106) | Mycosoft CI/CD (main) | Same OOM in `Dockerfile.production` `NODE_OPTIONS=4096` | `8730266e` | **Build & Push success**; Deploy skipped — [34533704691](https://github.com/MycosoftLabs/website/actions/runs/34533704691) |
| [34529475634](https://github.com/MycosoftLabs/website/actions/runs/34529475634) | CI (PR 311) | Same heap OOM | `8730266e` (via PR 312) | superseded; PR 312 `lint-and-build` **pass** [34533671307](https://github.com/MycosoftLabs/website/actions/runs/34533671307) |
| [34529475663](https://github.com/MycosoftLabs/website/actions/runs/34529475663) | Website CI (PR 311) | Same heap OOM | `8730266e` | superseded; PR 312 Website CI **pass** [34533671337](https://github.com/MycosoftLabs/website/actions/runs/34533671337) |
| [34529275420](https://github.com/MycosoftLabs/website/actions/runs/34529275420) | Mycosoft CI/CD (PR 310) | Same class | `8730266e` | superseded by heap raise |
| [34505942043](https://github.com/MycosoftLabs/mycosoft-mas/actions/runs/34505942043) | mas-ci | `ModuleNotFoundError: mycosoft_mas.nlm.formspace.contracts` | MAS PR 145 | latest main **success** [34513780217](https://github.com/MycosoftLabs/mycosoft-mas/actions/runs/34513780217) |
| [34505403818](https://github.com/MycosoftLabs/mindex/actions/runs/34505403818) | platform-one-build | pytest plugin flag | MINDEX PRs 13–15 | latest main **success** [34513294545](https://github.com/MycosoftLabs/mindex/actions/runs/34513294545) |

Scheduled Arraylake field bake remains red (Cloudflare Tunnel SSH). Not this SHA. Do not start a 187 website cutover from that lane.

## What we changed (website)

- Raised Next.js build heap to **8192 MB** (`package.json` `build`, CI `NODE_OPTIONS`, `Dockerfile` / `Dockerfile.production`).
- Added 8 GB swap on GitHub `lint-and-build` jobs.
- `[no-deploy]` / `[ci-only]` / `[hold-187]` **or** file `.github/HOLD_187_DEPLOY` skips `Deploy to Production` and Instant Deploy.

PR 312 merge commit `8730266e` includes `[no-deploy]`. Instant Deploy stayed skipped. **187 was not cut.**

Product was **not** reverted: ITDX tabs, Live Data, personnel, governor, briefing. PR 313 later shipped governor + live movers + personnel (`8d6dfdcb`). That merge's CI/CD run [34537141722](https://github.com/MycosoftLabs/website/actions/runs/34537141722) was **cancelled** so it could not blue/green 187.

## Verify

1. Main `CI` `34533704688` success.
2. Main `Build & Push Image` success; `Deploy to Production` skipped on `34533704691`.
3. Origin `192.168.0.187:3000` unchanged by the heap-fix SHA.
4. Lift 187 only by deleting `.github/HOLD_187_DEPLOY` when Morgan authorizes Instant Deploy.
