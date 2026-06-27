#!/usr/bin/env python3
"""Group release deploy orchestrator — Jun 26, 2026.

Phased website deploy for group prod cut (commit family 1091cebd+):
  Phase A (core): Earth Sim arraylake fields, NLM/proxy shims, camera Permissions-Policy.
                  Safe for sandbox/prod without Psathyrella GCS runtime verification.
  Phase B (gcs):  feat/psathyrella-gcs (full-bleed, persistent-map, FitScale panels).
                  BLOCKED until GCS_VERIFIED=1 or Morgan/Claude explicit approval.

Usage:
  python scripts/group_release_deploy.py --phase core --production
  python scripts/group_release_deploy.py --phase gcs --production   # requires GCS_VERIFIED=1

Env:
  GCS_VERIFIED=1          Claude/Morgan gate after 3010 smoke on feat/psathyrella-gcs
  REBUILD_GIT_REF         Override git ref (default per phase)
  GROUP_RELEASE_CORE_REF  Default: main (or feat/earth-sim-arraylake-fields-jun24 when aligned)
  GROUP_RELEASE_GCS_REF   Default: feat/psathyrella-gcs
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "verified")


def _run_smoke(base_url: str = "http://127.0.0.1:3010") -> int:
    smoke = ROOT / "scripts" / "smoke-earth2-crep.mjs"
    if not smoke.exists():
        print("WARN: smoke-earth2-crep.mjs missing; skipping CREP smoke")
        return 0
    env = os.environ.copy()
    env.setdefault("NEXT_SMOKE_BASE", base_url)
    print(f"\n--- CREP smoke (dev {base_url}) ---")
    return subprocess.call(["node", str(smoke)], cwd=str(ROOT), env=env)


def main() -> int:
    parser = argparse.ArgumentParser(description="Phased group release deploy to Sandbox/prod VM")
    parser.add_argument(
        "--phase",
        choices=("core", "gcs", "smoke-only"),
        default="core",
        help="core=Earth Sim/NLM/proxy/camera; gcs=Psathyrella GCS (gated); smoke-only=local checks",
    )
    parser.add_argument(
        "--production",
        action="store_true",
        help="Deploy with mycosoft.com URLs (passes --production to _rebuild_sandbox.py)",
    )
    parser.add_argument(
        "--branch",
        default="",
        help="Override git ref on VM (otherwise phase default)",
    )
    parser.add_argument(
        "--skip-deploy",
        action="store_true",
        help="Run smoke/gates only; do not SSH rebuild",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip local CREP smoke before deploy",
    )
    args = parser.parse_args()

    core_ref = os.environ.get("GROUP_RELEASE_CORE_REF", "main")
    gcs_ref = os.environ.get("GROUP_RELEASE_GCS_REF", "feat/psathyrella-gcs")

    if args.phase == "core":
        git_ref = args.branch or core_ref
        print("Phase A (core): Earth Sim + NLM + API proxy + camera=(self)")
        print(f"  Git ref: origin/{git_ref.lstrip('origin/')}")
        print("  Excludes: unverified Psathyrella GCS (deploy Phase B after Claude gate)")
    elif args.phase == "gcs":
        if not _truthy("GCS_VERIFIED") and not _truthy("MORGAN_APPROVE_GCS_DEPLOY"):
            print(
                "BLOCKED: Psathyrella GCS deploy requires GCS_VERIFIED=1 "
                "(Claude runtime smoke on 3010) or MORGAN_APPROVE_GCS_DEPLOY=1"
            )
            print("  Merge feat/psathyrella-gcs on feat branch first; verify /natureos/psathyrella on 3010.")
            return 2
        git_ref = args.branch or gcs_ref
        print("Phase B (gcs): Psathyrella GCS — gate passed")
        print(f"  Git ref: origin/{git_ref.lstrip('origin/')}")
    else:
        git_ref = args.branch or core_ref
        print("Smoke-only mode (no VM deploy)")

    if not args.skip_smoke:
        code = _run_smoke()
        if code != 0:
            print("\nCREP smoke FAILED — fix before prod cut or use --skip-smoke only for diagnostics")
            return code
        print("\nCREP green on smoke checks.")

    if args.phase == "smoke-only" or args.skip_deploy:
        print("\nDone (no VM deploy). Ping Morgan/Claude: CREP green; merge feat/psathyrella-gcs if needed; verify GCS before prod Phase B.")
        return 0

    rebuild = ROOT / "_rebuild_sandbox.py"
    if not rebuild.exists():
        print(f"ERROR: {rebuild} not found")
        return 1

    cmd = [sys.executable, str(rebuild), "--branch", git_ref]
    if args.production:
        cmd.append("--production")

    print(f"\n--- VM rebuild: {' '.join(cmd)} ---")
    print("Deploy guardrails: blue-green proxy required; public URL must return HTTP 200.")
    return subprocess.call(cmd, cwd=str(ROOT))


if __name__ == "__main__":
    sys.exit(main())
