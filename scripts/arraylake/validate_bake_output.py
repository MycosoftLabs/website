#!/usr/bin/env python3
"""Validate an Arraylake bake before a scheduled job may publish it.

This is intentionally credential-free. It checks only the local artifact contract and
fails closed when manifests are absent, malformed, empty, or reference missing frames.
"""

from __future__ import annotations

import json
import math
import struct
import sys
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def fail(message: str) -> None:
    raise ValueError(message)


def safe_child(parent: Path, relative: object) -> Path:
    if not isinstance(relative, str) or not relative:
        fail("frame path is missing")
    candidate = (parent / relative).resolve()
    try:
        candidate.relative_to(parent.resolve())
    except ValueError as exc:
        raise ValueError(f"frame path escapes manifest directory: {relative!r}") from exc
    return candidate


def validate_bounds(value: object) -> None:
    if not isinstance(value, list) or len(value) != 4:
        fail("bounds must contain west, south, east, north")
    if not all(isinstance(item, (int, float)) and math.isfinite(item) for item in value):
        fail("bounds must be finite numbers")
    west, south, east, north = value
    if west >= east or south >= north:
        fail("bounds are not ordered")


def validate_png(path: Path) -> None:
    with path.open("rb") as handle:
        header = handle.read(24)
    if len(header) != 24 or header[:8] != PNG_SIGNATURE or header[12:16] != b"IHDR":
        fail(f"invalid PNG frame: {path.name}")
    width, height = struct.unpack(">II", header[16:24])
    if width < 1 or height < 1:
        fail(f"empty PNG frame: {path.name}")


def validate_wind_grid(path: Path) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    width = payload.get("width")
    height = payload.get("height")
    if not isinstance(width, int) or not isinstance(height, int) or width < 1 or height < 1:
        fail(f"invalid wind-grid dimensions: {path.name}")
    expected = width * height
    for component in ("u", "v"):
        values = payload.get(component)
        if not isinstance(values, list) or len(values) != expected:
            fail(f"invalid wind-grid {component} length: {path.name}")
    validate_bounds(payload.get("bounds"))


def validate_manifest(path: Path) -> int:
    payload = json.loads(path.read_text(encoding="utf-8"))
    for key in ("dataset", "variable", "render", "updated"):
        if not isinstance(payload.get(key), str) or not payload[key]:
            fail(f"{path}: missing {key}")
    render = payload["render"]
    if render not in {"raster", "wind"}:
        fail(f"{path}: unsupported render {render!r}")
    validate_bounds(payload.get("bounds"))
    frames = payload.get("frames")
    if not isinstance(frames, list) or not frames:
        fail(f"{path}: no frames")
    for index, frame in enumerate(frames):
        if not isinstance(frame, dict):
            fail(f"{path}: frame {index} is not an object")
        field = "grid" if render == "wind" else "image"
        other = "image" if render == "wind" else "grid"
        if other in frame:
            fail(f"{path}: frame {index} mixes raster and wind contracts")
        target = safe_child(path.parent, frame.get(field))
        if not target.is_file():
            fail(f"{path}: referenced frame is missing: {target.name}")
        if render == "wind":
            validate_wind_grid(target)
        else:
            validate_png(target)
    return len(frames)


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "fields_out").resolve()
    if not root.is_dir():
        print(f"ERROR: bake output directory does not exist: {root}", file=sys.stderr)
        return 1
    manifests = sorted(root.rglob("manifest.json"))
    if not manifests:
        print("ERROR: bake output contains no manifests", file=sys.stderr)
        return 1
    total_frames = 0
    failures: list[str] = []
    for manifest in manifests:
        try:
            total_frames += validate_manifest(manifest)
        except Exception as exc:  # report every bad manifest in one bounded pass
            failures.append(f"{manifest.relative_to(root)}: {exc}")
    if failures:
        for failure in failures:
            print(f"ERROR: {failure}", file=sys.stderr)
        print(f"FAILED: {len(failures)} invalid manifest(s)", file=sys.stderr)
        return 1
    print(f"OK: {len(manifests)} manifest(s), {total_frames} referenced frame(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
