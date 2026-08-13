"""CLI: init | once | run | inbox | status"""

from __future__ import annotations

import argparse
import json
import sys
import time

from .config import default_config_path, load_config, write_example
from .inbox import read_inbox
from .orchestrator import run_cycle


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="launchpad-myca",
        description="Local MYCA orchestrator for FUSARIUM Launchpad (customer machine).",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init", help="Write a local config file (gitignored / home dir)")
    p_init.add_argument("--force-path", default="", help="Override config path")

    p_once = sub.add_parser("once", help="Run one orchestrator cycle")
    p_once.add_argument("--dry-run", action="store_true", help="Do not POST results")

    p_run = sub.add_parser("run", help="Poll the tenant work queue until killed")
    p_run.add_argument("--dry-run", action="store_true")

    sub.add_parser("inbox", help="Show recent local proposals (human gate)")
    sub.add_parser("status", help="Show config path and whether BYO/lp_ keys are set (never print secrets)")

    args = parser.parse_args(argv)

    if args.cmd == "init":
        from pathlib import Path

        path = Path(args.force_path) if args.force_path else None
        dest = write_example(path)
        print(f"Wrote {dest}")
        print("1. In Launchpad: enroll a device (owner/admin) → copy agent.id")
        print("2. Settings → API keys → create lp_… with scope=agent (shown once)")
        print("3. Paste agent_id + workspace_api_key into the config")
        print("4. Optional: set byo_ai.api_key locally (never uploaded)")
        print("5. python -m launchpad_myca_harness once")
        return 0

    if args.cmd == "status":
        try:
            cfg = load_config()
        except SystemExit as e:
            print(e, file=sys.stderr)
            return 2
        print(
            json.dumps(
                {
                    "config": str(cfg.path),
                    "base_url": cfg.base_url,
                    "agent_id_set": bool(cfg.agent_id),
                    "workspace_api_key_set": bool(cfg.workspace_api_key),
                    "hmac_key_set": bool(cfg.hmac_key),
                    "byo_ai_set": cfg.byo_ai.configured,
                    "byo_provider": cfg.byo_ai.provider if cfg.byo_ai.configured else None,
                    "kill_switch": cfg.kill_switch,
                    "poll_seconds": cfg.poll_seconds,
                },
                indent=2,
            )
        )
        return 0

    if args.cmd == "inbox":
        rows = read_inbox()
        print(json.dumps({"proposals": rows, "count": len(rows)}, indent=2))
        return 0

    cfg = load_config()
    if args.cmd == "once":
        result = run_cycle(cfg, dry_run=bool(args.dry_run))
        print(json.dumps(result, indent=2, default=str))
        return 0 if result.get("ok") else 1

    if args.cmd == "run":
        print(f"Polling {cfg.base_url} every {cfg.poll_seconds}s. Ctrl+C to stop. Kill switch honors config.")
        while True:
            try:
                result = run_cycle(cfg, dry_run=bool(args.dry_run))
                print(json.dumps({"at": result.get("observed_at"), "synced": result.get("synced"), "proposals": result.get("proposals")}))
            except SystemExit as e:
                print(e, file=sys.stderr)
                return 2
            except RuntimeError as e:
                print(f"cycle error: {e}", file=sys.stderr)
            time.sleep(cfg.poll_seconds)

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
