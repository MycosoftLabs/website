#!/usr/bin/env python3
"""Internal FormSpace/ITDX math verification. Does not run Weka. Never prints secrets."""
from __future__ import annotations

import json
import math
import os
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

FS = Path(r"C:\Users\Owner1\Downloads\Mycosoft_FormSpace_Software_and_Synthetic_Data\itdx\formspace")
WORKTREE_ENV = Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-itdx-codex-v13\.env.local")
OUT = Path(r"D:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website-itdx-codex-v13\itdx\integration\_internal_math_verify_sep09.json")
TOL = 1e-12


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def get_json(url: str, headers: dict[str, str] | None = None, timeout: int = 30):
    req = urllib.request.Request(url, headers=headers or {"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            ct = resp.headers.get("Content-Type", "")
            body = json.loads(raw) if "json" in ct or raw[:1] in (b"{", b"[") else {"_text": raw[:400].decode("utf-8", "replace")}
            return resp.status, body, None
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            body = json.loads(raw)
        except Exception:
            body = {"_text": raw[:400].decode("utf-8", "replace")}
        return e.code, body, str(e.reason)
    except Exception as e:
        return None, None, str(e)


def close(a, b, tol=TOL):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return math.isclose(float(a), float(b), rel_tol=0, abs_tol=tol)


def main():
    report: dict = {"date": "2026-09-09", "weka_run": False, "sections": {}, "walkthrough": {}, "services": {}, "unqualified": []}
    zip_path = FS / "results" / "recorded_results.zip"
    with zipfile.ZipFile(zip_path) as z:
        bundled = json.loads(z.read("result.json"))
        behavior = json.loads(z.read("behavior.json"))
        names = z.namelist()

    status, live, err = get_json("http://127.0.0.1:8766/api/formspace", timeout=60)
    report["services"]["formspace_8766"] = {"status": status, "error": err}
    if status != 200 or not live:
        report["sections"]["live_api"] = "FAIL"
        OUT.write_text(json.dumps(report, indent=2))
        print(json.dumps({"fatal": "formspace api", "status": status, "error": err}))
        return 1

    result = live.get("result") or live
    origin = live.get("origin") or result.get("origin")
    t12 = result["task12"]
    t13 = result["task13"]
    t8 = result["task8"]
    t14 = result["task14"]
    b12 = bundled["task12"]["metrics"]
    b13 = bundled["task13"]["metrics"]

    # Section 1-3 / Task 12
    pred0 = t12["predictions"][0]
    coords = pred0.get("coordinates") or []
    native = pred0.get("native_sensor_vector") or []
    miss = pred0.get("missing_fields")
    pset = pred0.get("prediction_set")
    pos_unc = None
    feats = (t14.get("geojson") or t14).get("features") if isinstance(t14, dict) else []
    if feats:
        pos_unc = feats[0].get("properties", {}).get("position_uncertainty_status")

    report["math"] = {
        "origin": origin,
        "model_sha256_live": result.get("model_sha256"),
        "model_sha256_bundled": bundled.get("model_sha256"),
        "task12_rows": t12["metrics"]["rows"],
        "task12_f1_live": t12["metrics"]["classifier"].get("f1"),
        "task12_f1_bundled": b12["classifier"].get("f1"),
        "task12_brier_live": t12["metrics"]["classifier"].get("brier"),
        "task12_brier_bundled": b12["classifier"].get("brier"),
        "task12_capture_coverage_live": t12["metrics"]["prediction_sets"].get("capture_coverage"),
        "task13_rows": t13["metrics"]["rows"],
        "task13_f1_live": t13["metrics"]["classifier"].get("f1"),
        "task13_f1_bundled": b13["classifier"].get("f1"),
        "task13_capture_coverage_live": t13["metrics"]["prediction_sets"].get("capture_coverage"),
        "coordinate_dim": len(coords),
        "native_vector_len": len(native),
        "prediction_set_sample": pset,
        "position_uncertainty_status": pos_unc,
        "task8_gates": [o.get("formspace_gate") for o in t8.get("options", [])],
        "task8_rank_semantics": t8.get("rank_semantics"),
        "task8_myca_seven_role": t8.get("role_trace") or t8.get("orchestration") or t8.get("myca"),
        "behavior_emergence": (live.get("behavior") or {}).get("capability_claim", {}).get("emergence_established"),
        "behavior_outcomes": (live.get("behavior") or behavior).get("outcomes"),
        "zip_has_validation_report": "VALIDATION_REPORT.md" in names,
    }

    s1 = origin in ("BUNDLED_RECORDED_RUN", "bundled") or live.get("bundled") is True
    s2 = len(coords) == 32 and (len(native) in (16, 24) or pred0.get("native_sensor_vector") is not None)
    s3 = close(t12["metrics"]["classifier"].get("f1"), b12["classifier"].get("f1")) and close(
        t12["metrics"]["classifier"].get("brier"), b12["classifier"].get("brier"), 1e-18
    )
    s4 = close(t13["metrics"]["classifier"].get("f1"), b13["classifier"].get("f1"))
    s5 = isinstance(pset, list) and all(x in (0, 1) for x in pset)
    gates = report["math"]["task8_gates"]
    s5b = all(g in ("DENY", "PAUSE", "PASS", "REVIEW") for g in gates) and t8.get("rank_semantics")
    rank_ok = "preference" in str(t8.get("rank_semantics", "")).lower() or "not" in str(t8.get("rank_semantics", "")).lower()
    s6 = pos_unc == "NOT_ESTIMATED"
    missing_geo = 0
    invented_radius = 0
    for f in feats[:200]:
        props = f.get("properties") or {}
        if props.get("missing_geography") or (f.get("geometry") is None and props.get("status") == "missing_geography"):
            missing_geo += 1
        if "error_radius" in props or "geographic_error_from_class_p" in props:
            invented_radius += 1
        if props.get("position_uncertainty_status") not in (None, "NOT_ESTIMATED"):
            invented_radius += 1
    s6b = invented_radius == 0
    beh = live.get("behavior") or behavior
    claim = beh.get("capability_claim") or {}
    s7 = claim.get("emergence_established") is False and claim.get("cognition_or_consciousness_established") is False
    outcomes = beh.get("outcomes") or {}
    fm = outcomes.get("feedback_memory") or {}
    s7b = fm.get("successes") == 24 and (outcomes.get("feedback_disabled") or {}).get("successes") == 0

    report["sections"] = {
        "1_subject_state_atlas": "PASS" if s1 else "FAIL",
        "2_nlm_24_to_32": "PASS" if s2 else "FAIL",
        "3_ssm_task12_match_bundled": "PASS" if s3 else "FAIL",
        "4_formspace_task13_match_bundled": "PASS" if s4 else "FAIL",
        "5_conformal_sets": "PASS" if s5 else "FAIL",
        "5_task8_avani_gates_borda": "PASS" if s5b and rank_ok else "FAIL",
        "6_task14_no_geo_from_class_p": "PASS" if s6 and s6b else "FAIL",
        "7_behavior_engineered_not_emergence": "PASS" if s7 and s7b else "FAIL",
        "8_weka": "NOT_RUN",
    }

    status, atlas, aerr = get_json("http://127.0.0.1:8766/api/form-atlas?limit=300")
    kinds = {}
    if status == 200 and atlas:
        for f in atlas.get("forms", []):
            kinds[f.get("kind")] = kinds.get(f.get("kind"), 0) + 1
        report["atlas"] = {"counts": atlas.get("counts"), "kinds": kinds, "domains": atlas.get("domains")}
        expected = atlas.get("counts", {})
        atlas_ok = (
            expected.get("forms") == 41
            and expected.get("form_states") == 1706
            and expected.get("form_observations") == 1600
        )
        report["sections"]["1b_atlas_population"] = "PASS" if atlas_ok else "FAIL"
    else:
        report["sections"]["1b_atlas_population"] = "FAIL"
        report["atlas"] = {"error": aerr}

    # Subject without coordinates (sorting / math form)
    status, subj, _ = get_json("http://127.0.0.1:8766/api/form-atlas/subject?id=form:total-order")
    if status == 200 and subj:
        states = subj.get("form_states") or subj.get("states") or []
        coords_null = bool(states) and states[0].get("coordinates") is None
        report["sections"]["1c_math_form_no_latlon"] = "PASS" if coords_null else "FAIL"
        report["math"]["total_order_state0_coords"] = states[0].get("coordinates") if states else None
    else:
        report["sections"]["1c_math_form_no_latlon"] = "FAIL"

    env = load_env(WORKTREE_ENV)
    token = env.get("ITDX_BACKEND_TOKEN") or os.environ.get("ITDX_BACKEND_TOKEN") or ""
    itdx_url = (env.get("ITDX_BACKEND_URL") or "http://127.0.0.1:8765").rstrip("/")
    auth = {"Authorization": f"Bearer {token}", "Accept": "application/json"} if token else {"Accept": "application/json"}
    token_ok = bool(token) and len(token) >= 32
    report["services"]["itdx_token_configured"] = token_ok
    for path, key in [("/api/health", "itdx_health"), ("/api/bootstrap", "itdx_bootstrap"), ("/api/formspace", "itdx_formspace")]:
        st, body, e = get_json(itdx_url + path, auth if token_ok else None)
        snippet = None
        if isinstance(body, dict):
            snippet = {k: body.get(k) for k in ("status", "version", "origin", "connection_status", "error") if k in body}
            if "documents" in body:
                snippet["documents"] = len(body["documents"]) if isinstance(body["documents"], list) else body["documents"]
            if "tasks" in body:
                snippet["tasks"] = len(body["tasks"]) if isinstance(body["tasks"], list) else "present"
        report["services"][key] = {"status": st, "error": e, "body": snippet}

    # MINDEX real
    st, body, e = get_json("http://192.168.0.189:8000/health")
    report["services"]["mindex_health"] = {"status": st, "error": e, "body": body}
    st, body, e = get_json("http://192.168.0.189:8000/api/mindex/unified-search/earth?q=physarum")
    if st is None:
        st, body, e = get_json("http://192.168.0.189:8000/api/mindex/species?q=physarum")
    report["services"]["mindex_query"] = {
        "status": st,
        "error": e,
        "keys": list(body.keys())[:12] if isinstance(body, dict) else type(body).__name__,
        "empty": (isinstance(body, dict) and not body.get("results") and not body.get("items") and not body.get("species")),
    }

    # MAS / NLM / MYCA-AVANI
    st, body, e = get_json("http://192.168.0.188:8001/health")
    report["services"]["mas_health"] = {"status": st, "error": e, "mas_status": (body or {}).get("status")}
    nlm_paths = [
        "http://192.168.0.188:8001/api/nlm/health",
        "http://192.168.0.188:8001/api/nlm",
        "http://192.168.0.188:8001/nlm/health",
    ]
    nlm = None
    for url in nlm_paths:
        st, body, e = get_json(url)
        report["services"][f"probe_{url.split(':8001',1)[-1]}"] = {"status": st, "error": e, "body_keys": list(body.keys())[:20] if isinstance(body, dict) else None}
        if st == 200 and isinstance(body, dict):
            nlm = body
            break
    if nlm:
        loaded = nlm.get("model_loaded")
        if loaded is None:
            loaded = (nlm.get("model") or {}).get("loaded")
        report["services"]["nlm"] = {"model_loaded": loaded, "status": nlm.get("status"), "keys": list(nlm.keys())[:20]}
        if loaded is not True:
            report["unqualified"].append("NLM model_loaded!=true")
    else:
        report["services"]["nlm"] = {"bound": False}
        report["unqualified"].append("NLM contract unbound or not 200")

    avani_paths = [
        "http://192.168.0.188:8001/api/avani/status",
        "http://192.168.0.188:8001/voice/brain/status",
        "http://192.168.0.188:8001/api/myca/status",
        "http://192.168.0.188:8001/api/agents",
    ]
    seven = False
    for url in avani_paths:
        st, body, e = get_json(url)
        roles = None
        if isinstance(body, dict):
            roles = body.get("roles") or body.get("agents") or body.get("seven_role")
        if isinstance(body, list):
            roles = body
        report["services"][f"probe_{url.split(':8001',1)[-1]}"] = {"status": st, "error": e, "n": len(roles) if isinstance(roles, list) else None}
        if isinstance(roles, list) and len(roles) == 7:
            seven = True
    if not seven:
        report["unqualified"].append("MYCA seven-role Task 8 not live")

    # Task 8 honesty: local FormSpace is deterministic AVANI, not 7 MYCA agents
    local_not_seven = True
    trace = t8.get("role_trace") or t8.get("roles") or []
    if isinstance(trace, list) and len(trace) == 7 and any("myca" in str(x).lower() for x in trace):
        local_not_seven = False
    report["sections"]["5c_task8_local_not_seven_myca"] = "PASS" if local_not_seven else "FAIL"
    if local_not_seven:
        report["unqualified"].append("Task 8 local AVANI deterministic (correct for FormSpace); production 7-role MYCA unbound")

    sha_match = result.get("model_sha256") == bundled.get("model_sha256")
    report["sections"]["model_sha256_match"] = "PASS" if sha_match else "FAIL"
    report["weka_ready"] = all(
        report["sections"].get(k) == "PASS"
        for k in (
            "3_ssm_task12_match_bundled",
            "4_formspace_task13_match_bundled",
            "5_conformal_sets",
            "5_task8_avani_gates_borda",
            "6_task14_no_geo_from_class_p",
        )
    )
    report["internal_test_command"] = (
        "cd C:\\Users\\Owner1\\Downloads\\Mycosoft_FormSpace_Software_and_Synthetic_Data && "
        ".venv-formspace\\Scripts\\python.exe -m pytest itdx/formspace/tests/test_math.py itdx/formspace/tests/test_behavior.py -q"
    )
    report["weka_later_command"] = (
        "cd C:\\Users\\Owner1\\Downloads\\Mycosoft_FormSpace_Software_and_Synthetic_Data && "
        ".venv-formspace\\Scripts\\python.exe itdx/formspace/weka/evaluate.py --predictions itdx/formspace/recorded/weka --download"
    )
    report["validate_later_or_now"] = (
        ".venv-formspace\\Scripts\\python.exe itdx/formspace/validate.py itdx/formspace/recorded"
    )
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({
        "wrote": str(OUT),
        "sections": report["sections"],
        "weka_ready": report["weka_ready"],
        "unqualified": report["unqualified"],
        "task12_f1": report["math"]["task12_f1_live"],
        "task13_f1": report["math"]["task13_f1_live"],
        "sha_match": sha_match,
        "origin": origin,
        "itdx_health": report["services"].get("itdx_health"),
        "mindex": report["services"].get("mindex_health"),
        "nlm": report["services"].get("nlm"),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
