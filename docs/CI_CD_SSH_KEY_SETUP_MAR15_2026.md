# CI/CD SSH Key Setup (Mar 15, 2026)

**Status:** Current  
**Last updated:** Mar 29, 2026 (Cloudflare Access for tunnel SSH)  
**Repo:** website  
**Workflow:** `.github/workflows/ci-cd.yml`, `.github/workflows/deploy-sandbox-production.yml`

## Overview

Deploy jobs (staging and production) use SSH to connect to the host. The private key is provided via GitHub Actions secrets. The workflow supports two ways to supply it to avoid paste/line-ending issues.

## Required secret: `SSH_KEY`

- **What:** The **private** SSH key (full PEM block), not the public key.
- **Format:** Must start with `-----BEGIN OPENSSH PRIVATE KEY-----` (or `-----BEGIN RSA PRIVATE KEY-----` for RSA). Do **not** use the line that starts with `ssh-ed25519` or `ssh-rsa` — that is the public key.
- **Where to get it (on the VM):**
  ```bash
  cat ~/.ssh/id_ed25519
  ```
  Or `~/.ssh/id_rsa` if you use RSA.
- **When pasting into GitHub (Settings → Secrets and variables → Actions → SSH_KEY):**
  - Copy the **entire** output, including `-----BEGIN ... -----` and `-----END ... -----`.
  - No trailing spaces on any line.
  - No extra blank lines at the end.
  - One line break at the end of the key is fine.

If the key is malformed (e.g. wrong line endings or public key used), you may see:

`Load key "...": error in libcrypto`

Fixing the secret value as above resolves that.

## Optional secret: `SSH_KEY_B64`

To avoid paste/newline issues entirely, you can store the key as base64:

1. On the VM: `cat ~/.ssh/id_ed25519 | base64 -w 0`
2. Put the single line of output into a new secret **`SSH_KEY_B64`** (no newlines).

The workflow decodes it and writes the key to a file, then uses **key_path** for all SSH steps. If **`SSH_KEY_B64`** is set, it is used; otherwise **`SSH_KEY`** is used.

## Other deploy secrets

- **`PRODUCTION_HOST`** — Hostname or IP for production (e.g. `192.168.0.187` or `sandbox.mycosoft.com`).
- **`STAGING_HOST`** — Hostname or IP for staging (for deploy-staging).
- **`SSH_USER`** — SSH username (e.g. `mycosoft`). Defaults to `mycosoft` if unset.

### Cloudflare Tunnel + Access (required when SSH hostname is behind Access)

If **`PRODUCTION_HOST`** / **`STAGING_HOST`** is a **Cloudflare Tunnel** hostname and that hostname is protected by **Cloudflare Zero Trust Access**, GitHub Actions must authenticate as a **service** before SSH can complete the banner exchange. Without these secrets, the job fails with **“Connection timed out during banner exchange”** and logs **“CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET not set”**.

Add **both** repository secrets (same names in **Settings → Secrets and variables → Actions**; if you use a **`production`** environment, add them there too):

| Secret | Source |
|--------|--------|
| **`CF_ACCESS_CLIENT_ID`** | Cloudflare Zero Trust → **Access** → **Service Auth** → create a **Client ID** for a service token allowed to reach your SSH application. |
| **`CF_ACCESS_CLIENT_SECRET`** | The matching **Client Secret** for that token. |

Ensure an **Access policy** on the SSH (or catch-all) application allows **Service Auth** for that token. The composite action **`.github/actions/setup-ssh`** passes these into `cloudflared access ssh` via a small proxy script (see `action.yml`).

**Do not** commit these values; they are not the same as VM passwords in `.credentials.local`.

Deploy and VM diagnostic workflows pass **`require-cloudflare-access: true`** into **`.github/actions/setup-ssh`**, so the job fails immediately with a clear error if either Access secret is missing (instead of timing out during the SSH banner).

## Workflow behavior

- A **Prepare SSH key** step writes the key to a temp file (from `SSH_KEY_B64` or `SSH_KEY`) and sets permissions.
- All **appleboy/ssh-action** steps use **key_path** pointing to that file (absolute path under `RUNNER_TEMP`) instead of **key**, which avoids the action’s own key writing and can prevent libcrypto errors when the secret is correct.
- If you see `Load key "...": error in libcrypto`, the key content is invalid — fix **SSH_KEY** (or use **SSH_KEY_B64**) as above.

## See also

- `docs/DEV_TO_SANDBOX_PIPELINE_FEB06_2026.md` — Dev and deploy pipeline
- GitHub: Actions → Secrets and variables → Actions for this repo
