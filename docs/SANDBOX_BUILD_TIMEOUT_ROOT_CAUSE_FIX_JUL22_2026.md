# Sandbox Build Timeout Root Cause & Fix

**Date:** July 22, 2026  
**Status:** Implemented  
**Scope:** Sandbox VM 187 website deployment path

## Root cause

The legacy `_rebuild_sandbox.py` path forced an uncached `docker build` on the
4.7 GiB Sandbox VM and allowed it to run for 14,400 seconds with no
no-progress detection. At diagnosis, only 895 MiB RAM was available and 3.7
GiB of the 8 GiB swap file was already in use; the build reached `next build`
and then remained stalled until the outer timeout cancelled it.

The subsequent `rw layer snapshot not found` was Docker/containerd fallout
after the cancelled build, not evidence of a source compilation error. Disk
capacity and inode availability were healthy, and the kernel log contained no
OOM-killer record for this incident.

## Delivered safeguards

- `_rebuild_sandbox.py` now prefers pulling
  `ghcr.io/mycosoftlabs/website:production-latest` and cuts it over through
  the existing blue/green deployment flow. A local build requires an explicit
  `--local-build` opt-in.
- A local build preflight rejects insufficient Docker disk space, insufficient
  available memory, an unresponsive Docker daemon, or another Docker/Next
  build already running.
- The build monitor now creates an isolated process group and stops it after
  20 minutes without new build-log output (configurable through
  `REBUILD_PROGRESS_TIMEOUT_SEC`), preserving the last 100 log lines for
  diagnosis. The 14,400-second value remains only an absolute safety cap.
- `--diagnose` reports VM disk, inodes, RAM/swap, Docker usage, active build
  processes, OOM evidence, and the previous build tail without deploying.
- SSH in this deploy script explicitly disables key and agent lookup so
  credential behavior is deterministic.

## Verification

```text
python -m py_compile _rebuild_sandbox.py
python _rebuild_sandbox.py --help
python _rebuild_sandbox.py --diagnose --branch main
```

The July 22 diagnostic confirmed 1.8 TiB free disk, 121M free inodes, no
active build, no OOM-killer entry, and a prior build log that stopped at
`next build` before cancellation. The current main commit's GitHub Actions
run built and pushed its GHCR image; its serialized VM blue/green cutover is
the authorized deployment owner.

## Operational rule

Use the CI/GHCR image path for Sandbox deploys. Do not start a concurrent
manual cutover while the serialized CI deployment is active. Use
`--local-build` only to recover when a verified registry image is unavailable
and the preflight passes.
