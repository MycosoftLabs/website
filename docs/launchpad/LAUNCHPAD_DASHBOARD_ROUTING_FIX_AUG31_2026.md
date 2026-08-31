# Launchpad dashboard routing fix — Aug 31, 2026

| Field | Value |
|---|---|
| **Date** | August 31, 2026 |
| **Status** | Complete |
| **Repo** | WEBSITE/website |

## What was broken

Signed-in users (Morgan and the local test session) kept landing on the public marketing page `/fusarium/launchpad` instead of the workspace `/app/launchpad/dashboard`.

Causes:

1. The site header and mobile Defense menu labeled **Launchpad** always pointed at the public page.
2. `/login?redirectTo=/app/launchpad/dashboard` did not forward an existing Supabase session.
3. **Local Dev Test Session** set a site-chrome cookie only. Launchpad `requireTenant()` needs a real Supabase session, so the workspace bounced back to login, and the header sent people to marketing again.

## What changed

- Login forwards an existing Supabase session to `redirectTo`.
- Local-dev session now mints a real `morgan@mycosoft.org` Supabase session on localhost only.
- Signed-in nav / account menu / marketing hero send you to `/app/launchpad/dashboard`.
- `/app/launchpad/*` no longer wraps the public site header (so Defense → Launchpad cannot dump you back onto marketing).

## How to open the workspace

`http://localhost:3010/login?redirectTo=/app/launchpad/dashboard`

After sign-in you should stay in the app shell, not the public product page.
