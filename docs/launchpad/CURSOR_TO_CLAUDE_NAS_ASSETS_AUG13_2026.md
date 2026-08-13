# Cursor → Claude: NAS FUSARIUM / Launchpad assets — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (deploy-pipeline / NAS media) |
| **To** | Claude frontend fleet + Morgan |
| **Status** | **13×200 Y** on origin, `mycosoft.com`, and `sandbox.mycosoft.com` |
| **Prod flag** | `LAUNCHPAD_ENABLED` **not** flipped (sandbox/prod stay off) |
| **Merge** | **Not merged.** Order remains #260 → #261 → #262 |
| **Windows upload** | **Not repeated** this pass. Morgan: files already on NAS. `_sync_nas_push_from_windows.py` was **not** run. |

Mycosoft is pursuing CMMC Level 2 (Self-Assessment); it is not assessed compliant. No CUI. No secrets. No video git-add.

---

## Where the 13 files actually were

Searched `find /opt/mycosoft/media` and `/opt/mycosoft` (skipping `node_modules` / `.git`) for:

`earth*simulat*` · `orchestration-colony*` · `sensing-band*` · `name-hyphae*` · `nlm-intelligence*` · `launchpad-hero*`

**Canonical copies (exact FUSARIUM/Launchpad filenames) live only here:**

`/opt/mycosoft/media/website/assets/fusarium/`  
`/opt/mycosoft/media/website/assets/launchpad/`

Green container bind-mount: `/opt/mycosoft/media/website/assets` → `/app/public/assets` **ro**.

No matching files under `devices/`, `defense/`, or `videos/`. No extra copies to copy or symlink.

Unrelated hits (do **not** use for FUSARIUM page):

| Path | Size | Note |
|---|---|---|
| `.../assets/homepage/tiles/earth-simulator-tile-*.mp4` (+ posters) | 1.2–4.2M | Homepage tiles |
| `.../assets/earth-simulator/earth-simulator-defense-preview.mp4` | 26.7M | Earth Simulator defense preview |

---

## Copy / symlink this pass

**None.** All 13 names were already at the URLs the page expects.

Earlier in this session (before Morgan’s “stop Windows upload”): the same 13 files were placed into those two NAS folders via `scp` (not `_sync_nas_push_from_windows.py`). This pass did **not** re-upload ~955MB from Windows.

**Permission fix on the VM (required):** container user is `nextjs` uid **1001**; NAS owner is `mycosoft` uid **1000**. New `launchpad/` was `770` → origin 404 until:

```text
chmod 755 .../assets/fusarium .../assets/launchpad
chmod 644 <the 13 files>
```

---

## NAS inventory (exact names, including spaces)

| File | Bytes | NAS path |
|---|---:|---|
| `earth simulator background.mp4` | 141318537 | `/opt/mycosoft/media/website/assets/fusarium/` |
| `earth simulator background-web.mp4` | 19037727 | same |
| `earth simulator background-poster.jpg` | 119435 | same |
| `orchestration-colony.mp4` | 68386773 | same |
| `orchestration-colony-web.mp4` | 3437953 | same |
| `orchestration-colony-poster.jpg` | 331345 | same |
| `sensing-band-dark.jpg` | 189712 | same |
| `sensing-band-light.jpg` | 150996 | same |
| `name-hyphae.jpg` | 182936 | same |
| `nlm-intelligence-core.jpg` | 348823 | same |
| `launchpad-hero.jpg` | 367466 | `/opt/mycosoft/media/website/assets/launchpad/` |
| `launchpad-hero-poster.jpg` | 357575 | same |
| `launchpad-hero-web.mp4` | 20134804 | same |

Page prefers `-web.mp4` variants — those are present and 200.

---

## HTTP 200 table (HEAD, 2026-08-13 after Cloudflare purge)

All lengths match NAS bytes. Public `CF-Cache-Status: MISS` immediately after purge.

| Asset | origin `:3000` | `https://mycosoft.com` | `https://sandbox.mycosoft.com` |
|---|---|---|---|
| `/assets/fusarium/earth simulator background.mp4` | 200 | 200 | 200 |
| `/assets/fusarium/earth simulator background-web.mp4` | 200 | 200 | 200 |
| `/assets/fusarium/earth simulator background-poster.jpg` | 200 | 200 | 200 |
| `/assets/fusarium/orchestration-colony.mp4` | 200 | 200 | 200 |
| `/assets/fusarium/orchestration-colony-web.mp4` | 200 | 200 | 200 |
| `/assets/fusarium/orchestration-colony-poster.jpg` | 200 | 200 | 200 |
| `/assets/fusarium/sensing-band-dark.jpg` | 200 | 200 | 200 |
| `/assets/fusarium/sensing-band-light.jpg` | 200 | 200 | 200 |
| `/assets/fusarium/name-hyphae.jpg` | 200 | 200 | 200 |
| `/assets/fusarium/nlm-intelligence-core.jpg` | 200 | 200 | 200 |
| `/assets/launchpad/launchpad-hero.jpg` | 200 | 200 | 200 |
| `/assets/launchpad/launchpad-hero-poster.jpg` | 200 | 200 | 200 |
| `/assets/launchpad/launchpad-hero-web.mp4` | 200 | 200 | 200 |

**13×200 = Y** (origin + prod + sandbox).

Public 404s before purge were Cloudflare-cached 404s while origin was already 200. Purged those URLs, then `purge_everything` on the mycosoft.com zone. Re-HEAD → 200.

---

## CodeQL `api-keys.ts` SHA-256 (`hashApiKey`)

**Agree with Claude: FALSE POSITIVE. Do not change `hashApiKey()` to bcrypt.**

- `mintApiKeyPlaintext()` is `randomBytes(32)` (256-bit high-entropy token, not a user password).
- SHA-256 is the correct lookup hash for that class of secret.
- bcrypt is wrong here: adaptive latency + 72-byte truncation.

`gh` code-scanning list (open, paginated) did **not** surface an `api-keys.ts` alert in the first 100+ open items (many older CREP/eagle alerts). **Morgan can dismiss** any GitHub Security / CodeQL app finding on that line as **won’t fix / high-entropy API token, not a password**. Cursor did not force-merge and did not change `hashApiKey`.

---

## Out of scope (held)

- Did not merge PRs.
- Did not set `LAUNCHPAD_ENABLED` on sandbox/prod.
- Did not edit `NavigationClickRescue`, NavLink, middleware, or `report-builders`.
- Did not git-add `public/assets` videos.
