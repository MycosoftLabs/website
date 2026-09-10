# ITDX Fusarium App Tabs Restored — September 10, 2026

**Date:** September 10, 2026  
**Status:** Complete  
**Worktree:** `WEBSITE/website-itdx-codex-v13`  
**Product route:** `/fusarium/itdx`  
**RJ Ricasata = CFO.** Briefing is SYNTHETIC EXERCISE `live: false`. Mycosoft is pursuing CMMC L2 — this document does not claim CMMC compliance. No invented p. No mock COP.

## Why the application vanished

Honesty-pass commit **`98979511`** (“Ship Earth Sim-only collapsible ITDX overlay…”) hid the real lab while leaving Fusarium tab chrome:

| File | Gate |
|---|---|
| `components/itdx/ITDXApplication.tsx` | Iframe mounted only when `backend.status === 'CONNECTED'`. Unbound optional 8765/8766 set `NOT_SUPPLIED` and replaced the app with a wall + briefing/Weka. |
| `app/api/fusarium/itdx/bridge/[...path]/route.ts` | Unset or failed `ITDX_BACKEND_URL` / token returned stub HTML titled `ITDX lab NOT_SUPPLIED` and bootstrap JSON without `version` / documents. |
| `.dockerignore` | Excludes the entire `itdx/` tree, so live Docker never had `itdx/app/web` even if the bridge later read disk. |

Removing the global Fusarium ITDX dock (Earth Sim overlay only) was intentional and stays. `/fusarium/soc` still aliases situational-awareness — it is not the product. The product is `/fusarium/itdx` → `<ITDXApplication/>`.

## What was restored

- Packaged Algorithm Lab at `lib/itdx/lab-web/` and catalog at `lib/itdx/lab-catalog/` (Docker-safe; not the excluded `itdx/` tree).
- Bridge always serves packaged HTML/JS. Optional 8765/8766 still proxies `/api/*` when bound; otherwise static catalog APIs (`version: 1.4.0`, `lab_ui: SUPPLIED`, `optional_compute: NOT_SUPPLIED`). POST compute stays honest NOT_SUPPLIED.
- Tabs always mount the application iframe: Algorithm lab, Walkthrough, Documents & citations, Source review & Borda, NLM / Form Space, Run & test, Evidence exports, System connections. Replay uses `ITDXWorkspace`. Fusarium applications lists real catalog links.
- Synthetic Army intel briefing stays as a **collapsed workspace chip** (`defaultOpenSections('workspace') === []`), `live: false`. It does not replace the app.
- v1.4 chrome stays visible if Earth-2 249 is down or AirNow is missing. Google Maps BFF remains SUPPLIED.
- Standalone trace includes `lib/itdx/lab-web/**` and `lib/itdx/lab-catalog/**`.

## How to verify `/fusarium/itdx` tabs

Owner session required (307 to `/fusarium/login` without cookie). Do not weaken MFA.

1. Open `http://localhost:3010/fusarium/itdx` (and live `https://mycosoft.com/fusarium/itdx`).
2. Confirm badge **FUSARIUM / ITDX APPLICATION v1.4** and nav tabs.
3. Default **Algorithm lab** iframe title `ITDX Algorithm lab`. Bridge `/index.html` contains `ITDX26 Algorithm Lab` / `Loading Mycosoft Algorithm Lab` — not `ITDX lab NOT_SUPPLIED`.
4. Click every tab. Iframe or React workspace must mount real UI:
   - Walkthrough → lab HTML `#walkthrough`
   - Documents & citations → `workspace.html`
   - Source review & Borda → `workbench.html`
   - NLM / Form Space → `formspace.html`
   - Run & test / Evidence exports / System connections → lab HTML hashes
   - Earth replay & portable reader → `ITDXWorkspace`
   - Fusarium applications → catalog links
5. Optional-compute chip may read `NOT_SUPPLIED`. That is not a wall. Google Maps traffic stays SUPPLIED on the website BFF.
6. Briefing banner: SYNTHETIC EXERCISE · `live=false`. No live COP.

## 3010 proof (10 Sep 2026)

Owner local-dev session on `http://localhost:3010` (worktree `website-itdx-codex-v13`):

| Check | Result |
|---|---|
| `POST /api/auth/local-dev-session` | 200 |
| `GET /fusarium/itdx` | 200 · `data-testid="itdx-application"` · v1.4 badge · iframe `itdx-application-frame` |
| Wall strings | No `ITDX lab NOT_SUPPLIED`; iframe is not gated on `CONNECTED` |
| Bridge `index.html` | 200 · `ITDX26 Algorithm Lab` |
| Bridge `workspace.html` | 200 · documents workspace |
| Bridge `workbench.html` | 200 · Borda / evidence workbench |
| Bridge `formspace.html` | 200 · Form Space |
| Bridge `/api/bootstrap` | 200 · `version` 1.4.0 · packaged catalog |

## Do not revert

Earth Sim Live Data / ERA5 / aerosol work from sibling lane `5eebc6ea` is out of scope for this restore and must not be reset.
