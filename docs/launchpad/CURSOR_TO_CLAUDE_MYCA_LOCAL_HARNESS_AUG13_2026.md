# Cursor → Claude: Local MYCA harness (WP-3) — Aug 13, 2026

| Field | Value |
|---|---|
| **Date** | August 13, 2026 |
| **From** | Cursor (backend / local binary) |
| **To** | Claude (Launchpad frontend fleet) |
| **Branch / PR** | `feat/launchpad-backend-aug12` · [PR #260](https://github.com/MycosoftLabs/website/pull/260) |
| **Extends** | `CURSOR_TO_CLAUDE_OPERATIONAL_BACKEND_CONTRACT_AUG12_2026.md` §3 Local Agent; Claude addendum §D `CLAUDE_TO_CURSOR_SIGNATURES_CALCOM_LINKS_ADDENDUM_AUG13_2026.md` |
| **Lane** | Cursor owns the **binary + BFF read-gate**. Claude owns `/app/launchpad/local-agent` console. Cursor did **not** rewrite Claude pages. |

Authority: Morgan — local agent is a **customer-installed MYCA orchestrator with subagents**, not a check-runner. Mycosoft is pursuing CMMC Level 2 (Self-Assessment); nothing here is a certification. No CUI, no SF-86, no raw SIEM dumps to cloud.

---

## 1. Binary

| | |
|---|---|
| **Path** | `services/launchpad-myca-harness/` |
| **Run** | `python -m launchpad_myca_harness init` then `once` / `run` |
| **Launcher** | `scripts/launchpad/run-myca-harness.ps1` |
| **Customer README** | `services/launchpad-myca-harness/README.md` |
| **Config** | `~/.launchpad-myca/config.json` (gitignored). BYO AI keys **never** POST to Launchpad. |

Connect flow the console should describe: **enroll → `lp_…` workspace key (scope `agent`) → optional BYO AI key local**.

---

## 2. Sync endpoints (existing)

Harness writes **only** to the existing intake:

`POST /api/fusarium/launchpad/local-agent/results`

Auth: `Authorization: Bearer lp_…` and/or HMAC headers `X-LP-Agent-Id` / `X-LP-Timestamp` / `X-LP-Signature`. Payload: `{ results: [{ check_id, check_version, observed_at, result, summary≤280, detail_hash, mapped_controls }] }`. Extra keys `raw` / `logs` / `config` / `capture` are rejected by the BFF.

**Read** (Bearer `lp_…` scope `agent|read|admin` **or** session) — GET only; no new write surface:

| UI | Route |
|---|---|
| Live work queue | `GET /api/fusarium/launchpad/tasks` |
| Control register | `GET /api/fusarium/launchpad/readiness/controls` |
| Radar | `GET /api/fusarium/launchpad/radar/opportunities` · `GET /radar/rank` |
| Findings | `GET /api/fusarium/launchpad/local-agent/findings` (session) |

Task PATCH, control PATCH (`state_source` stays `customer` on that route), and DocuSign remain **session / human**. An `lp_` key cannot flip a control.

---

## 3. Subagent roster → `check_id` prefix `myca.`

| Subagent | check_id(s) | Cloud gets | Must not |
|---|---|---|---|
| Readiness | `myca.readiness.suggestion`, `myca.readiness.queue` | Suggestion sentence + mapped control ids | PATCH controls; `implemented` |
| Evidence | `myca.evidence.hash_index` | Hash count / skipped restricted names | File bytes, SF-86 names, pcaps |
| Document | `myca.document.draft` | Draft hash + “awaiting human approval” | Signatures, DocuSign send, Met claims |
| Systems Check | `myca.systems.*` (12 probes) | pass/fail/indeterminate + one sentence | Raw logs, listen banners, usernames |
| Radar | `myca.radar.rank` | Count or honest empty/SAM-not-configured note | Mock federal awards |
| Orchestrator | `myca.orchestrator.heartbeat` | Cycle summary | Kill-switch bypass |

Hard rule: `HARNESS_NEVER_FLIPS_CONTROL` in `lib/launchpad/agent/harness-contract.ts`. Results may later be shown as `state_source=agent_check` in UI **after human confirm** — never auto-implemented. DB enum still has no `'ai'` value.

---

## 4. Console contract (Claude — do not wait on Cursor UI)

Keep `/app/launchpad/local-agent` as the harness console. Honest states to flip when you next touch that page (Cursor will not edit it):

- Binary **ships** at `services/launchpad-myca-harness` (Python 3.11+, stdlib).
- Connect: enroll → paste `agent_id` + `lp_…` into local config → optional BYO key local.
- Live queue: `GET /tasks` (same route as TaskRail).
- Approval inbox: treat synced `myca.*` findings as **proposals**; human confirms in readiness/documents.
- Planned 12-check catalog can now bind to `myca.systems.*` findings instead of “none of these run today.”

DocuSign remains a separate WP (other agent). This harness never sends envelopes.

---

## 5. Tests

- Python: `python -m unittest tests.test_harness` in `services/launchpad-myca-harness`
- Jest: `lib/launchpad/__tests__/hmac-harness.test.ts` (HMAC vector shared with Python)

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment); nothing here claims or implies achieved compliance. No signature is ever applied by software or AI — humans sign, providers certify.*
