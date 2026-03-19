# OAuth and Gated-Page Verification Checklist (Morgan@mycosoft.org)

**Date:** March 15, 2026  
**Status:** Verification checklist  
**Related:** `lib/access/routes.ts`, `middleware.ts`, `app/auth/callback/route.ts`, `docs/SUPABASE_OAUTH_PARITY_MYCOSOFT_COM_MAR14_2026.md`

---

## Scope

After auth-unify, the website uses **Supabase only** for auth; middleware gates routes using the canonical map in `lib/access/routes.ts`. This checklist verifies that an OAuth-authenticated **Morgan@mycosoft.org** session works consistently across all protected sections on mycosoft.com and sandbox.mycosoft.com.

---

## Pre-requisites

- Supabase redirect URLs include production and sandbox callback URLs (see SUPABASE_OAUTH_PARITY_MYCOSOFT_COM_MAR14_2026.md).
- Test in an incognito/private window so a fresh session is used.

---

## Verification Steps

### 1. Login

- [ ] Open **https://mycosoft.com/login** (or sandbox.mycosoft.com/login).
- [ ] Click “Continue with Google” (or GitHub) and complete OAuth.
- [ ] Confirm redirect to **https://mycosoft.com/** (or requested `redirectTo`) with no “Sign-in not configured” or callback error.
- [ ] Confirm user is logged in (e.g. profile/avatar visible if the header shows it).

### 2. Gated sections (auth required)

Visit each path **while logged in as Morgan@mycosoft.org**. Expect **200** and page content (no redirect to login).

| Path | Expect |
|------|--------|
| `/profile` | 200, profile page |
| `/settings` | 200, settings page |
| `/apps` | 200, apps hub |
| `/natureos` | 200, NatureOS home |
| `/dashboard` | 200, dashboard |
| `/dashboard/crep` | 200, CREP dashboard |
| `/billing` | 200, billing page |

### 3. Company-only sections (@mycosoft.org)

Morgan@mycosoft.org has company email; these should **200**.

| Path | Expect |
|------|--------|
| `/natureos/devices` | 200 |
| `/natureos/mycobrain` | 200 |
| `/natureos/crep` | 200 |
| `/platform` | 200 |
| `/platform/billing` | 200 |
| `/platform/security` | 200 |

### 4. Unauthenticated access (must redirect to login)

- [ ] Log out (or use a different incognito window).
- [ ] Open **https://mycosoft.com/dashboard**. Expect redirect to **/login?redirectTo=/dashboard**.
- [ ] Open **https://mycosoft.com/natureos**. Expect redirect to **/login?redirectTo=/natureos**.
- [ ] After logging in again, confirm redirect back to the requested path (e.g. /dashboard).

### 5. Non-company user on company path

- [ ] If you have a test user with a non-@mycosoft.org email, open `/natureos/devices` or `/platform`. Expect redirect to **/natureos?error=company_access_required**.

### 6. API route (admin)

- [ ] While logged in as Morgan@mycosoft.org, open or call **/api/security**. Expect 200 (or JSON) if Morgan is admin; otherwise 401.

---

## Implementation reference

- **Middleware:** `pathRequiresAuth(pathname)` and `pathRequiresCompanyEmail(pathname)` from `lib/access/routes.ts`; redirect to `/login?redirectTo=...` or `/natureos?error=company_access_required`.
- **Callback:** `app/auth/callback/route.ts` exchanges code for session and redirects to `next`; origin is derived for mycosoft.com, www, sandbox, and localhost.
- **Route map:** `AUTHENTICATED_ROUTES`, `COMPANY_ROUTES`, `PLATFORM_ROUTES`, `ADMIN_ROUTES`, etc. in `lib/access/routes.ts`; `/dashboard` and `/billing` are auth-required.

---

## Sign-off

Once all steps pass for Morgan@mycosoft.org on mycosoft.com (and optionally sandbox), OAuth and gated-page access are verified.  
If any step fails, check Supabase redirect URLs, cookie domain/path, and that `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly in the environment that serves the site.
