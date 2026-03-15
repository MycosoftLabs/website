# Auth Troubleshooting (Website Sign-In)

**Date**: March 15, 2026  
**Status**: Complete  

## Overview

Checklist and fixes for “auth not working” when signing in to the Mycosoft website (password, magic link, or OAuth).

## Required environment variables

These must be set where the Next.js app runs (local `.env.local`, Sandbox/production build or runtime):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Optional (production) | Base URL for redirects when behind proxy (e.g. `https://sandbox.mycosoft.com`) |

If either Supabase variable is missing, the login and callback routes now redirect to `/login?error=...` with a clear message instead of throwing a 500.

## Supabase Dashboard – Redirect URLs

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add every base URL the app is served from, for example:
   - `http://localhost:3010`
   - `https://sandbox.mycosoft.com`
   - `https://mycosoft.com`
3. Save. Without these, OAuth and magic-link redirects can be rejected and session cookies may not be set.

## Origin and proxy (Sandbox/Cloudflare)

- Login and callback use `getOrigin(request)` so redirects go back to the same host the user is on.
- Logic: request URL origin; if not localhost, then `x-forwarded-host` + `x-forwarded-proto`; else `NEXT_PUBLIC_SITE_URL` or request origin.
- For production behind Cloudflare/proxy, set `NEXT_PUBLIC_SITE_URL` to the public base URL (e.g. `https://sandbox.mycosoft.com`) if forwarded headers are wrong or missing, so redirects and cookies match the site.

## Auth flow (reference)

- **Password:** POST `/auth/login` → Supabase `signInWithPassword` → redirect to `/auth/continue?next=...` with cookies → server `redirect(next)`.
- **Magic link / OAuth:** Supabase redirects to `/auth/callback?code=...&next=...` → exchange code for session, set cookies on redirect response → redirect to `next`.

## What was changed (March 2026)

- **`app/auth/login/route.ts`:** At the start of POST, if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, redirect to `/login?error=...` with a clear message (no 500).
- **`app/auth/callback/route.ts`:** Before using Supabase, same env check; if missing, redirect to `/login?error=...` with `redirectTo` preserved.

## Quick checks when sign-in fails

1. **Env:** Confirm both Supabase vars are set in the environment that serves the app (e.g. Sandbox container env or `.env.local` locally).
2. **Supabase redirect URLs:** Ensure the site’s base URL(s) are allowlisted in Supabase Authentication → URL Configuration.
3. **URL bar after submit:** If you see `?error=...` on `/login`, read the message; it may say “Sign-in is not configured” (env) or the Supabase error (e.g. invalid credentials).
4. **Production:** If redirects go to the wrong host, set `NEXT_PUBLIC_SITE_URL` and/or fix `x-forwarded-host` / `x-forwarded-proto` so `getOrigin(request)` matches the public site URL.

## Related

- Login form: `app/login/LoginForm.tsx`
- Password handler: `app/auth/login/route.ts`
- Callback (OAuth/magic link): `app/auth/callback/route.ts`
- Continue (post-login redirect): `app/auth/continue/page.tsx`
- Supabase server client: `lib/supabase/server.ts`
