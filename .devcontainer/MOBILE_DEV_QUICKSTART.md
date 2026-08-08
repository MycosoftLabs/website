# Mycosoft Website — Mobile Dev Quickstart

You're running the Mycosoft website in a **GitHub Codespace** from a phone, tablet, or any browser. No local dev machine required.

## Open the Codespace

1. From your phone/tablet, open [github.com/MycosoftLabs/website](https://github.com/MycosoftLabs/website).
2. Tap **Code → Codespaces → Create codespace on main** (or open the existing one).
3. Wait ~3–5 min on first creation while deps install. Subsequent starts are ~20 sec.

Recommended apps for the best mobile/tablet experience:

- **iPad/iPhone:** the [GitHub Mobile app](https://github.com/mobile), or open `github.dev` in Safari and switch to your Codespace.
- **Android:** GitHub Mobile, or any modern browser.
- **iPad + keyboard:** open Codespace directly in Safari for the full VS Code web experience.

## Run the site

```bash
npm run dev        # Next.js dev on port 3010 (auto-forwards in browser)
npm run dev:crep   # Alt dev profile, port 3020
npm run build      # Production build
npm run lint
npm test
```

Port 3010 will auto-open a preview tab when `npm run dev` starts.

## Secrets / .env.local

The bootstrap script populates `.env.local` from `.env.example`, then overlays any
matching **Codespaces secret** at create time and on every start.

To add or rotate secrets safely from your phone:

1. Go to [Codespaces secrets settings](https://github.com/MycosoftLabs/website/settings/secrets/codespaces).
2. Add a secret with the **exact name** in `.env.example` (e.g. `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Stop and restart the codespace — `post-start.sh` will merge it.

Never commit `.env.local`. It's already in `.gitignore`.

## Typical mobile workflow

1. Open Codespace → pull latest → create a branch.
2. Make the change (or ask the agent in this chat to do it).
3. `npm run lint && npm test` (or `npm run test:e2e:widgets` for E2E).
4. Push branch → open PR from the GitHub Mobile app → merge once CI is green.
5. Production auto-deploys from `main` via the existing GitHub Actions workflow.

## Troubleshooting

- **`sharp` errors:** rebuilt during `npm ci`. If a binary mismatch happens, run `npm rebuild sharp`.
- **Playwright missing browsers:** `npx playwright install chromium`.
- **Out of memory:** the container has `NODE_OPTIONS=--max-old-space-size=6144` set globally; bump higher in `devcontainer.json → remoteEnv` if needed (machine type permitting).
- **Need more horsepower:** in the Codespace creation menu, pick **4-core / 16 GB** (default here) or **8-core / 32 GB** for heavy builds. Settable per-codespace under the `⚙` icon.

## What this does NOT replace from the old dev PC

- **GPU-accelerated builds** (`npm run dev:with-gpu`, `gpu:start`) — Codespaces has no GPU.
- **CapCut / FL Studio** — non-dev tools. Use them on a different machine when you have one.
- **Local NAS access** for stock media — fetch from Drive or commit smaller assets directly.

When the new motherboard arrives and you boot the SSDs back up, this Codespace
config will already be on `main`, so you can use either workflow interchangeably.
