---
description: Authenticate on mycosoft.com — login with email/password, magic link, Google/GitHub OAuth, signup, role detection (ANONYMOUS through SUPER_ADMIN), session management, and auth redirects
---

# Platform Authentication

## Identity
- **Category**: platform
- **Access Tier**: PUBLIC (login/signup pages are open; authenticated features require USER role or higher)
- **Depends On**: Supabase Auth (lib/supabase/client), platform-access-tiers (role and gate definitions)
- **Route**: `/login`, `/signup`, `/auth/callback`
- **Key Components**: `app/login/page.tsx`, `app/login/LoginForm.tsx`, `app/signup/page.tsx`, `lib/access/types.ts`, `hooks/use-supabase-user.ts`, `contexts/auth-context.tsx`

## Success Criteria (Eval)
- [ ] Agent can sign in with email and password via the login form
- [ ] Agent can sign in via Google OAuth or GitHub OAuth
- [ ] Agent can send a magic link email and sign in passwordlessly
- [ ] Agent can create a new account via the signup form
- [ ] Agent is redirected to the correct destination after authentication (honors `redirect`, `redirectTo`, `callbackUrl` query params)
- [ ] Agent can identify current user role (ANONYMOUS, USER, PREMIUM, ADMIN, SECURITY_ADMIN, SUPER_ADMIN)
- [ ] Agent can sign out via the user avatar dropdown

## Navigation Path (Computer Use)
1. From any page, look for "Sign In" button at top-right of header (visible when not authenticated).
2. Click "Sign In" to navigate to `/login`.
3. On the login page, choose: Google OAuth, GitHub OAuth, email/password, or magic link.
4. After authentication, the callback at `/auth/callback` redirects to the `next` parameter (defaults to `/dashboard`).

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|---|---|---|
| "Sign In" button (User2 icon) | Header top-right (desktop only, hidden on mobile) | Click to go to `/login` |
| "Sign in to Mycosoft" card | Center of `/login` page | Contains all auth options |
| "Continue with Google" button | Top of login card, outline style, h-12 | Click to initiate Google OAuth flow |
| "Continue with GitHub" button | Below Google button, outline style, h-12 | Click to initiate GitHub OAuth flow |
| "Or continue with" divider | Below OAuth buttons | Visual separator |
| Email input field | Below divider, labeled "Email" | Type email address (placeholder: "you@example.com") |
| Password input field | Below email, labeled "Password" | Type password |
| "Sign In" submit button | Below password field, full width | Click to submit email/password login |
| "Sign in with magic link" button | Below submit, ghost variant with Mail icon | Click to switch to magic link mode |
| "Send Magic Link" button | Replaces password form in magic link mode | Click after entering email to send OTP link |
| "Back to password sign in" | Below magic link button | Click to return to password mode |
| Error alert (red, AlertCircle icon) | Above form fields when error occurs | Read message; fix input and retry |
| Success alert (green, Mail icon) | Above form fields after magic link sent | Check email for the link |
| "Create an account" card | Center of `/signup` page | Signup form with OAuth + email |
| "Sign up with Google" button | Top of signup card | Click for Google OAuth signup |
| "Sign up with GitHub" button | Below Google signup button | Click for GitHub OAuth signup |
| Full Name input | Signup form, first field | Enter display name |
| Confirm Password input | Signup form, after password | Must match password |
| "Create Account" button | Bottom of signup form | Click to register |
| "Already have an account? Sign in" link | Card footer on signup page | Click to go to `/login` |
| "Check your email" success card | Replaces signup form on success | Confirmation email sent; click "Go to sign in" |
| User avatar dropdown | Header top-right when authenticated | Click for Profile, Settings, Security Center, Sign Out |

## Core Actions

### 1. Sign In with Email and Password
1. Navigate to `/login` (click "Sign In" in header or go directly).
2. Enter email in the "Email" field.
3. Enter password in the "Password" field.
4. Click the "Sign In" button.
5. Form POSTs to `/auth/login?redirectTo=<destination>`.
6. On success, redirected to `redirectTo` (defaults to `/dashboard`).

### 2. Sign In with Google OAuth
1. Navigate to `/login`.
2. Click "Continue with Google" button.
3. Supabase redirects to Google consent screen.
4. After consent, redirected to `/auth/callback?next=<destination>`.
5. Session established; redirected to final destination.

### 3. Sign In with Magic Link
1. Navigate to `/login`.
2. Click "Sign in with magic link" to switch to magic link mode.
3. Enter email address.
4. Click "Send Magic Link".
5. Check email for the OTP link.
6. Click the link in email; it redirects through `/auth/callback`.

### 4. Create a New Account
1. Navigate to `/signup` (linked from login page footer).
2. Choose OAuth (Google/GitHub) or fill in: Full Name, Email, Password, Confirm Password.
3. Password must be at least 8 characters; passwords must match.
4. Click "Create Account".
5. Success screen says "Check your email" -- click confirmation link to verify.
6. After verification, sign in at `/login`.

### 5. Sign Out
1. Click the user avatar in the header top-right.
2. From the dropdown, click "Sign Out".
3. `signOut()` is called; user is redirected to `/`.

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|---|---|---|
| "Authentication is not configured" error | Supabase client returned null (env vars missing) | Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set |
| "Passwords do not match" error on signup | Confirm password field does not match password | Re-enter matching passwords |
| "Password must be at least 8 characters" | Password too short | Use a password with 8+ characters |
| Redirected to `/dashboard` instead of expected page | No redirect param in URL | Ensure the originating link passes `?redirect=<path>` or `?redirectTo=<path>` |
| Google OAuth fails silently | OAuth redirect URL mismatch in Supabase config | Verify Supabase OAuth redirect URLs include the current origin |
| "Sign In" button not visible on mobile | Desktop-only (`hidden md:flex`) | Use the mobile hamburger menu; "Sign In" link is in the mobile drawer footer |
| companyOnly features not visible after login | Email domain is not @mycosoft.org or @mycosoft.com | COMPANY gate requires `isCompanyEmail()` check; use a company domain email |

## Role Hierarchy and Access Gates

### User Roles (ascending privilege)
1. **ANONYMOUS** -- no authentication
2. **USER** -- basic authenticated user
3. **PREMIUM** -- paid subscription (Pro $29/mo or Enterprise $99/mo)
4. **ADMIN** -- administrative access
5. **SECURITY_ADMIN** -- security compliance access (same level as ADMIN, different scope)
6. **SUPER_ADMIN** -- highest privilege (Morgan only)

### Access Gates
| Gate | Symbol | Minimum Role | Description |
|---|---|---|---|
| PUBLIC | Open to everyone | ANONYMOUS | No restrictions |
| FREEMIUM | Free with limits | ANONYMOUS | Rate-limited; daily/monthly caps |
| AUTHENTICATED | Login required | USER | Must be signed in |
| PREMIUM | Subscription required | PREMIUM | Requires Pro or Enterprise tier |
| COMPANY | Employees only | USER + company email | Must have @mycosoft.org or @mycosoft.com email |
| ADMIN | Admin only | ADMIN | Administrative users |
| SUPER_ADMIN | Owner only | SUPER_ADMIN | Single-user access |

### Company Email Detection
- Allowed domains: `mycosoft.org`, `mycosoft.com`
- Checked by `isCompanyEmail(email)` in `lib/access/types.ts`
- Controls visibility of `companyOnly` items in navigation and sidebar

## Composability
- **platform-navigation**: Auth state controls "Sign In" vs avatar display, "Security" link visibility, and `companyOnly` item filtering.
- **platform-access-tiers**: Role and gate checks gate features across the entire platform.
- **platform-natureos-dashboard**: Sidebar items filtered by COMPANY gate.
- **All authenticated features**: Depend on session from Supabase auth.

## Computer Use Notes
- Login and signup forms use `min-h-dvh` centering with `max-w-lg` card width.
- OAuth buttons are `h-12` (48px) tall with SVG icons.
- Input fields are `h-12` with `text-base` for readable text on mobile.
- The redirect flow uses `sessionStorage.setItem("authRedirectTo", redirectTo)` as a backup for OAuth.
- The `/auth/callback` route handles the OAuth code exchange and redirects to `next` param.
- Magic link mode toggles the form in-place (no route change); look for "Back to password sign in" to switch back.

## Iteration Log
### Attempt Log
- Initial creation: documented login (email/password, magic link, Google/GitHub OAuth), signup, role hierarchy (6 roles), access gates (7 levels), session management via Supabase, redirect handling, and sign-out flow.
