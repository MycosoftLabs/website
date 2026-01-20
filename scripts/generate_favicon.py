#!/usr/bin/env python3
"""
Generate public/favicon.ico from the existing PNG icons.

Uses real existing artwork (no mock assets).
"""

from __future__ import annotations

from pathlib import Path


def main() -> None:
    try:
        from PIL import Image
    except Exception as exc:  # pragma: no cover
        raise SystemExit("Pillow is required (pip install pillow).") from exc

    root = Path(__file__).resolve().parents[1]
    public_dir = root / "public"
    src = public_dir / "icon-light-32x32.png"
    if not src.exists():
        raise SystemExit(f"Missing source icon: {src}")

    out = public_dir / "favicon.ico"

    img = Image.open(src).convert("RGBA")
    # Include multiple sizes for better compatibility.
    sizes = [(16, 16), (32, 32), (48, 48)]
    img.save(out, format="ICO", sizes=sizes)

    print(f"[OK] wrote {out}")


if __name__ == "__main__":
    main()

