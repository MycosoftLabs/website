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

## Submit results (agent)

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
