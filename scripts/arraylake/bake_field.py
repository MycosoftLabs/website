#!/usr/bin/env python3
"""
Earth Simulator — Arraylake FIELD bake job (data-plane; run in Cursor/server).

Reads the FIELD_REGISTRY catalog from the deployed BFF (/api/crep/field/_catalog — the
single source of truth) and, for each dataset+variable, bakes animation frames into
ARRAYLAKE_FIELD_OUT (the directory ARRAYLAKE_FIELD_BASE serves) that the website's
<FieldRasterLayer> / <FieldWindLayer> consume:

  scalar (render=raster):  per-timestep equirectangular RGBA PNG, colorized by the
                           registry ramp + valueRange → {out}/{dataset}/{variable}/{i}.png
  wind   (render=wind):    per-timestep velocity-grid JSON {width,height,bounds,u,v}
                           (row-major, north->south) → {out}/{dataset}/{variable}/{i}.json
  + manifest.json per variable: { frames:[{t,image|grid}], bounds, updated }

Static cubes (canopy-height, biomass) bake ONE frame. Live cubes bake the last `frames`
timesteps; re-run on a cron to refresh.

Usage:
    pip install "arraylake" "zarr>=3" "icechunk" "xarray>=2024.9" "numpy" "pillow" "rioxarray" "pyproj"
    arraylake auth login                                  # or ARRAYLAKE_TOKEN
    export ARRAYLAKE_FIELD_OUT=/opt/mycosoft/media/website/assets/fields   # = ARRAYLAKE_FIELD_BASE mount
    python bake_field.py                                  # bake all
    python bake_field.py era5 t2m                         # bake one dataset+variable

CAVEATS to tune per cube after introspection:
  - PROJECTED grids (HRRR Lambert-conformal, MRMS) are NOT regular lat/lon — reproject to
    EPSG:4326 with rioxarray (da.rio.reproject("EPSG:4326")) before to_latlon_2d().
  - Sentinel-2 'truecolor' is a 3-band composite, not a scalar+ramp — bake B04/B03/B02 to
    an RGB PNG directly (special-case below; left as a TODO stub).
Read-only on the cubes (readonly_session).
"""
import os
import sys
import json
import datetime as dt
import urllib.request

import numpy as np

CATALOG_URL = os.environ.get(
    "ARRAYLAKE_CATALOG_URL",
    os.environ.get("NEXT_PUBLIC_BASE_URL", "http://localhost:3010").rstrip("/") + "/api/crep/field/_catalog",
)
OUT = os.environ.get("ARRAYLAKE_FIELD_OUT", "./fields_out")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def fetch_catalog():
    with urllib.request.urlopen(CATALOG_URL, timeout=30) as r:
        return json.load(r)["datasets"]


def _rgb(c):
    c = c.strip()
    if c.startswith("rgb"):
        nums = c[c.find("(") + 1:c.find(")")].split(",")
        vals = [float(x) for x in nums]
        r, g, b = (int(vals[0]), int(vals[1]), int(vals[2]))
        a = int(vals[3] * 255) if len(vals) > 3 else 255
        return (r, g, b, a)
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)


def build_lut(ramp, n=256):
    """ramp = [[pos,color], ...] normalized 0..1 -> (n,4) uint8 LUT."""
    stops = sorted(((float(p), _rgb(c)) for p, c in ramp), key=lambda s: s[0])
    lut = np.zeros((n, 4), np.uint8)
    for i in range(n):
        t = i / (n - 1)
        lo, hi = stops[0], stops[-1]
        for j in range(len(stops) - 1):
            if stops[j][0] <= t <= stops[j + 1][0]:
                lo, hi = stops[j], stops[j + 1]
                break
        span = (hi[0] - lo[0]) or 1.0
        f = (t - lo[0]) / span
        lut[i] = [int(lo[1][k] + (hi[1][k] - lo[1][k]) * f) for k in range(4)]
    return lut


def colorize(arr2d, vmin, vmax, lut):
    from PIL import Image
    a = np.asarray(arr2d, dtype=np.float32)
    norm = np.clip((a - vmin) / ((vmax - vmin) or 1.0), 0, 1)
    idx = np.nan_to_num(norm * 255, nan=0).astype(np.uint8)
    rgba = lut[idx]
    rgba[~np.isfinite(a)] = (0, 0, 0, 0)  # transparent where no data
    return Image.fromarray(rgba, "RGBA")


def open_cube(repo):
    from arraylake import Client
    import xarray as xr
    client = Client()
    r = client.get_repo(repo)
    session = r.readonly_session(branch="main")
    return xr.open_zarr(session.store, zarr_format=3, consolidated=False)


def find_dim(da, names):
    dims = [str(d).lower() for d in da.dims]
    for n in names:
        for i, d in enumerate(dims):
            if d == n:
                return da.dims[i]
    for n in names:
        for i, d in enumerate(dims):
            if n in d:
                return da.dims[i]
    return None


def needs_reproject(ds):
    """CONUS projected grids (HRRR Lambert, MRMS) must be reprojected before to_latlon_2d."""
    if ds.get("reproject"):
        return True
    return ds.get("coverage") == "conus"


def ensure_latlon(da, native_crs=None):
    """Projected x/y grids → EPSG:4326 with 1-D lat/lon coords."""
    import rioxarray  # noqa: F401

    latd = find_dim(da, ["latitude", "lat", "y"])
    if latd:
        lat = np.asarray(da[latd].values, dtype=np.float64)
        if lat.ndim == 1 and -90.5 <= lat.min() and lat.max() <= 90.5:
            return da
    crs = native_crs or getattr(da.rio, "crs", None) or da.attrs.get("crs") or da.attrs.get("spatial_ref")
    if not crs:
        gm = da.attrs.get("grid_mapping")
        if gm and gm in da.coords:
            crs = da.coords[gm].attrs.get("crs") or da.coords[gm].attrs.get("spatial_ref")
    if not crs:
        raise ValueError(
            f"projected grid with no CRS on {list(da.dims)} — set nativeCrs on the dataset in the registry "
            "or ensure grid_mapping attrs exist; introspect.py should reveal the native EPSG"
        )
    da = da.rio.write_crs(crs)
    return da.rio.reproject("EPSG:4326")


def prepare_frame(slice_da, ds, max_dim=1440):
    """Reproject if needed, then normalize to north-first lat/lon with decimated bounds."""
    if needs_reproject(ds):
        slice_da = ensure_latlon(slice_da, ds.get("nativeCrs"))
    return to_latlon_2d(slice_da, max_dim=max_dim)


def to_latlon_2d(frame_da, max_dim=1440):
    """Reorder a 2-D slice to (lat north->south, lon west->east), decimate to <= max_dim
    per axis, and return (arr, bounds). bounds is derived from the DECIMATED coordinate
    arrays so it describes the returned grid EXACTLY (no full-res/decimated span desync)."""
    latd = find_dim(frame_da, ["latitude", "lat", "y"])
    lond = find_dim(frame_da, ["longitude", "lon", "x"])
    if not latd or not lond:
        raise ValueError(f"no lat/lon dims in {frame_da.dims} (projected grid? reproject to EPSG:4326 first)")
    da = frame_da.transpose(latd, lond)
    lats = np.asarray(da[latd].values, dtype=np.float64)
    lons = np.asarray(da[lond].values, dtype=np.float64)
    arr = np.asarray(da.values, dtype=np.float32)
    # Fail LOUD on projected grids (HRRR Lambert, MRMS): their x/y coords are METERS, not
    # degrees, and would otherwise bake nonsense "bounds". Reproject to EPSG:4326 first.
    if lats.min() < -90.5 or lats.max() > 90.5 or lons.min() < -180.5 or lons.max() > 360.5:
        raise ValueError(
            f"{latd}/{lond} are not degrees (lat[{lats.min():.1f},{lats.max():.1f}] "
            f"lon[{lons.min():.1f},{lons.max():.1f}]) — projected grid? reproject to EPSG:4326 first"
        )
    if lats[0] < lats[-1]:                 # rows north -> south
        arr = arr[::-1, :]
        lats = lats[::-1]
    if lons.max() > 180:                   # 0..360 -> -180..180
        lons = np.where(lons > 180, lons - 360, lons)
        order = np.argsort(lons)
        lons = lons[order]
        arr = arr[:, order]
    # Decimate data AND coords together so bounds match the returned grid exactly.
    sy = max(1, arr.shape[0] // max_dim)
    sx = max(1, arr.shape[1] // max_dim)
    arr = arr[::sy, ::sx]
    lats = lats[::sy]
    lons = lons[::sx]
    bounds = [float(lons.min()), float(lats.min()), float(lons.max()), float(lats.max())]
    return arr, bounds


def last_steps(da, timed, k):
    if not timed:
        return [(None, da)]
    n = da.sizes[timed]
    out = []
    for i in range(max(0, n - k), n):
        t = da[timed].values[i]
        try:
            ts = np.datetime_as_string(t, unit="s") + "Z"
        except Exception:
            ts = str(t)
        out.append((ts, da.isel({timed: i})))
    return out


def bake_scalar(ds, v, out_dir):
    cube = open_cube(ds["repo"])
    da = cube[v["zarrVar"]]
    timed = None if ds.get("static") else find_dim(da, [(ds.get("timeDim") or "time").lower(), "time", "valid_time", "step"])
    lut = build_lut(v.get("ramp") or [[0, "#000000"], [1, "#ffffff"]])
    # Decode the slices we actually bake FIRST (each read once). This also lets us derive a
    # value range from just those slices instead of materializing the whole cube (.values on
    # an 86-yr hourly global DataArray = OOM).
    decoded, bounds = [], None
    for t, slice_da in last_steps(da, timed, ds.get("frames", 12)):
        arr, bounds = prepare_frame(slice_da, ds, max_dim=1440)
        decoded.append((t, arr))
    vr = v.get("valueRange")
    if vr:
        vmin, vmax = vr
    else:
        vmin = float(min(np.nanmin(a) for _, a in decoded))
        vmax = float(max(np.nanmax(a) for _, a in decoded))
    frames = []
    for i, (t, arr) in enumerate(decoded):
        colorize(arr, vmin, vmax, lut).save(os.path.join(out_dir, f"{i}.png"))
        frames.append({"t": t, "image": f"{i}.png"})
    return frames, bounds


def bake_wind(ds, v, out_dir):
    cube = open_cube(ds["repo"])
    ua, va = cube[v["zarrVar"]], cube[v["zarrVarV"]]
    timed = find_dim(ua, [(ds.get("timeDim") or "time").lower(), "time", "valid_time", "step"])
    frames, bounds = [], None
    su = last_steps(ua, timed, ds.get("frames", 8))
    sv = last_steps(va, timed, ds.get("frames", 8))
    for i, ((t, us), (_, vs)) in enumerate(zip(su, sv)):
        au, bounds = prepare_frame(us, ds, max_dim=360)
        av, _ = prepare_frame(vs, ds, max_dim=360)
        if au.shape != av.shape:
            raise ValueError(f"u/v shape mismatch {au.shape} vs {av.shape}")
        h, w = au.shape
        grid = {
            "width": int(w), "height": int(h), "bounds": bounds,
            "u": np.nan_to_num(au).round(2).flatten().tolist(),
            "v": np.nan_to_num(av).round(2).flatten().tolist(),
        }
        with open(os.path.join(out_dir, f"{i}.json"), "w") as f:
            json.dump(grid, f)
        frames.append({"t": t, "grid": f"{i}.json"})
    return frames, bounds


def _stretch_band(arr):
    finite = arr[np.isfinite(arr)]
    if finite.size == 0:
        return np.zeros_like(arr, dtype=np.uint8)
    lo, hi = np.percentile(finite, [2, 98])
    span = (hi - lo) or 1.0
    scaled = np.clip((arr - lo) / span, 0, 1)
    return (np.nan_to_num(scaled, nan=0) * 255).astype(np.uint8)


def bake_truecolor(ds, v, out_dir):
    """Sentinel-2 B04/B03/B02 → RGB PNG per timestep (no ramp)."""
    from PIL import Image

    bands = [b.strip() for b in v["zarrVar"].split(",") if b.strip()]
    if len(bands) != 3:
        raise ValueError(f"truecolor expects 3 comma-separated bands, got {v['zarrVar']!r}")
    cube = open_cube(ds["repo"])
    ref = cube[bands[0]]
    timed = None if ds.get("static") else find_dim(ref, [(ds.get("timeDim") or "time").lower(), "time", "valid_time", "step"])
    decoded, bounds = [], None
    for t, _ in last_steps(ref, timed, ds.get("frames", 4)):
        planes = []
        for band in bands:
            da = cube[band]
            slice_da = da if not timed else da.sel({timed: t}, method="nearest")
            arr, bounds = prepare_frame(slice_da, ds, max_dim=2048)
            planes.append(_stretch_band(arr))
        if not all(p.shape == planes[0].shape for p in planes):
            raise ValueError(f"RGB band shape mismatch: {[p.shape for p in planes]}")
        decoded.append((t, np.dstack(planes)))
    frames = []
    for i, (t, rgb) in enumerate(decoded):
        Image.fromarray(rgb, "RGB").save(os.path.join(out_dir, f"{i}.png"))
        frames.append({"t": t, "image": f"{i}.png"})
    return frames, bounds


def bake_one(ds, v, out_dir):
    if v["key"] == "truecolor" or "," in v.get("zarrVar", ""):
        return bake_truecolor(ds, v, out_dir)
    if v["render"] == "wind":
        return bake_wind(ds, v, out_dir)
    return bake_scalar(ds, v, out_dir)


def main():
    cats = fetch_catalog()
    only = sys.argv[1:]  # optional: dataset [variable]
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for ds in cats:
        if only and ds["id"] != only[0]:
            continue
        for v in ds["variables"]:
            if len(only) > 1 and v["key"] != only[1]:
                continue
            out_dir = os.path.join(OUT, ds["id"], v["key"])
            os.makedirs(out_dir, exist_ok=True)
            try:
                frames, bounds = bake_one(ds, v, out_dir)
                man = {"dataset": ds["id"], "variable": v["key"], "render": v["render"],
                       "frames": frames, "bounds": bounds, "updated": now}
                with open(os.path.join(out_dir, "manifest.json"), "w") as f:
                    json.dump(man, f, indent=2)
                log(f"[ok] {ds['id']}/{v['key']}: {len(frames)} frames -> {out_dir}")
            except Exception as e:
                log(f"[ERR] {ds['id']}/{v['key']}: {e!r}")


if __name__ == "__main__":
    main()
