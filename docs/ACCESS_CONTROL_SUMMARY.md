# NatureOS Access Control & Monetization System

**Date:** January 17, 2026  
**Version:** 1.0

---

## Overview

A complete access control and monetization system has been implemented for NatureOS, including:

1. **Access Gate System** - 6 tiers of access control
2. **Route Protection** - Automatic route guarding
3. **Freemium Limits** - Usage tracking for free users
4. **Onboarding Wizard** - Beautiful signup flow
5. **Pricing Page** - Subscription tier selection
6. **UI Components** - Access-gated wrappers

---

## Access Gates

| Gate | Symbol | Description | Minimum Role |
|------|--------|-------------|--------------|
| PUBLIC | 🌍 | Open to everyone | anonymous |
| FREEMIUM | 🆓 | Public with limits | anonymous |
| AUTHENTICATED | 🔐 | Requires login | user |
| PREMIUM | 💎 | Requires subscription | premium |
| ADMIN | 🛡️ | Admin only | admin |
| SUPER_ADMIN | 👑 | Morgan only | super_admin |

---

## Subscription Tiers

| Tier | Price | Key Features |
|------|-------|--------------|
| **Free** | $0 | 50 species/day, basic search, community |
| **Pro** | $29/mo | Unlimited, MYCA AI, CREP, 10K API calls |
| **Enterprise** | $99/mo | Pro + SOC, teams, unlimited API, SLA |

---

## Files Created

### Access Control Library
```
lib/access/
├── types.ts          # Gate types, roles, subscriptions
├── routes.ts         # Route access definitions
├── middleware.ts     # Server-side access checks
└── index.ts          # Exports
```

### Onboarding Components
```
components/onboarding/
├── onboarding-wizard.tsx   # Multi-slide signup wizard
├── signup-form.tsx         # Email/OAuth signup form
├── plan-selector.tsx       # Subscription tier selection
└── index.ts                # Exports
```

### Access UI Components
```
components/access/
├── gate-wrapper.tsx        # Access-gated content wrapper
├── freemium-limiter.tsx    # Freemium usage tracker
└── index.ts                # Exports
```

### Pages
```
app/
├── onboarding/page.tsx     # Full-screen onboarding wizard
└── pricing/page.tsx        # Pricing comparison page
```

### Documentation
```
docs/
├── SYSTEM_ACCESS_GATES.md  # Complete system inventory
└── ACCESS_CONTROL_SUMMARY.md  # This file
```

---

## Usage Examples

### 1. Wrap Content with Access Gate

```tsx
import { GateWrapper } from '@/components/access'
import { AccessGate } from '@/lib/access'

function MyComponent() {
  return (
    <GateWrapper gate={AccessGate.PREMIUM}>
      <PremiumFeature />
    </GateWrapper>
  )
}
```

### 2. Check Access in Code

```tsx
import { useGateAccess } from '@/components/access'
import { AccessGate } from '@/lib/access'

function MyComponent() {
  const { hasAccess, loading } = useGateAccess(AccessGate.ADMIN)
  
  if (loading) return <Loader />
  if (!hasAccess) return <AccessDenied />
  
  return <AdminPanel />
}
```

### 3. Track Freemium Usage

```tsx
import { FreemiumLimiter } from '@/components/access'

function SearchResults() {
  return (
    <FreemiumLimiter featureKey="search" dailyLimit={10}>
      <SearchComponent />
    </FreemiumLimiter>
  )
}
```

### 4. Server-Side API Protection

```tsx
import { requireGate, AccessGate } from '@/lib/access'

export async function GET(request: Request) {
  const { session, error } = await requireGate(AccessGate.AUTHENTICATED)
  
  if (error) return error
  
  // User is authenticated
  return NextResponse.json({ userId: session.userId })
}
```

### 5. Route Access Check

```tsx
import { getRouteAccess, requiresAuth } from '@/lib/access'

const access = getRouteAccess('/dashboard/crep')
// access.gate = 'premium'
// access.config.subscriptionRequired = 'pro'

const needsLogin = requiresAuth('/natureos')
// needsLogin = true
```

---

## Database Changes

Added to `profiles` table:
- `subscription_tier` - 'free' | 'pro' | 'enterprise' (default: 'free')

---

## Key Routes by Gate

### 🌍 PUBLIC
- `/`, `/about`, `/login`, `/signup`, `/privacy`, `/terms`

### 🆓 FREEMIUM (Public with limits)
- `/search`, `/species`, `/mushrooms`, `/compounds`, `/science`

### 🔐 AUTHENTICATED
- `/profile`, `/settings`, `/dashboard`, `/apps`, `/natureos`

### 💎 PREMIUM
- `/dashboard/crep`, `/myca-ai`, `/natureos/ai-studio`, `/natureos/live-map`

### 🛡️ ADMIN
- `/devices`, `/security`, `/defense`, `/natureos/workflows`

### 👑 SUPER_ADMIN
- `/natureos/shell`, `/natureos/containers`, `/natureos/drone`

---

## Onboarding Flow

1. **Welcome Slide** - NatureOS introduction
2. **Discover Slide** - MINDEX database features
3. **Monitor Slide** - MycoBrain sensor network
4. **AI Slide** - MYCA AI assistant
5. **Signup Slide** - Account creation
   - OAuth (Google/GitHub)
   - Email/password form
   - Plan selection

---

## Super Admin Emails

Currently configured:
- `morgan@mycosoft.com`
- `admin@mycosoft.com`

To modify, update `SUPER_ADMIN_EMAILS` in `lib/access/middleware.ts`.

---

## Next Steps

1. **Stripe Integration** - Connect payment processing
2. **Usage Analytics** - Track feature usage per user
3. **Redis Rate Limiting** - Implement proper rate limits
4. **Admin Dashboard** - User/subscription management UI
5. **Webhook Handlers** - Stripe subscription events
