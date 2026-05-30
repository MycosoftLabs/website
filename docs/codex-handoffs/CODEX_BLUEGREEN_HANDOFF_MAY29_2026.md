# Codex Blue/Green Deploy Handoff — May 29, 2026

**Date:** May 29, 2026
**Status:** Ready for Codex (website only)
**Owner split:** **Codex** = website repo + blue/green on VM 187. **Cursor/MAS agent** = MAS VM 188, field bridges, firmware OTA backend, credentials, non-website VMs.

**Prior handoffs (still valid):**
- `docs/codex-handoffs/FIELD_MYCOBRAIN_DEPLOY_HANDOFF_MAY27_2026.md`
- `MAS/mycosoft-mas/docs/EARTH_SIMULATOR_FIELD_MYCOBRAIN_BACKEND_HANDOFF_MAY27_2026.md`

**Cursor session record:** `MAS/mycosoft-mas/docs/COM4_HYPHAE_OTA_LOCAL_COMPLETE_MAY29_2026.md`

---

## Your scope (Codex only — website)

You are in the **website** environment. You have website credentials and the blue/green pipeline. **Do not SSH to MAS/MINDEX VMs for this release** — Cursor handles 188 and field ops.

### 1. Branch and merge

| Item | Value |
|------|--------|
| Working branch | `codex/myca-website-security-boundary` |
| Committed tip | `ff120003` — MycoBrain console unify + firmware audit + agent relay |
| vs `origin/main` | 1 commit ahead |

Merge to **`main`** (or your deploy branch) together with **uncommitted** files below.

### 2. Uncommitted website files — MUST commit before deploy

| File | Purpose |
|------|---------|
| `lib/auth/get-auth-origin.ts` | **NEW** — login/callback stay on dev/prod origin; fixes localhost → mycosoft.com redirect |
| `app/auth/callback/route.ts` | Uses `getAuthOrigin()` |
| `app/auth/login/route.ts` | Uses `getAuthOrigin()` |
| `lib/devices/dev-bench-location.ts` | **NEW** — COM4 bench map coords (dev visibility) |
| `app/api/earth-simulator/devices/route.ts` | Bench + field fleet merge |
| `app/api/devices/network/route.ts` | Bench location overlay |
| `lib/devices/field-deployments.ts` | `bench-com4` if not already in `ff120003` |

**Do NOT commit:** `.codex-*`, `screenshots/`, `artifacts/`, `var/`, `tsconfig.tsbuildinfo`, `.env.local`

### 3. Blue/green deploy (VM 187)

1. Push merged **`main`** to GitHub.
2. **Instant Deploy** / `ci-cd.yml` **or** on 187:
   ```bash
   DEPLOY_DIR=/opt/mycosoft/website \
   IMAGE=ghcr.io/mycosoftlabs/website:production-latest \
   scripts/blue-green-deploy.sh
   ```
3. **Cloudflare — purge everything**
4. **Do NOT** run `_rebuild_sandbox.py` (conflicts with blue/green proxy on `:3000`).

**Production env rules:**
- `MAS_API_URL=http://192.168.0.188:8001`
- `NEXT_PUBLIC_SITE_URL=https://mycosoft.com`
- **Never** set `NEXT_PUBLIC_BASE_URL` to localhost on 187
- **Never** set `UNSAFE_BYPASS_AUTH=true` in production

**NAS mount (required on website container):**
```bash
-v /opt/mycosoft/media/website/assets:/app/public/assets:ro
```

### 4. Website post-deploy verification

| Check | Expected |
|-------|----------|
| `https://mycosoft.com` | HTTP 200 through cutover |
| `/api/earth-simulator/devices` | Mushroom 1 + Hyphae 1 with coords + telemetry (via MAS registry) |
| Field widget controls | Beep / rainbow / off work (`bump`, `led pattern rainbow`, `led off`) |
| Login | Protected route → `/login` on **mycosoft.com**; OAuth callback succeeds |
| Device Manager | `/natureos/devices/network` — registry-first, firmware audit badge |

### 5. Suggested commit message (website)

```
fix(auth): getAuthOrigin for login/callback; feat(devices): COM4 bench on fleet APIs
```

---

## Not your scope (Cursor / MAS agent — done May 29, 2026)

| Task | Host | Notes |
|------|------|-------|
| MAS orchestrator deploy | **188** | **Live** @ `f725bd56` — `firmware_flash_api`, device registry; Mushroom flash **403** |
| Field heartbeat bridge | **188** | **Active** — keeps 123/228 in MAS registry when sandbox cannot LAN-probe |
| MycoBrain service / COM4 flash | **Dev PC 241** | USB bench; not prod website |
| Hyphae Pi OTA live flash | **228** | Blocked until `JETSON_SSH_PASSWORD` in MAS creds |
| Mushroom 1 flash | **123** | **Protected** — API returns 403 |
| MycoBrain firmware repo | `mycobrain/` | PlatformIO envs for artifact rebuild |
| Cloudflare / MAS / MQTT broker | Various | Cursor has VM credentials |

---

## API contracts (website ↔ MAS — unchanged)

- Field commands: `POST /api/devices/network/{registryId}/command` → MAS → `{agent_url}/api/cmd`
- Agent task / firmware proposal: `POST /api/devices/{deviceId}/agent/task`
- Firmware audit: `GET /api/devices/firmware-audit` (website proxy to MAS when deployed)
- Registry IDs: `mycobrain-mushroom1-jetson-123`, `mycobrain-hyphae1-jetson-228` — **never** use shared MDP id for commands

---

## Known limits after this release

- Sandbox **187** cannot HTTP-probe Jetsons **123/228** — prod map uses MAS heartbeats (bridge on 188).
- Hyphae/Mushroom still on **`recovery-operator-bsec2-v0.7`** until field flash windows (Cursor ops).
- COM4 **`bench-com4`** appears on dev map when MAS on 241 registers COM4; optional on prod registry.

---

## One-line instruction

Merge `codex/myca-website-security-boundary` + uncommitted auth/bench fleet files → push `main` → blue/green on 187 → purge Cloudflare. Cursor owns MAS 188 and all non-website VM work.
