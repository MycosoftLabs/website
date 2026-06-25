#!/usr/bin/env python3
"""
Earth Simulator — Arraylake cube INTROSPECTION (data-plane; run in Cursor/server).

Connects to each mycosoft/* repo and dumps its structure — group tree, arrays, dims,
coordinate extents (time span, lat/lon grid), units, chunking — to a JSON. This is the
FIRST step of wiring the cubes in: it reveals the REAL `zarrVar` / `timeDim` names so
the `VERIFY`-marked fields in lib/crep/fields/registry.ts can be confirmed, and so the
bake job (bake_field.py) reads the right arrays.

Usage:
    pip install "arraylake" "zarr>=3" "icechunk"
    arraylake auth login                  # browser OAuth (interactive) — or set ARRAYLAKE_TOKEN
    python introspect.py                  # all repos → arraylake_cubes.json
    python introspect.py mycosoft/era5    # one repo (also prints to stdout)

Read-only (readonly_session) — never writes to the cubes.
"""
import json
import sys
import traceback

REPOS = [
    "mycosoft/era5",
    "mycosoft/noa-hrrr-forcast48hr",
    "mycosoft/helios-solar-irradiance",
    "mycosoft/ALIVE-hourly",
    "mycosoft/canopy-height",
    "mycosoft/global-sentinel2-mosaics",
    "mycosoft/GEO-stero-wind",
    "mycosoft/biomass-atlas-sample",
    "mycosoft/global-aboveground-biomass",
    "mycosoft/noaa-mrms-conus-hourly",
]


def introspect(repo, client, zarr):
    r = client.get_repo(repo)
    session = r.readonly_session(branch="main")
    root = zarr.open_group(session.store, zarr_format=3, mode="r")
    info = {"repo": repo, "arrays": {}, "groups": [], "root_attrs": _safe_attrs(root.attrs), "crs_hints": []}

    def walk(group, prefix=""):
        for name, arr in group.arrays():
            path = f"{prefix}{name}"
            meta = {
                "shape": list(arr.shape),
                "dtype": str(arr.dtype),
                "chunks": list(arr.chunks),
                "dims": list(arr.attrs.get("_ARRAY_DIMENSIONS", [])),
                "attrs": _safe_attrs(arr.attrs),
            }
            gm = arr.attrs.get("grid_mapping")
            if gm:
                try:
                    coord = group[gm] if gm in group else None
                    if coord is not None:
                        for key in ("crs", "spatial_ref", "GeoTransform"):
                            if key in coord.attrs:
                                info["crs_hints"].append({path: {gm: {key: str(coord.attrs[key])[:200]}}})
                except Exception:
                    pass
            # coordinate extent for small 1-D coords (time / lat / lon)
            if arr.ndim == 1 and arr.shape[0] <= 200000:
                try:
                    vals = arr[:]
                    meta["first"] = str(vals[0])
                    meta["last"] = str(vals[-1])
                    meta["n"] = int(arr.shape[0])
                except Exception:
                    pass
            info["arrays"][path] = meta
        for gname, sub in group.groups():
            info["groups"].append(f"{prefix}{gname}")
            walk(sub, prefix=f"{prefix}{gname}/")

    walk(root)
    if not info["crs_hints"]:
        del info["crs_hints"]
    return info


def _safe_attrs(attrs):
    out = {}
    for k, v in dict(attrs).items():
        out[k] = v if isinstance(v, (str, int, float, bool, type(None))) else str(v)
    return out


def main():
    import importlib
    zarr = importlib.import_module("zarr")
    from arraylake import Client

    client = Client()
    targets = sys.argv[1:] or REPOS
    out = {}
    for repo in targets:
        try:
            out[repo] = introspect(repo, client, zarr)
            print(f"[ok] {repo}: {len(out[repo]['arrays'])} arrays", file=sys.stderr)
        except Exception as e:
            out[repo] = {"repo": repo, "error": repr(e), "tb": traceback.format_exc()[-1000:]}
            print(f"[ERR] {repo}: {e}", file=sys.stderr)

    with open("arraylake_cubes.json", "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2)[:6000])
    print("\n-> wrote arraylake_cubes.json", file=sys.stderr)


if __name__ == "__main__":
    main()
