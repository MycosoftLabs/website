# Gaps and Plans — Aug 31, 2026

Inventory of incomplete work in **MycosoftLabs/website**.
Sections: (A) closed in this PR, (B) open-PR triage, (C) open-issue triage,
(D) plans for larger unfinished areas.

---

## A. Closed in This PR (hygiene only)

| # | Item | Resolution |
|---|------|------------|
| A-1 | Duplicate `.gitignore (1)` (garbled 34-line subset) | Deleted |
| A-2 | Empty `x402.txt`, `pr_logs.txt` | Deleted |
| A-3 | Tracked generated files: `ts_errors.txt`, `tsc_output.txt`, `tsout.txt`, `tsconfig.tsbuildinfo` | Untracked + gitignored |
| A-4 | 24 `site-media-audit-*.json` + 5 `asset-audit-*` snapshots | Untracked + gitignored |
| A-5 | Stale `CURRENT_STATUS.md` (dated Dec 2025, entirely obsolete) | Deleted |
| A-6 | README broken link → `docs/EARTH_SIMULATOR_REFERENCE.md` | Fixed to `EARTH_SIMULATOR_TECHNICAL_REFERENCE.md`; removed dangling MAS doc ref |

---

## B. Open PRs (22 total) — Triage

### B-1. Recommend close (abandoned / garbled / superseded)

| PR | Title | Age | Why close |
|----|-------|-----|-----------|
| [#30](https://github.com/MycosoftLabs/website/pull/30) | Claude/check deployments p eyr k | Mar 15 → 169 days, CONFLICTING | Garbled auto-generated title. 4 files, trivial cleanup that has long since drifted. |
| [#31](https://github.com/MycosoftLabs/website/pull/31) | Claude/agent registry dashboard 0s iar | Mar 15 → 169 days, CONFLICTING | Same pattern — auto-generated Claude title, 10 files, heavy conflicts after 5+ months. |
| [#96](https://github.com/MycosoftLabs/website/pull/96) | feat(crep): Earth v2 Phase 1+2 — Cesium engine behind `?engine=cesium` | Apr 18 → 135 days, CONFLICTING | Cesium was deprecated May 2026 in favour of MapLibre. The feature-flag approach is obsolete. |
| [#173](https://github.com/MycosoftLabs/website/pull/173) | Force-disable unstable heavy layers and gate photorealistic 3D behind env var | May 22 → DRAFT, CONFLICTING | Superseded by #174 (same author, same day, larger scope). Single file. |
| [#174](https://github.com/MycosoftLabs/website/pull/174) | fix(earth-simulator): stabilize — 161 layers default OFF, FORCE_OFF guard | May 22 → DRAFT, CONFLICTING | Stability work was separately landed on `main`. Conflicts now. |
| [#177](https://github.com/MycosoftLabs/website/pull/177) | Earth Sim (CREP): MYCA view cleanup, label LOD, live cameras, NA intel | May 26 → DRAFT, CONFLICTING | 97 days stale. Civic-fallback data (governors) will need freshness update. Cherry-pick any surviving ideas. |
| [#185](https://github.com/MycosoftLabs/website/pull/185) | [codex] Earth camera stability and Vegas live sources | Jun 9 → DRAFT, CONFLICTING, 47 files | Massive scope, unmergeable. |

### B-2. Recommend review → land

| PR | Title | Status | Notes |
|----|-------|--------|-------|
| [#115](https://github.com/MycosoftLabs/website/pull/115) | chore(crep): refresh eagle-cameras-registry (nightly bot) | Approved, BEHIND, 1 file | Bot data PR. Updated Aug 29. Merge. |
| [#143](https://github.com/MycosoftLabs/website/pull/143) | chore(crep): refresh cell-tower tiles | Approved, BEHIND, 2 files | Bot data PR. Updated Aug 30. Merge. |
| [#144](https://github.com/MycosoftLabs/website/pull/144) | chore(crep): weekly SD+TJ coverage refresh | Approved, BEHIND, 8 files | Bot data PR. Data ~3 months old but harmless. Merge. |
| [#145](https://github.com/MycosoftLabs/website/pull/145) | chore(crep): refresh transmission + data-center tiles | Approved, BEHIND, 4 files | Bot data PR. Updated Aug 1. Merge. |
| [#149](https://github.com/MycosoftLabs/website/pull/149) | feat(codespaces): mobile-friendly devcontainer | BEHIND, mergeable, 5 new files | All additive (`.devcontainer/`), zero app-code risk. 111 days without review. |
| [#182](https://github.com/MycosoftLabs/website/pull/182) | chore(crep): hourly NYC+DC iNat refresh | Approved, BEHIND, 2 files | Bot data PR. Updated today. Merge. |
| [#264](https://github.com/MycosoftLabs/website/pull/264) | fix(psathyrella): surface the Target IR-cut controls | **Already merged** Aug 31 | No action needed. |

### B-3. Needs owner decision (non-trivial)

| PR | Title | Status | Notes |
|----|-------|--------|-------|
| [#142](https://github.com/MycosoftLabs/website/pull/142) | crep: cite DPA §303 grid determination as rationale for infra layers | DRAFT, CONFLICTING, 3 files | Documentation-only. Rebase onto fresh branch if still relevant, else close. |
| [#147](https://github.com/MycosoftLabs/website/pull/147) | feat(edge): migrate process-telemetry to @supabase/server (pilot) | DRAFT, BEHIND, 2 files | 116 days stale. `@supabase/server` API may have evolved. Re-evaluate. |
| [#165](https://github.com/MycosoftLabs/website/pull/165) | Fix MYCA public chat, search routing, and deploy auth | CONFLICTING, 61 files, changes requested | See plan D-2 below. |
| [#229](https://github.com/MycosoftLabs/website/pull/229) | fix(earth-sim): restore live MINDEX fungal observations | BLOCKED, 1 file | Surgical auth-header fix (`X-API-Key` → `X-Internal-Token`). Needs one approval to unblock. |
| [#247](https://github.com/MycosoftLabs/website/pull/247) | consolidate: merge main (#245 PreVeil) into CUI hardline | BEHIND, 8 files | CUI/CMMC compliance. Needs rebase check + review. |
| [#187](https://github.com/MycosoftLabs/website/pull/187) | fix(earth-simulator): faster first-paint + biodiversity hotspots | DRAFT, CLEAN, 5 files | Only draft Earth Sim PR still mergeable. Needs local browser QA then un-draft. |

### B-4. Security drafts — do not merge, plan only

| PR | Title | Status | Notes |
|----|-------|--------|-------|
| [#167](https://github.com/MycosoftLabs/website/pull/167) | security: CVE-2026-31431 (Copy Fail) mitigation bundle | DRAFT, BEHIND, 9 new files | All additive tooling (scripts, Ansible, Falco rules, Kyverno policy). Zero conflict risk. See plan D-4. |
| [#186](https://github.com/MycosoftLabs/website/pull/186) | security: fix critical RCE, privilege escalation, unauthenticated infra routes | DRAFT, CONFLICTING, 74 files | Massive scope. Requires human key rotation + DB migration. See plan D-4. |

---

## C. Open Issues (43 total)

### C-1. CREP feed-regression bot issues (~42)

All labelled `crep-feed-regression`. Opened by the `CREP Feed Integrity` workflow
(`.github/workflows/feed-integrity-check.yml`) every time aircraft, vessel, or satellite
feed counts drop below threshold. Runs every 10 minutes.

Most are transient upstream outages that self-heal. The issues stay open because the
workflow has no auto-close logic.

**Recommendation:**
1. Bulk-close all `crep-feed-regression` issues older than 7 days.
2. Modify the workflow to reopen a single tracking issue (or auto-close when feed recovers) instead of creating a new issue per event.

### C-2. Human-filed issue

| Issue | Title | Opened | Status |
|-------|-------|--------|--------|
| [#212](https://github.com/MycosoftLabs/website/issues/212) | PROD DOWN — /api/health failing | Jun 16 | Still open. Production Watchdog CI also shows recent `/api/health` failures + SMTP `535 BadCredentials` on alert emails. Needs investigation: is the health endpoint actually down, or is the monitor stale/misconfigured? |

---

## D. Plans for Larger Unfinished Areas

### D-1. Earth Simulator / CREP

**Current state:** The Earth Simulator at `/natureos/earth-simulator` uses MapLibre GL +
deck.gl (Cesium was deprecated May 2026). Multiple live data layers: aircraft (OpenSky/FR24),
vessels (AISstream), satellites (TLE/SGP4), fungal observations (iNat/MINDEX), infrastructure
PMTiles, weather overlays, MYCA LIVE chat. There are 7 open draft PRs (see Section B), most
now conflicting.

**Key docs:** `docs/EARTH_SIMULATOR_DOCS_INDEX.md` (canonical index),
`docs/EARTH_SIMULATOR_TECHNICAL_REFERENCE.md`, `docs/EARTH_SIMULATOR_STATUS.md`,
plus 18 handoff documents in `docs/codex-handoffs/`.

**Blockers:**
- 6 of 7 draft PRs have drifted into conflicts and should be closed (Section B-1).
- Missing tile-server backends (`mycelium-tiles`, `heat-tiles`, `weather-tiles`) currently
  serve transparent-PNG stubs, causing no visual error but no real data either.
- `Arraylake field bake` CI is failing (invalid `ARRAYLAKE_TOKEN` secret).
- PR #229 (1-file auth-header fix) is blocked awaiting approval.

**Next steps:**
1. Close the 6 stale draft PRs. Review #187 (clean, 5 files) for merge.
2. Unblock and land #229 — restores live MINDEX fungal observations.
3. Fix `ARRAYLAKE_TOKEN` in GitHub Actions secrets.
4. Decide on missing tile-server routes: implement real backends or remove the layer toggles from the UI.
5. Consolidate the 18 codex-handoff docs — archive old ones, keep `EARTH_SIMULATOR_DOCS_INDEX.md` as the single living index.

**Done when:** Earth Simulator loads clean (no 404 tile errors), draft PR backlog is
cleared, Arraylake bake CI is green, fungal observations are live again.

### D-2. MYCA Public Chat

**Current state:** MYCA chat lives at `/myca`. [PR #165](https://github.com/MycosoftLabs/website/pull/165)
attempted to fix public chat, search routing, and auth in a 61-file / 5,971-line PR. It
received "changes requested" review feedback, was never updated, and is now 3+ months stale
with merge conflicts.

**Blockers:**
- PR #165 is too large and too stale to rebase.
- MAS backend connectivity has not been verified recently.

**Next steps:**
1. Audit which changes from PR #165 already landed on `main` through later PRs.
2. Extract still-needed fixes into a small, focused replacement PR.
3. Verify MAS backend connectivity from production.
4. Test public (unauthenticated) chat end-to-end.
5. Close PR #165 with a note pointing to the replacement.

**Done when:** `/myca` loads for unauthenticated users and gets MAS responses.

### D-3. MINDEX Live Data

**Current state:** MINDEX database and API are operational. The `mindex-sync-all` workflow
runs every 5 minutes. iNaturalist delta-sync has recent CI failures (site returning 504
during scheduled runs). PR #229 fixes a header bug blocking fungal observations in the
Earth Simulator.

**Next steps:**
1. Land PR #229 (1-file auth-header fix).
2. Investigate `iNat → MINDEX delta sync` 504 failures — likely a timing/cold-start issue rather than a code bug.
3. Decide on media/news search stubs (`lib/search/live-results-engine.ts` lines 601, 610) — either wire up TMDB/news APIs or remove the search categories.

**Done when:** Delta-sync CI is green, fungal observations flow to Earth Simulator.

### D-4. Security Drafts

Two security PRs are open in draft. Neither should be merged without careful human review.

**[PR #167](https://github.com/MycosoftLabs/website/pull/167) — CVE-2026-31431 mitigation (9 new files)**
- All additive: host mitigation scripts, Ansible playbook, Kyverno admission policy, seccomp profile, Falco rules, CI precheck.
- The CVE is from April 2026; hosts should be patched by now. The tooling is still useful for defense-in-depth.
- *Next:* Security review the scripts. If the team wants the tooling, un-draft and land. Otherwise close with a note that hosts are patched.

**[PR #186](https://github.com/MycosoftLabs/website/pull/186) — RCE + privilege escalation + unauthenticated routes (74 files)**
- Fixes shell injection in `network-diagnostics`, writable `user_metadata.role` privesc, auth gates on 9 unprotected routes, service binding to localhost, hardcoded Supabase keys in Dockerfiles, and removes ~45 debris files.
- *Blocked on human action:* requires key rotation, NEXTAUTH_SECRET change, and a live DB migration.
- *Next:* Triage the 74 files into severity tiers. Extract the highest-severity fixes (RCE, privesc) into a smaller PR that can be rebased and landed without the full bundle. Coordinate human key-rotation steps separately.

**Done when:** CVE-2026-31431 tooling decision is made; RCE/privesc fixes from #186 are extracted and landed in a focused PR.

### D-5. Fusarium / Launchpad

**Current state:** Fusarium UI lives at `app/defense/fusarium` and `app/fusarium/launchpad`.
This code is being copied to a separate Fusarium repository. No changes needed in this repo
beyond keeping the existing pages functional until the migration completes.

**Next steps:** Track migration progress in the Fusarium repo. Once the standalone Fusarium
app is live, remove the duplicated pages from this repo and add redirects.

### D-6. CI Health

**Failing workflows (from recent runs):**

| Workflow | Root cause |
|----------|------------|
| Arraylake field bake | `ARRAYLAKE_TOKEN` secret invalid — `ValueError: Invalid token provided` |
| Production Watchdog | `/api/health` failing; SMTP `535 BadCredentials` on alert email |
| Site Health Monitor | Prod + sandbox returning 504; same SMTP issue |
| CREP Feed Integrity | Transient upstream feed outages (expected, but noisy) |
| iNat → MINDEX delta sync | Site returning 504 during scheduled runs |

**Next steps:**
1. Rotate `ARRAYLAKE_TOKEN` in GitHub Actions secrets.
2. Fix SMTP credentials (Gmail `535 BadCredentials`).
3. Investigate whether `/api/health` is actually down or the watchdog is stale.
4. Add auto-close to `CREP Feed Integrity` workflow (see Section C-1).

---

*This document is a point-in-time snapshot. Update it as items are resolved.*
