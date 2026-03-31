---
description: Understand mycosoft.com access tiers — which features are available at each access level from PUBLIC to SUPER_ADMIN
---

# Access Tiers

## Identity
- **Category**: platform
- **Access Tier**: all
- **Depends On**: platform-navigation
- **Route**: all routes
- **Key Components**: lib/access/types.ts, lib/access/routes.ts

## Success Criteria (Eval)
- [ ] Identify current user's access tier from UI indicators
- [ ] Know which routes are PUBLIC (no login needed)
- [ ] Know which routes require AUTHENTICATED access
- [ ] Know which routes require COMPANY (@mycosoft.org) email
- [ ] Know which routes require PREMIUM subscription
- [ ] Understand freemium limits (daily limits, max results)

## Access Tier Reference

### PUBLIC Routes (no login required)
| Route | Description |
|---|---|
| `/` | Homepage |
| `/about` | About page |
| `/about/team` | Team page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/docs` | Documentation |
| `/login` | Login page |
| `/signup` | Signup page |
| `/preview` | Preview page |
| `/devices` | Devices catalog |
| `/devices/[id]` | Device product page |
| `/devices/specifications` | Device specifications |
| `/natureos` | NatureOS home |
| `/natureos/mindex/explorer` | Species Explorer |
| `/natureos/crep` | CREP Dashboard |
| `/ancestry/explorer` | Ancestry Explorer |
| `/apps/earth-simulator` | Earth Simulator |
| `/apps/petri-dish-sim` | Petri Dish Simulator |
| `/apps/compound-sim` | Compound Analyzer |
| `/dashboard/crep` | CREP Dashboard (public) |

### FREEMIUM Routes (public with limits)
| Route | Description | Limits |
|---|---|---|
| `/search` | Search | 10 searches/day, max 20 results |
| `/species` | Species database | 50 lookups/day |
| `/mushrooms` | Mushroom catalog | Max 50 results |
| `/natureos/species` | Species database | 50 lookups/day |
| `/compounds` | Compounds | 20 lookups/day, simulate feature disabled |
| `/natureos/compounds` | Compounds | 20 lookups/day, simulate feature disabled |
| `/science` | Science papers | Abstracts only, full papers disabled |
| `/ancestry` | Ancestry | Basic tree only, explorer disabled |

### AUTHENTICATED Routes (login required, any user)
| Route | Description |
|---|---|
| `/profile` | User profile |
| `/settings` | Settings |
| `/apps` | Apps hub |
| `/dashboard` | Dashboard |
| `/billing` | Billing |

### COMPANY Routes (require @mycosoft.org or @mycosoft.com email)
| Route | Description |
|---|---|
| `/natureos/devices` | Device Network |
| `/natureos/mycobrain` | MycoBrain Console |
| `/natureos/sporebase` | SporeBase Monitor |
| `/natureos/fci` | FCI Monitor |
| `/natureos/fusarium` | FUSARIUM |
| `/natureos/mindex` | MINDEX |
| `/natureos/storage` | Storage |
| `/natureos/containers` | Containers |
| `/natureos/monitoring` | Monitoring |

### PREMIUM Routes (require PRO subscription at $29/mo)
| Route | Description | Subscription |
|---|---|---|
| `/myca-ai` | MYCA AI | PRO |
| `/ancestry/tools` | Ancestry Tools | PRO |
| `/natureos/live-map` | Live Map | PRO |
| `/natureos/sdk` | Developer SDK | PRO |
| `/natureos/api` | API Explorer | PRO |

Note: `/natureos/ai-studio` is listed in PREMIUM_ROUTES but actually uses the COMPANY gate (internal-only, requires @mycosoft.org/@mycosoft.com email).

### ADMIN Routes (admin users only)
| Route | Description |
|---|---|
| `/security` | Security |
| `/security/compliance` | Compliance |
| `/security/fcl` | FCL Tracking |
| `/security/forms` | Forms |
| `/defense` | Defense |
| `/natureos/devices/network` | Network |
| `/natureos/mas` | MAS |
| `/natureos/workflows` | Workflows |
| `/natureos/functions` | Functions |
| `/natureos/integrations` | Integrations |
| `/natureos/wifisense` | WiFiSense |

### ADMIN Routes - Ethics Training (Morgan + Michelle only)
| Route | Description |
|---|---|
| `/ethics-training` | Ethics Training Dashboard |
| `/ethics-training/sandbox/new` | Create Sandbox |
| `/ethics-training/sandbox/[id]` | Training Session |
| `/ethics-training/scenarios` | Scenario Library |
| `/ethics-training/analytics` | Analytics |
| `/ethics-training/observations` | Observer Notes |

Restricted to: `morgan@mycosoft.org` and `michelle@mycosoft.org` only (checked in layout).

### ADMIN Routes - Platform (require @mycosoft.org company email + admin role)
| Route | Description |
|---|---|
| `/platform` | Platform Admin |
| `/platform/analytics` | Platform Analytics |
| `/platform/team` | Team Management |
| `/platform/billing` | Billing & Plans |
| `/platform/api-keys` | API Keys |
| `/platform/security` | Security & Compliance |

### SUPER_ADMIN Routes (Morgan only)
| Route | Description |
|---|---|
| `/natureos/settings` | System Settings |
| `/natureos/model-training` | Model Training |
| `/natureos/drone` | Drone Control |
| `/natureos/shell` | System Shell |
| `/natureos/cloud` | Cloud |
| `/natureos/smell-training` | Smell Training |

## How Access Gates Work

### Enums

**AccessGate** defines the gate type applied to a route:
- `PUBLIC` — open to everyone, no checks
- `FREEMIUM` — open to everyone but with usage limits (daily caps, max results, feature flags)
- `AUTHENTICATED` — requires a logged-in user (any role)
- `COMPANY` — requires login with a `@mycosoft.org` or `@mycosoft.com` email domain
- `PREMIUM` — requires a paid subscription (PRO at $29/mo or ENTERPRISE at $99/mo)
- `ADMIN` — requires the ADMIN or higher role
- `SUPER_ADMIN` — requires the SUPER_ADMIN role (Morgan only)

**UserRole** defines privilege level in ascending order:
1. `ANONYMOUS` — not logged in
2. `USER` — logged in, any email
3. `PREMIUM` — logged in with active paid subscription
4. `ADMIN` — administrator
5. `SECURITY_ADMIN` — same hierarchy level as ADMIN but with different permission scope (security compliance focus)
6. `SUPER_ADMIN` — highest privilege (Morgan only)

**SubscriptionTier** defines payment levels:
- `FREE` — $0/mo
- `PRO` — $29/mo
- `ENTERPRISE` — $99/mo

### Gate Resolution Flow
1. A route is looked up via `getRouteAccess(path)` which checks exact match, then dynamic route patterns (`[id]`), then parent route prefixes.
2. The route's `GateConfig` determines: minimum role, subscription requirement, freemium limits, and rate limits.
3. `hasMinimumRole()` compares the user's role against the required role using `ROLE_HIERARCHY` array index positions.
4. For COMPANY gates, `isCompanyEmail()` checks if the user's email domain is in `COMPANY_EMAIL_DOMAINS` (`mycosoft.org`, `mycosoft.com`).
5. Middleware uses `pathRequiresAuth()` and `pathRequiresCompanyEmail()` for edge-safe prefix-based checks.
6. Some PUBLIC routes under otherwise protected prefixes are listed in `MIDDLEWARE_PUBLIC_EXCEPTIONS` (e.g., `/natureos/mindex/explorer` is public even though `/natureos/mindex` is COMPANY).

### GateCheckResult
When access is denied, the system returns a `GateCheckResult` with:
- `allowed: false`
- `reason` — why access was denied
- `upgrade` — if applicable, the required subscription tier, price, and features gained
- `remaining` — for freemium routes, the remaining count and reset time

## Screen Indicators

- **Not logged in + AUTHENTICATED/COMPANY/PREMIUM/ADMIN route**: Redirect to `/login`
- **Logged in but wrong tier**: "Upgrade" prompt with required subscription tier and price
- **COMPANY gate + non-company email**: Access denied message indicating @mycosoft.org/@mycosoft.com email required
- **Freemium limit hit**: Shows remaining count (0), reset time, and upgrade prompt
- **Hidden sidebar items**: Routes the user cannot access are hidden from the sidebar navigation
- **Gate symbols in UI**: Each gate has a symbol shown in UI contexts:
  - PUBLIC: open globe icon
  - FREEMIUM: "FREE" badge
  - AUTHENTICATED: lock icon
  - PREMIUM: diamond icon
  - COMPANY: building icon
  - ADMIN: shield icon
  - SUPER_ADMIN: crown icon

## Common Failure Modes

1. **Accessing COMPANY route without company email**: User is logged in but their email is not `@mycosoft.org` or `@mycosoft.com`. They see an access denied page rather than a login redirect.
2. **Hitting freemium daily limits**: Anonymous users on `/search` hit the 10/day cap. The UI shows 0 remaining and a reset time. Signing up for a free account does not lift the limit — a PRO subscription is needed for unlimited access.
3. **Confusing COMPANY vs ADMIN**: COMPANY routes require a company email but only USER-level role. ADMIN routes require the ADMIN role regardless of email domain. They are separate checks.
4. **MIDDLEWARE_PUBLIC_EXCEPTIONS confusion**: Some child routes are public even when their parent is gated. For example `/natureos/mindex/explorer` is PUBLIC but `/natureos/mindex` is COMPANY. Navigating from the explorer to the parent MINDEX page will trigger an access gate.
5. **Ethics Training restriction**: Even ADMIN users cannot access `/ethics-training/*` unless their email is `morgan@mycosoft.org` or `michelle@mycosoft.org` — this is an additional check beyond the ADMIN gate.
6. **AI Studio misplacement**: `/natureos/ai-studio` is defined in `PREMIUM_ROUTES` array but actually uses `AccessGate.COMPANY` with `features: ['internal-only']`, not a subscription gate. It requires a company email, not a PRO subscription.
7. **Platform routes double gate**: `/platform/*` routes require both ADMIN role AND `@mycosoft.org` company email (enforced via `features: ['company-email']` in config).
8. **Default auth behavior**: Any route not found in `ALL_ROUTES` defaults to requiring authentication (`requiresAuth` returns `true` for unknown paths).

## Composability
This skill is the reference document for all other skills. When any skill references an access tier or checks whether a route is available, it should defer to this document. Skills that depend on specific access levels should note the required tier in their own SKILL.md Identity section.

## Computer Use Notes
- To determine current access level, check the sidebar: hidden items indicate insufficient access.
- The gate symbol/label may appear near restricted content or in modal dialogs when access is denied.
- Freemium remaining counts may appear as badges or toast notifications.
- Login redirects preserve the original URL as a query parameter for post-login navigation.

## Iteration Log
- Initial version: cataloged all routes from `lib/access/routes.ts` and gate system from `lib/access/types.ts`.
