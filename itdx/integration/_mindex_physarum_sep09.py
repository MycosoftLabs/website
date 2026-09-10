#!/usr/bin/env python3
"""MINDEX real query. Does not print tokens."""
import json
import urllib.request
from pathlib import Path

env = {}
for p in (
    Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\MAS\mycosoft-mas\.credentials.local"),
    Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-itdx-codex-v13\.env.local"),
):
    if not p.is_file():
        continue
    for line in p.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))

req = urllib.request.Request(
    "http://192.168.0.189:8000/api/mindex/unified-search/earth?q=physarum",
    headers={
        "Accept": "application/json",
        "X-Internal-Token": env.get("MINDEX_INTERNAL_TOKEN", ""),
        "X-Internal-Service": env.get("MINDEX_INTERNAL_SERVICE_NAME", ""),
    },
)
with urllib.request.urlopen(req, timeout=20) as resp:
    body = json.loads(resp.read())

counts = {}
for k, v in body.items():
    if isinstance(v, list):
        counts[k] = len(v)
    elif k in {"total", "count"} or str(k).endswith("_count"):
        counts[k] = v
    elif isinstance(v, dict) and any(isinstance(x, list) for x in v.values()):
        counts[k] = {ik: len(iv) for ik, iv in v.items() if isinstance(iv, list)}

sample = None
for key in ("results", "items", "taxa", "species", "hits"):
    rows = body.get(key)
    if isinstance(rows, list) and rows:
        row = rows[0]
        if isinstance(row, dict):
            sample = {sk: row.get(sk) for sk in list(row)[:8]}
        break

out = {
    "status": resp.status,
    "query": body.get("query"),
    "domains_searched": body.get("domains_searched"),
    "counts": counts,
    "top_keys": list(body)[:24],
    "sample": sample,
}
Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-itdx-codex-v13\itdx\integration\_mindex_physarum_sep09.json").write_text(
    json.dumps(out, indent=2, default=str), encoding="utf-8"
)
print(json.dumps(out, default=str)[:1800])
