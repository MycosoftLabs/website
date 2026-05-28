# Field MycoBrain Device Controls — Codex Deploy Handoff

**Date:** May 27, 2026  
**Status:** Ready for Codex deploy (merged to `main`)  
**Do not deploy from Cursor** — use your blue/green pipeline only.

---

## Git state (ready)

| Repo | Branch | Commit | Notes |
|------|--------|--------|-------|
| **website** | `main` | `0b752fc7` | `[fast] Fix deploy checks for MycoBrain controls` |
| **website** | (includes) | `0f519c13` | Field MycoBrain LED/rainbow + Device Manager network wiring |
| **MAS** | `main` | `259032777` | Jetson `/api/cmd` operator proxy — **already on VM 188** |

Remote: `https://github.com/MycosoftLabs/website` @ `main` = `0b752fc7`  
Codex branch synced: `codex/myca-website-security-boundary` → same tip.

---

## Deploy instructions (Codex only)

### Use this (zero-downtime)

1. **GitHub Actions → Instant Deploy** (`.github/workflows/instant-deploy.yml`)  
   - Ref: `main`  
   - Or let **ci-cd.yml** run on push (same `production-deploy` concurrency group).

2. On VM **192.168.0.187**, cutover via **`scripts/blue-green-deploy.sh`**  
   - Stack: `mycosoft-website-blue`, `mycosoft-website-green`, `mycosoft-website-proxy` (port **3000**).

3. **Cloudflare purge everything** after cutover.

### Do NOT use

- **`_rebuild_sandbox.py`** — legacy single-container swap; conflicts with blue/green proxy and can disrupt `:3000`.
- **`pkill docker build`** on 187 while another deploy is building.
- Stopping `mycosoft-website-proxy` or binding `:3000` directly from a one-off container.

Cursor **aborted** a `_rebuild_sandbox.py` run before cutover; site stayed up (proxy + blue/green healthy, HTTP 200).

---

## What this release fixes

### Live field devices

| Device | Registry ID | Operator host | Location |
|--------|-------------|---------------|----------|
| Mushroom 1 | `mycobrain-mushroom1-jetson-123` | `http://192.168.0.123:8787` | San Diego |
| Hyphae 1 | `mycobrain-hyphae1-jetson-228` | `http://192.168.0.228:8787` | Chula Vista |

**Always use `registry_id` for commands** — not MDP id `mycobrain-sidea-10b41d` (same on both boards).

### Jetson operator API (verified)

```http
POST http://{host}:8787/api/cmd
Content-Type: application/json

{ "cmd": "<operator string>" }
```

| UI action | Operator `cmd` |
|-----------|----------------|
| Beep | `bump` |
| Rainbow | `led pattern rainbow` |
| LED off | `led off` |

Old bug: rainbow remapped to `led heartbeat`; off sent as `led rgb 0 0 0` — both fail on Jetson.

### Website changes (key files)

| Area | File |
|------|------|
| Shared command mapping | `lib/devices/operator-commands.ts` |
| Network command API | `app/api/devices/network/[deviceId]/command/route.ts` |
| Legacy command API | `app/api/devices/[deviceId]/command/route.ts` |
| Earth Simulator controls | `app/dashboard/crep/CREPDashboardClient.tsx` |
| Device widget + manager link | `components/crep/devices/DeviceWidget.tsx` |
| Device Manager landing | `app/natureos/devices/page.tsx` |
| Device network list | `app/natureos/devices/network/page.tsx` |
| Device detail | `app/natureos/devices/[deviceId]/page.tsx` |
| Registry table | `components/iot/device-registry-table.tsx` |
| Field coords / agent URLs | `lib/devices/field-deployments.ts` |

### MAS (already deployed on 188)

- `mycosoft_mas/core/routers/device_registry_api.py` — tries `POST {agent_url}/api/cmd` first with operator strings.

Optional always-on (if not running): `scripts/field_mycobrain_heartbeat_bridge.py` on **188** for registry telemetry when sandbox cannot LAN-probe Jetsons.

---

## Post-deploy verification

After blue/green cutover + Cloudflare purge:

1. **https://mycosoft.com** — HTTP 200 throughout deploy (no gap).
2. **Earth Simulator** — open Mushroom 1 + Hyphae 1 widgets:
   - Beep → audible after ~2–5s
   - Rainbow → LED rainbow
   - LED off → LEDs off
   - **Open Device Manager** link works
3. **`/natureos/devices/network`** — both Jetsons listed (not local `ttyACM0` gateway when field devices present).
4. **`/natureos/devices/mycobrain-mushroom1-jetson-123`** and **`...-hyphae1-jetson-228`** — quick actions work.
5. From VM 187 (optional):  
   `curl -s -X POST http://192.168.0.123:8787/api/cmd -H 'Content-Type: application/json' -d '{"cmd":"led pattern rainbow"}'`

---

## Env (production container)

Ensure sandbox website container has:

```env
MAS_API_URL=http://192.168.0.188:8001
MINDEX_API_URL=http://192.168.0.189:8000
```

Field operator fallback from website API routes uses `agent_url` / `MYCOBRAIN_OPERATOR_URLS` when MAS registry miss — 187 must reach `192.168.0.123` and `.228` on LAN for direct `:8787` fallback.

---

## Related docs

- MAS backend handoff: `MAS/mycosoft-mas/docs/EARTH_SIMULATOR_FIELD_MYCOBRAIN_BACKEND_HANDOFF_MAY27_2026.md`
- Blue/green deploy: `.github/workflows/instant-deploy.yml`, `scripts/blue-green-deploy.sh`
- Earth field devices report: `docs/reports/earth-field-mycobrain-devices-2026-05-27.md`

---

## Summary for Morgan

- **Merged to `main`** — nothing left for Cursor to deploy.
- **Codex:** run your normal **Instant Deploy / ci-cd blue-green** on `main` @ `0b752fc7`.
- **MAS** backend already live on **188** @ `259032777`.
- **Do not** run `_rebuild_sandbox.py` — it is not compatible with the current proxy stack.
