---
description: Authenticate with mycosoft.com — login, signup, role detection, access tier behavior, and session management
---

# Platform Authentication

## Identity
- **Category**: platform
- **Access Tier**: PUBLIC (login/signup pages), all tiers (behavior varies by role)
- **Depends On**: platform-navigation
- **Route**: /login, /signup, /profile, /settings
- **Key Components**: app/login/page.tsx, app/signup/page.tsx, hooks/use-supabase-user.ts, lib/access/types.ts

## Success Criteria (Eval)
- [ ] Successfully log in with email and password
- [ ] Successfully create a new account via signup
- [ ] Detect current user role from UI indicators (avatar, menu items)
- [ ] Understand which features unlock at each access tier
- [ ] Handle auth redirects when visiting protected pages while logged out
- [ ] Successfully log out and confirm session is cleared

## Navigation Path (Computer Use)
1. Open `https://mycosoft.com`
2. Look for "Sign in" button or user avatar in top-right corner of header
3. If no avatar visible — user is not logged in, click "Sign in"
4. Login page shows email/password form and Google OAuth button
5. After login — redirected to previous page or /natureos dashboard
6. User avatar appears in top-right confirming login

## Screen Elements Map
| What You'll See | Where On Screen | What To Do |
|----------------|-----------------|------------|
| "Sign in" button | Top-right header | Click to go to login page |
| Email input field | Center of login page | Type email address |
| Password input field | Below email | Type password |
| "Sign in" / "Log in" button | Below password | Click to submit |
| "Sign in with Google" button | Below or above form | Click for OAuth flow |
| "Don't have an account? Sign up" link | Bottom of login form | Click to go to signup |
| User avatar (circular) | Top-right header (when logged in) | Click for user dropdown |
| User dropdown menu | Below avatar | Shows: Profile, Settings, Billing, Log out |
| Role indicator | In user menu or profile page | Shows current tier |

## Access Tier Hierarchy
| Role | How to Identify | What Unlocks |
|------|----------------|--------------|
| ANONYMOUS | No avatar, "Sign in" visible | PUBLIC + FREEMIUM routes only |
| USER | Avatar visible, basic user | All AUTHENTICATED routes |
| COMPANY | Avatar + company badge, @mycosoft.org email | Infrastructure, MAS, AI Studio, FUSARIUM |
| ADMIN | Admin indicator in menu | Security, Defense, Platform admin |
| SUPER_ADMIN | Morgan only | Settings, Model Training, Drone, Smell Training |

## Core Actions

### Action 1: Log In with Email/Password
1. Navigate to `/login` or click "Sign in" in header
2. See login form centered on page
3. Click email field, type email address
4. Click password field, type password
5. Click "Sign in" button
6. Wait for redirect — avatar should appear in header
7. Verify: user dropdown menu shows name/email

### Action 2: Sign Up for New Account
1. Navigate to `/signup` or click "Sign up" link on login page
2. Fill in: name, email, password (possibly confirm password)
3. Click "Create account" or "Sign up" button
4. May see email verification prompt
5. Check for confirmation or auto-login

### Action 3: Log In with Google OAuth
1. On login page, click "Sign in with Google"
2. Google popup/redirect appears — select account
3. Authorize Mycosoft
4. Redirected back to site, logged in

### Action 4: Detect Access Tier
1. After login, click user avatar in header
2. Dropdown shows user email — check domain
3. @mycosoft.org or @mycosoft.com = COMPANY tier
4. Look for admin indicators in menu
5. Try navigating to COMPANY-only routes (e.g., /natureos/fusarium) — if visible, you have access

### Action 5: Log Out
1. Click user avatar in top-right
2. Click "Log out" or "Sign out" in dropdown
3. Verify: avatar disappears, "Sign in" button reappears
4. Session cleared — protected routes will redirect to login

## Common Failure Modes
| What You See | What Went Wrong | What To Do |
|-------------|-----------------|------------|
| "Invalid credentials" error | Wrong email or password | Re-type carefully, check caps lock |
| "Email already in use" on signup | Account exists | Go to login instead |
| Google popup blocked | Browser popup blocker | Allow popups for mycosoft.com |
| Redirect loop after login | Session cookie issue | Clear cookies, try again |
| Can't access /natureos/fusarium | Not a COMPANY user | Need @mycosoft.org email |
| "Unauthorized" or blank page | Session expired | Log out and log back in |

## Composability
- **Prerequisite skills**: platform-navigation
- **Next skills**: platform-natureos-dashboard, all authenticated features

## Computer Use Notes
- Supabase Auth handles sessions via cookies — they persist across page navigations
- Google OAuth opens a popup window — Computer Use needs to handle window switching
- After login, the `useSupabaseUser()` hook updates — header re-renders with avatar
- Session auto-refreshes — no need to re-login during a single Computer Use session
- The `useGateAccess(AccessGate.COMPANY)` hook determines what sidebar items appear
- Protected routes redirect to `/login?redirect={originalPath}` — after login, user returns to original page

## Iteration Log
### Attempt Log
<!-- Populated by Computer Use recursive learning -->
