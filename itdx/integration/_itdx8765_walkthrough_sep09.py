#!/usr/bin/env python3
import json
import re
import urllib.request
from pathlib import Path

env = {}
for line in Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-itdx-codex-v13\.env.local").read_text(encoding="utf-8").splitlines():
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
token = env["ITDX_BACKEND_TOKEN"]
headers = {"Authorization": "Bearer " + token}


def get(path):
    req = urllib.request.Request("http://127.0.0.1:8765" + path, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()
        return resp.status, resp.headers.get("Content-Type"), data


out = {}
status, ct, html = get("/index.html")
text = re.sub(r"<script[\s\S]*?</script>", " ", html.decode("utf-8", "replace"), flags=re.I)
text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
plain = re.sub(r"<[^>]+>", " ", text)
plain = re.sub(r"\s+", " ", plain).strip()
heads = [re.sub(r"<[^>]+>", "", h).strip() for h in re.findall(r"<h[1-3][^>]*>(.*?)</h[1-3]>", html.decode("utf-8", "replace"), flags=re.I | re.S)]
out["index"] = {"status": status, "content_type": ct, "text_len": len(plain), "white": len(plain) < 40, "heads": heads[:16], "has_walkthrough": "walkthrough" in plain.lower()}
status, ct, html = get("/formspace.html")
out["formspace_html"] = {"status": status, "bytes": len(html)}
try:
    status, ct, body = get("/api/formspace")
    out["formspace_api"] = {"status": status, "bytes": len(body)}
except Exception as e:
    out["formspace_api"] = {"status": getattr(e, "code", None), "error": type(e).__name__}
status, ct, boot = get("/api/bootstrap")
bootj = json.loads(boot)
out["bootstrap"] = {
    "status": status,
    "version": bootj.get("version"),
    "documents": len(bootj.get("documents") or []),
    "tasks": list(bootj.get("tasks") or [])[:8] if isinstance(bootj.get("tasks"), list) else type(bootj.get("tasks")).__name__,
}
Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-itdx-codex-v13\itdx\integration\_itdx8765_walkthrough_sep09.json").write_text(
    json.dumps(out, indent=2), encoding="utf-8"
)
print(json.dumps(out, indent=2)[:2500])
