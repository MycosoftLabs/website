# FormSpace + NLM Session Complete — September 23, 2026

**Date:** September 23, 2026  
**Status:** Complete (Morgan-ordered verify → document → merge → blue-green ship)  
**Owner:** Morgan Rockcoons / deploy-pipeline  
**Related:** `docs/FORMSPACE_NLM_FULL_BUILD_PLAN_SEP23_2026.md`, `docs/BLUE_GREEN_NEVER_502_SOLE_OWNER_SEP23_2026.md`, `docs/AGENT_RUNNER_ISOLATION_FIX_SEP23_2026.md`

---

## Plan (what this session delivered)

Parallel FormSpace + Nature Learning Model (NLM) track to make both fully functional end-to-end:

| Track | Intent |
|-------|--------|
| **NLM ≠ LLM scrub** | Framing is **signal-state / scenario models**, not LLM/Ollama. Copy + compare UI scrubbed; routes under `/myca/nlm`. |
| **FormSpace SSM / graphs** | Native SSM + graph/atlas/demo/evidence APIs; BFF to MAS FormSpace spine. |
| **Device → NLM bridge** | Live device stream → ingest bindings → training ingest sources. |
| **Ingest / training / Merkle** | MAS training ingest bind/sources, training health, Merkle attest/health. |
| **MINDEX migration** | `0040_nlm_formspace_spine_SEP23_2026.sql` + NLM training APIs on MINDEX main. |
| **AgentRunner isolation** | Critical watchers must not wedge `:8001` (no-wedge API / bounded cycles). |
| **Blue-green never-502** | Sole-owner freeze; candidate IP probe **HTTP 200** before nginx; NAS mount required. |

Earth Simulator / CREP Wave 1 other-agent work was **explicitly excluded** from this ship.

---

## GitHub SHAs / PRs (pre-ship baseline on `main`)

| Repo | Tip (pre this completion commit) | Key merges |
|------|----------------------------------|------------|
| **Website** `MycosoftLabs/website` | `f010261e` | #331 NLM signal-state framing; #333 FormSpace BFF + device-stream + NLM ingest UI |
| **MAS** `MycosoftLabs/mycosoft-mas` | `bacbc40be` | #157 FormSpace spine; #161 AgentRunner no-wedge API |
| **MINDEX** `MycosoftLabs/mindex` | `b1137e9` | #16 FormSpace spine migration + training/run APIs |

This completion ship adds/locks: never-502 sole-owner docs (+ Host-aware healthcheck on website image), then blue-green cutover from **post-merge** `origin/main`.

---

## Verify table (pre-cutover, 2026-09-23 evening PT)

| Check | Result | Notes |
|-------|--------|-------|
| Origin `http://192.168.0.187:3000/` | **200** | Host `sandbox.mycosoft.com` also 200 |
| Public `https://sandbox.mycosoft.com/` | **200** | Pre-scrub **mkt2** still live until cutover |
| Public `https://mycosoft.com/` | **200** | Same sole upstream |
| Live container | `mycosoft-website-candidate-mkt2` | Image `mycosoft-website:mkt2-978fdcb`; NAS assets **ro** mounted |
| Rollback peer | `mycosoft-website-blue` | Healthy IP 200 |
| MAS `http://192.168.0.188:8001/health` | **200** | |
| MAS `/api/formspace/health` | **200** | |
| MAS `/api/nlm/health` | **200** | |
| MAS `/api/nlm/training/health` | **200** | |
| MAS `/api/nlm/training/ingest/sources` | **200** | Correct ingest surface (not `/api/nlm/ingest/status`) |
| MAS `/api/nlm/training/status` | **200** | |
| MAS `/api/nlm/security/status` | **200** | |
| MAS `/api/merkle/health` | **200** | |
| MAS `/api/formspace/graph` | **405** on GET | Endpoint present (method-gated) |
| MINDEX `http://192.168.0.189:8000/health` | **200** | Dedicated `/api/nlm/health` not exposed on this build |
| Localhost `:3010` `/api/formspace/health` | **200** | Dev server responding |
| Localhost `/myca/nlm` | **200** | |
| Freeze | `CUTOVER_FROZEN=1` | Cleared only under this Morgan-ordered ship |
| Deploy lock (stale) | `deploy-pipeline-nlm-scrub-sep23` | Replaced by this ship’s sole owner |

---

## Blue-green cutover rules applied

1. Sole deploy owner — abort if contested.  
2. Primary (`mkt2`) keeps serving until candidate probes **HTTP 200 on candidate IP** (not via broken upstream).  
3. Never point nginx at unhealthy/starting containers.  
4. NAS: `-v /opt/mycosoft/media/website/assets:/app/public/assets:ro`.  
5. Icons baked in image (`public/icons`); optional host icons mount if present.  
6. Host-aware healthcheck in image (avoid bare-Host 308 traps).  
7. Cloudflare purge after verified origin + public 200.  
8. Re-arm `CUTOVER_FROZEN` with new `SOLE_UPSTREAM` after success.

---

## Doc paths

| Doc | Location |
|-----|----------|
| This completion | `WEBSITE/website/docs/FORMSPACE_NLM_SESSION_COMPLETE_SEP23_2026.md` (mirror MAS) |
| Never-502 sole owner | `docs/BLUE_GREEN_NEVER_502_SOLE_OWNER_SEP23_2026.md` |
| Plan | `docs/FORMSPACE_NLM_FULL_BUILD_PLAN_SEP23_2026.md` |
| Graphs/backends | `docs/FORMSPACE_GRAPHS_BACKENDS_FIX_SEP23_2026.md` |
| Device network | `docs/NLM_DEVICE_NETWORK_INTEGRATION_SEP23_2026.md` |
| AgentRunner | `MAS/docs/AGENT_RUNNER_ISOLATION_FIX_SEP23_2026.md` |

---

## How to verify after cutover

```text
curl -s -o /dev/null -w "%{http_code}" -H "Host: sandbox.mycosoft.com" http://192.168.0.187:3000/
curl -s -o /dev/null -w "%{http_code}" https://sandbox.mycosoft.com/myca/nlm
curl -s -o /dev/null -w "%{http_code}" https://sandbox.mycosoft.com/ai/formspace
curl -s -o /dev/null -w "%{http_code}" https://mycosoft.com/favicon.ico
curl -s -o /dev/null -w "%{http_code}" http://192.168.0.188:8001/api/nlm/training/ingest/sources
```

Expect **200** on all. Active slot file: `/opt/mycosoft/state/active-slot`. Previous `mkt2` retained for rollback until Morgan retires it.
