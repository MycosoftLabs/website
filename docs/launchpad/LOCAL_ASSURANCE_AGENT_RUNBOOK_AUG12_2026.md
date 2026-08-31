# Local Assurance Agent — How to Run — Aug 12, 2026

## Security model

Read-only checks · no remote shell · no credential harvesting · HMAC-signed results · raw detail stays on device · cloud stores result + one-sentence summary + detail_hash only · never auto-flips control `implemented`.

## Server env

```
LAUNCHPAD_ENABLED=1          # local only; keep 0 in sandbox/prod
LAUNCHPAD_AGENT_ROOT_SECRET= # long random; never commit
SUPABASE_SERVICE_ROLE_KEY=   # required for results intake
```

## Enroll (authenticated owner/admin)

```http
POST /api/fusarium/launchpad/local-agent/enroll
Cookie: session + lp_tenant
Content-Type: application/json

{ "name": "Lab Workstation", "platform": "windows" }
```

Response includes `agent.id`, `enrollment_token`, and `hmac_key` **once**. Save locally.

Device caps come from `deriveEntitlements().localAgentDevices` (0 on Core / Founding Pass; 25+ on Contractor Ops).

## Local MYCA harness (preferred — WP-3)

Not a check-runner. Customer-machine orchestrator with Readiness / Evidence / Document / Systems Check / Radar subagents. BYO AI keys stay local. See `services/launchpad-myca-harness/README.md` and `CURSOR_TO_CLAUDE_MYCA_LOCAL_HARNESS_AUG13_2026.md`.

```powershell
cd services/launchpad-myca-harness
python -m launchpad_myca_harness init
# edit ~/.launchpad-myca/config.json (agent_id + lp_… key; optional byo_ai.api_key)
python -m launchpad_myca_harness once
```

## Submit results (legacy HMAC smoke runner)

```powershell
$env:LP_AGENT_ID="<uuid>"
$env:LP_AGENT_HMAC_KEY="<hmac_key from enroll>"
$env:LP_AGENT_RESULTS_URL="http://localhost:3010/api/fusarium/launchpad/local-agent/results"
npx tsx scripts/launchpad/run-local-agent.ts
```

Headers required: `X-LP-Agent-Id`, `X-LP-Timestamp` (±300s), `X-LP-Signature` = hex(HMAC-SHA256(key, `${ts}.${rawBody}`)).

## Contract Radar (related)

```powershell
$env:SAM_API_KEY="<api.data.gov key>"
$env:LAUNCHPAD_INGEST_TOKEN="<token>"
npx tsx scripts/launchpad/run-sam-collector.ts
```

No key → collector refuses (no mock federal data).
