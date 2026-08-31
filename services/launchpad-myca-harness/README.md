# FUSARIUM Launchpad — Local MYCA Harness

Customer-installed **local orchestrator** for a defense-startup workspace. It works the tenant Launchpad task queue with subagents on **your machine**. Prompts, BYO AI keys, and raw system data never go to Launchpad cloud. Only sanitized one-sentence results and hashes sync. **Every output is a proposal a human approves. Agents never flip a control to implemented.**

Mycosoft is pursuing CMMC Level 2 (Self-Assessment). This tool is not a certification, assessment, or authorization.

## Security model

| Rule | Behavior |
|---|---|
| Read-only default | Host probes never open a remote shell and never harvest credentials |
| BYO AI keys | Stored only in `~/.launchpad-myca/config.json` (mode 600) or `.launchpad-myca.local.json` (gitignored) |
| Cloud intake | `POST /api/fusarium/launchpad/local-agent/results` — `{check_id, result, summary≤280, detail_hash, mapped_controls}` |
| Forbidden in sync | Raw logs, PCAPs, SIEM dumps, prompts, completions, CUI banners, SF-86 / e-QIP / NBIS, secrets |
| Kill switch | `"kill_switch": true` in config or `LP_AGENT_KILL_SWITCH=1` — stops transmission |
| Human gate | Local inbox + Launchpad approval inbox. No DocuSign send. No control PATCH. |

## Connect flow

1. **Enroll** — Launchpad owner/admin opens `/app/launchpad/local-agent` (or `POST /api/fusarium/launchpad/local-agent/enroll`) and copies `agent.id` (and `hmac_key` if shown). Token is shown once.
2. **Workspace API key** — Settings → API keys → create a key with scope `agent` (or `read`+`agent`). Copy the `lp_…` plaintext once.
3. **BYO AI key (optional)** — paste Anthropic / OpenAI / xAI key into local config only. Launchpad cloud never receives it. Without a key, deterministic checks still run; the Document subagent stays idle.
4. **Run** the harness on each in-scope workstation (device caps follow the plan).

## Install (Windows)

Python 3.11+ required. No extra packages for the default path.

```powershell
cd path\to\website\services\launchpad-myca-harness
python -m launchpad_myca_harness init
notepad $env:USERPROFILE\.launchpad-myca\config.json
```

Set:

- `launchpad_base_url` — `http://localhost:3010` for local Launchpad, or your workspace origin
- `agent_id` — UUID from enroll
- `workspace_api_key` — `lp_…`
- `hmac_key` — optional if the enroll response included one
- `byo_ai.api_key` — optional, local only

```powershell
python -m launchpad_myca_harness status
python -m launchpad_myca_harness once
python -m launchpad_myca_harness run
```

Optional install:

```powershell
pip install -e .
launchpad-myca once
```

From the website repo:

```powershell
.\scripts\launchpad\run-myca-harness.ps1 once
```

## Subagent roster

| Subagent | What it does | What syncs |
|---|---|---|
| **Readiness** | Turns local check observations into *suggestions* for control families | One-sentence suggestion + mapped control ids. Never PATCH `/readiness/controls` |
| **Evidence** | SHA-256 indexes files in `evidence_dir` | Hash + count. Skips SF-86 names, `.pcap`, `.evtx`, `.log`. Bytes stay local |
| **Document** | DRAFT policy outline via local BYO model | Draft hash + “awaiting human approval”. Never signs, never DocuSign |
| **Systems Check** | 12 read-only probes (inventory, patch, BitLocker/FileVault, MFA indicators, firewall, endpoint, backup, stale-account *count*, listen-port *count*, logging metadata, Wazuh health flag, NAS mapped-drive *count*) | Pass/fail/indeterminate + one sentence + detail_hash |
| **Radar** | Ranks **ingested** opportunities against local NAICS/PSC notes | Count + idle note if SAM is empty. **No mock federal data** |

## Sync endpoints (existing BFFs — no new privileged write surface)

| Direction | Route | Auth |
|---|---|---|
| Enroll (browser) | `POST /api/fusarium/launchpad/local-agent/enroll` | Session owner/admin |
| Work queue | `GET /api/fusarium/launchpad/tasks` | Session **or** Bearer `lp_…` (agent\|read\|admin) |
| Control register (read) | `GET /api/fusarium/launchpad/readiness/controls` | Same |
| Radar | `GET /api/fusarium/launchpad/radar/opportunities` and `/radar/rank` | Same |
| Results | `POST /api/fusarium/launchpad/local-agent/results` | Bearer `lp_…` and/or HMAC `X-LP-Agent-Id` + `X-LP-Timestamp` + `X-LP-Signature` |
| Findings (UI) | `GET /api/fusarium/launchpad/local-agent/findings` | Session |

HMAC: `hex(HMAC-SHA256(hmac_key, `${unixSeconds}.${rawBody}`))` with ±300s window. Replay rejected.

`GET` via `lp_` is read-only. Task PATCH, control PATCH, and signature send still require a human session.

## Local files (never commit)

| Path | Purpose |
|---|---|
| `~/.launchpad-myca/config.json` | Agent id, `lp_` key, BYO AI key |
| `~/.launchpad-myca/inbox.jsonl` | Local approval log |
| `~/.launchpad-myca/drafts/*.md` | Document drafts |
| `.launchpad-myca.local.json` | Optional cwd override (gitignored) |

## Tests

```powershell
python -m unittest tests.test_harness
```

From the website repo: Jest covers HMAC parity with `lib/launchpad/agent/hmac.ts`.
