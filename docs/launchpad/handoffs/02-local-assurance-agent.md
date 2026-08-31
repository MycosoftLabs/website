# Launchpad Handoff 02 — Local Assurance Agent (Cursor)

**Lane:** Cursor owns the agent binary, check packs, signing, and distribution. Claude built the schema and intake contract.

## Security model (non-negotiable, from spec §12)

Read-only checks · no remote shell · no credential harvesting · signed releases + signed policy manifests · customer-controlled enrollment/revocation/kill switch · raw data stays local · cloud receives only `{check_id, check_version, observed_at, result, one-sentence summary, detail_hash, mapped_controls}`.

## What exists

- `launchpad_local_agents` — token/HMAC **hashes only**, status lifecycle enrolled→active→revoked/expired, tenant-scoped RLS.
- `launchpad_local_check_results` — **the schema is the boundary**: there are no columns for raw logs, configuration bodies, or captures. Members read; INSERT is service-role only.
- `POST /api/fusarium/launchpad/local-agent/results` — 501 stub carrying the full HMAC contract (headers `X-LP-Agent-Id` / `X-LP-Timestamp` / `X-LP-Signature`, ±300s window, replay rejection). Implement per the comments in the route file; **tenant_id always derives from the agent row, never the payload**.
- Enrollment route to build: `POST /api/fusarium/launchpad/local-agent/enroll` — requireTenant(owner/admin), mint token, store hash, show token exactly once, cap device count by `deriveEntitlements().entitlements.localAgentDevices`.

## Initial check pack (spec §12.5)

OS/device inventory, patch posture, disk encryption, MFA indicators, firewall, endpoint protection, backup status, stale accounts, open services (local host perspective), logging availability, Wazuh manager/agent health (sanitized counts only), NAS health.

## Hard rule for the UI wiring

Agent results may set `launchpad_control_states.state_source = 'agent_check'` **but never flip a control to `implemented` without explicit customer confirmation**. The DB enum accepts only `customer|agent_check`; there is no AI path and none may be added.

## Tests (spec §35.7)

Unsigned agent rejected · revoked agent rejected · replayed result rejected · no arbitrary command execution · result contains no raw logs · customer preview matches transmitted payload · kill switch stops transmission.
