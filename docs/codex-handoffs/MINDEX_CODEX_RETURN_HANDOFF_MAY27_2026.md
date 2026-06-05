# MINDEX App — Return Handoff to Codex (May 27, 2026)

**Status:** Backend on **189** repaired; Library BFF returns **real rows**. Re-test UI on **3010** — your unavailable-state UX should now transition to populated lists when APIs succeed.

**Primary UI handoff:** `MINDEX_APP_CONSOLE_FRONTEND_HANDOFF_MAY27_2026.md`  
**Backend completion log:** `MINDEX_BACKEND_CURSOR_COMPLETE_MAY27_2026.md`  
**Live network (MAS/MQTT/Earth):** `MAS/mycosoft-mas/docs/LIVE_NETWORK_STACK_STATUS_MAY27_2026.md` (if present) or `LIVE_NETWORK_VERIFY_MAY27_2026.json`

---

## What Codex fixed (frontend — keep)

Per Codex (May 27, 2026), on **http://localhost:3010/natureos/mindex**:

| Change | Intent |
|--------|--------|
| Library tab shows **storage/API unavailable** clearly | No false “broken filter” when 189 is down |
| File groups/files **categorized + paginated**, empty until real rows | Honest empty state |
| Removed duplicate “no files found / no filter match” copy | UX clarity |
| **No fake SINE/audio** when no file selected | No mock visualizations |
| Post-timeout copy: **“MINDEX Library storage is unavailable”** | Correct operator message |

**Do not revert** these behaviors when wiring live data.

---

## What Cursor fixed (backend — May 27, 2026 evening)

### MINDEX VM 189 — disk + Library

| Before | After (verified) |
|--------|------------------|
| Root disk **100%** (~138 MB free) | Root **~10%** used (**~88 GB free**) |
| Local backup **88 GB** at `/var/lib/mindex-nas-local-backup-20260604005520` | **Removed** after NAS `Library/` verified (**88G** on CIFS) |
| BFF could return `root_status: "missing"`, **0 files** | Direct API + BFF now return real storage + blobs |

**Script:** `MINDEX/mindex/scripts/_prune_disk_and_verify_library_may27.py`

### API smoke (189 and 3010 BFF)

```text
GET 189 /api/mindex/library/storage  → remote_nas: true, policy: ok, ~7.2 TB free
GET 189 /api/mindex/library/blobs?category=acoustic&limit=3 → total: 2180, items[]
GET 3010 /api/mindex/library/storage → 200, same shape
GET 3010 /api/mindex/library/blobs?category=acoustic&limit=2 → total: 2180
GET 3010 /api/mindex/sine/status → 200
GET 3010 /api/natureos/mindex/console → 200 (~7.5 KB)
GET 3010 /api/earth-simulator/devices → 200
```

### Acoustic classifier on 189 (June 4, 2026)

| Item | Status |
|------|--------|
| `MINDEX_DB_HOST=mindex-postgres` on VM | Fixed — health `db: ok` |
| `MINDEX_INTERNAL_TOKEN` synced to website `.env.local` | Fixed — no more 401 on Library BFF |
| SINE + Library routers deployed via SFTP | `docker restart mindex-api` |
| `POST /api/mindex/library/blobs/{id}/classify` | **200** — grouped `frequency_detections`, `classification` payload |

**Deploy script (when git is behind):** `MINDEX/mindex/_deploy_sine_acoustic_may27_2026.py` then `scripts/_restart_api_verify_classify_may27.py`.

**Follow-up:** Commit/push MINDEX acoustic stack to `main` so `git pull` on 189 replaces SFTP for future deploys.

### Codex frontend (Jun 4, 2026) + Cursor verification

See **`MINDEX_ACOUSTIC_CLASSIFIER_FRONTEND_PLAN_JUN04_2026.md`** (de-dupe, timeouts, smallest-clip auto-select, skip auto viz/analysis for files &gt; 75 MB).

**3010 restarted (hidden external dev server). Smoke check:**

| URL | Result |
|-----|--------|
| `/sensing/sine/player` | **200** |
| `/natureos/mindex` | **200** |
| `GET /api/natureos/mindex/library?category=acoustic&limit=100` | **200** (100 visible rows) |
| `GET /api/mindex/sine/status` | **200** |
| `POST /api/natureos/mindex/library/classify?id={small}` | **200** |
| `POST /api/mindex/sine/blobs/{small}/analyze` | **200** (12 events) |

Use a **small** clip for first analyze test; ~48 MB rows can still fail or time out.

**Auth:** `X-Internal-Token` in website `.env.local` must match VM `MINDEX_INTERNAL_TOKENS` (first value) or `MINDEX_INTERNAL_SERVICE_TOKEN`.

---

## Codex re-test checklist (Library tab)

After refresh **3010** (no dev server restart required if hot reload already picked up your UI changes):

- [ ] **Library → storage card** shows NAS mounted (`remote_nas: true`), not “unavailable”
- [ ] **Acoustic file list** loads with **2180** total (paginate; first page may be MBARI hydrophone WAVs)
- [ ] Selecting a row enables **real** SINE player path (`/api/mindex/library/blobs/{id}/stream` or SINE analyze when implemented)
- [ ] **No** duplicate empty-filter messages when rows exist
- [ ] **No** blank SINE canvas without a selected file
- [ ] Overview / Data pipeline / Explorer still pass (see `MINDEX_BACKEND_CURSOR_COMPLETE_MAY27_2026.md`)

If storage still shows unavailable locally:

1. Confirm `.env.local` `MINDEX_API_URL=http://192.168.0.189:8000` and token set  
2. `Invoke-RestMethod http://localhost:3010/api/mindex/library/storage` with `X-Internal-Token` header  
3. If 200 with `remote_nas: true` but UI still says unavailable — **frontend wiring bug** (Codex): trace which field drives “unavailable” (was `root_status: "missing"` when disk was full)

---

## Live network (MAS / MQTT / Earth Simulator)

| System | Status for MINDEX app scope |
|--------|---------------------------|
| **MINDEX 189** | **Healthy** — API, Postgres, NAS, Library blobs |
| **MAS 188** | **API OK** — `/health` aggregate still **unhealthy** (Postgres probe hits localhost; DB is on **189**). Devices + field heartbeat **active**. Earth Simulator BFF **200**. |
| **MQTT 196** | **Blocked** — broker auth `Not authorized` with bridge password; SSH to **196** needs key-based access from dev. Does **not** block Library/SINE/console. |
| **Website 3010** | BFF proxies to **189** / **188** — working for checklist above |

---

## Deploy (when Morgan approves)

1. Commit **website** (Codex UI + any BFF you touched) + **MINDEX** backend docs/scripts (no secrets)  
2. Push → Sandbox **187** rebuild + NAS mount + Cloudflare purge  
3. Compare `localhost:3010/natureos/mindex` vs production

---

## Out of scope for Codex this pass

- MQTT broker password alignment on **196** (ops / infrastructure)  
- MAS `/health` Postgres probe fix (cosmetic; APIs work)  
- Full `POST /api/mindex/sine/blobs/{id}/analyze` (needs scipy stack in API image)

---

## Contact

Cursor thread: MINDEX NAS disk prune + Library verify + live network continuation.  
Evidence JSON: `MINDEX/mindex/docs/MINDEX_LIBRARY_VERIFY_MAY27_2026.json`
