# Dev and Sandbox Keys Flow – February 6, 2026

## Overview

This doc describes how to obtain and set **MINDEX_API_KEY**, **MYCORRHIZAE_PUBLISH_KEY**, and **MYCORRHIZAE_ADMIN_KEY** for local development and sandbox (VM 187) so the website and Mycorrhizae API work without manual key creation.

---

## Required env vars (all environments)

Ensure these are set in `.env.local` (dev) or in the website/Mycorrhizae container env (sandbox):

| Variable | Purpose |
|----------|---------|
| **MAS_API_URL** | MAS orchestrator (e.g. http://192.168.0.188:8001). |
| **MINDEX_API_URL** | MINDEX API base URL (e.g. http://192.168.0.189:8000 or http://192.168.0.187:8000). |
| **MINDEX_API_KEY** | API key sent as `X-API-Key` to MINDEX. |
| **MYCORRHIZAE_API_URL** | Mycorrhizae API (e.g. http://192.168.0.187:8002). |
| **MYCORRHIZAE_PUBLISH_KEY** | Key for publishing to Mycorrhizae channels. |
| **MYCORRHIZAE_ADMIN_KEY** | Key for Mycorrhizae admin (keys, channels). |

See `env.local.example` for a full list and comments.

---

## Option A: Internal keys API (recommended)

The website exposes an **internal keys API** that generates and stores keys for **dev**, **test**, and **sandbox**.

### 1. Start the dev server

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\WEBSITE\website
npm run dev
```

Dev server runs at **http://localhost:3010** (see workspace rules).

### 2. Get dev keys

- **In development:** If `INTERNAL_KEYS_ADMIN_SECRET` is not set, the API allows requests in `NODE_ENV=development` without a secret.
- **With secret:** Set `INTERNAL_KEYS_ADMIN_SECRET` in `.env.local`, then pass it in requests.

**Get or create dev keys:**

```powershell
# No secret (dev only)
curl -s http://localhost:3010/api/internal/keys/dev

# With secret
$secret = $env:INTERNAL_KEYS_ADMIN_SECRET
curl -s -H "X-Internal-Keys-Secret: $secret" http://localhost:3010/api/internal/keys/dev
```

Response includes `keys` (MINDEX_API_KEY, MYCORRHIZAE_PUBLISH_KEY, MYCORRHIZAE_ADMIN_KEY) and `envSnippet` (ready to paste into `.env.local`).

### 3. Paste into `.env.local`

Copy the `envSnippet` from the response into your `.env.local`, or copy each key into the corresponding variable. Ensure **MYCORRHIZAE_API_URL** is set (e.g. `http://localhost:8002` for local Mycorrhizae, or `http://192.168.0.187:8002` for Sandbox).

### 4. Configure Mycorrhizae API to accept the keys

The Mycorrhizae API (GitHub MycosoftLabs/Mycorrhizae) must be configured with the same **MYCORRHIZAE_PUBLISH_KEY** and **MYCORRHIZAE_ADMIN_KEY** (e.g. via its env or key store). Create or register these keys in the Mycorrhizae API if it supports key creation (e.g. `POST /api/keys`); otherwise set the same values in the Mycorrhizae API config.

### 5. Generate keys for test or sandbox

```powershell
# Generate new keys for sandbox (rotates existing if any)
curl -s -X POST -H "Content-Type: application/json" -H "X-Internal-Keys-Secret: $secret" `
  -d '{"env":"sandbox"}' http://localhost:3010/api/internal/keys/generate
```

Use the returned keys in the **website container** env on Sandbox (187) and in the **Mycorrhizae API** config on 187.

---

## Option B: Fixed dev keys (no internal API)

If you do not use the internal keys API:

1. **MINDEX_API_KEY:** Use a fixed value (e.g. `local-dev-key`) and ensure the MINDEX API, if it validates keys, accepts this value.
2. **Mycorrhizae keys:** Create keys in the Mycorrhizae API (e.g. via its admin/key endpoints) and paste the same values into `.env.local` as `MYCORRHIZAE_PUBLISH_KEY` and `MYCORRHIZAE_ADMIN_KEY`.

---

## Sandbox (VM 187)

- Set the same env vars in the **website container** on 187 (e.g. via compose env or `.env` used by the stack).
- Set **MYCORRHIZAE_PUBLISH_KEY** and **MYCORRHIZAE_ADMIN_KEY** in the **Mycorrhizae API** container/config on 187 so it accepts publish and admin requests from the website.
- You can generate sandbox keys once via `POST /api/internal/keys/generate` (from a machine that can call the website), then copy the result into both the website and Mycorrhizae config on 187.

---

## Script: get dev keys

Use the script in `scripts/get-dev-keys.ps1` to fetch dev keys and optionally append the snippet to `.env.local`. See script header for usage.

---

## Related docs

- **mycosoft-mas** repo: `docs/APIS_AND_KEYS_AUDIT_FEB06_2026.md` – Where each API and key lives.
- **mycosoft-mas** repo: `docs/VM_LAYOUT_AND_DEV_REMOTE_SERVICES_FEB06_2026.md` – VM layout and dev env.
- **website** repo: `env.local.example` – Full env template.

---

*Document date: February 6, 2026*
