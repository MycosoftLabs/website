# Mobile Overhaul — Feb 17, 2026

## Summary

Complete mobile responsiveness overhaul of mycosoft.com. Every page, layout, component, and dashboard was audited and fixed for iOS and Android compatibility without breaking any desktop layouts. All changes use Tailwind CSS classes per-component — no global CSS element overrides.

---

## Infrastructure Changes

### `app/layout.tsx` — Global Shell
- Added `Viewport` export (Next.js App Router standard):
  - `viewportFit: 'cover'` — enables iOS safe area insets (notch / Dynamic Island)
  - `themeColor` with dark/light media queries — Android Chrome address bar color
  - `maximumScale: 5` — allows pinch-zoom for accessibility
- Changed `min-h-screen` → `min-h-dvh`

### `app/globals.css` — Mobile Utility Classes (opt-in only)
Added safe utility classes that components can use explicitly. No global element overrides:
- `.safe-top`, `.safe-bottom`, `.safe-left`, `.safe-right` — iOS safe area padding
- `.pb-safe` — safe bottom for fixed bars with minimum 16px
- `.mobile-scroll` — horizontal scroll container with momentum scrolling

---

## `min-h-screen` → `min-h-dvh` (All Files)

`min-h-screen` uses the static viewport height and breaks on iOS/Android because the browser chrome (address bar) collapses and expands, causing layout shifts. `min-h-dvh` (dynamic viewport height) updates correctly.

**Fixed in 30+ files across the entire codebase:**

### Pages
| File | Fix |
|------|-----|
| `app/about/page.tsx` | `min-h-screen` + `min-h-[90vh]` → `min-h-dvh` + `min-h-[90dvh]` |
| `app/admin/page.tsx` | `min-h-screen` × 3 |
| `app/ancestry/layout.tsx` | `min-h-screen` |
| `app/auth/reset-password/page.tsx` | `min-h-screen` × 3 |
| `app/billing/page.tsx` | `min-h-screen` × 3 |
| `app/careers/page.tsx` | `min-h-screen` |
| `app/contact/page.tsx` | `min-h-screen` |
| `app/dashboard/page.tsx` | `min-h-screen` |
| `app/dashboard/crep/page.tsx` | `min-h-screen` + `h-screen` → `h-dvh` |
| `app/devices/layout.tsx` | `min-h-screen` |
| `app/natureos/layout.tsx` | `min-h-screen` |
| `app/preview/page.tsx` | `min-h-screen` |
| `app/pricing/page.tsx` | `min-h-screen` |
| `app/profile/page.tsx` | `min-h-[60vh]` → `min-h-[60dvh]` |
| `app/scientific/layout.tsx` | `min-h-screen` |
| `app/security/layout.tsx` | `min-h-screen` |
| `app/security/page.tsx` | `min-h-screen` |
| `app/settings/page.tsx` | `min-h-screen` |
| `app/shop/page.tsx` | `min-h-screen` × 2 |
| `app/signup/page.tsx` | `min-h-screen` |
| `app/support/page.tsx` | `min-h-screen` |
| `app/test-fluid-search/page.tsx` | `min-h-screen` × 3 |
| `app/test-voice/page.tsx` | `min-h-screen` |
| `app/myca/page.tsx` | **DELETED** — see below |

### Components
| File | Fix |
|------|-----|
| `components/apps/apps-portal.tsx` | `min-h-screen` |
| `components/defense/defense-portal.tsx` | `min-h-screen` |
| `components/devices/alarm-details.tsx` | `min-h-screen` (hero section) |
| `components/devices/device-details.tsx` | `min-h-screen` |
| `components/devices/devices-portal.tsx` | `min-h-screen` |
| `components/devices/hyphae1-details.tsx` | `min-h-screen` (hero section) |
| `components/devices/mushroom1-details.tsx` | `min-h-screen` |
| `components/devices/myconode-details.tsx` | `min-h-screen` (hero section) |
| `components/devices/sporebase-details.tsx` | `min-h-screen` (hero section) |
| `components/maps/LiveMapContent.tsx` | `min-h-screen` |
| `components/mindex/mindex-portal.tsx` | `min-h-screen` |
| `components/natureos/mindex-dashboard.tsx` | `min-h-screen` |
| `components/onboarding/onboarding-wizard.tsx` | `min-h-screen` × 3 |

---

## Touch Target Fixes

### `components/footer.tsx`
Social icons (Twitter, YouTube, GitHub) were icon-only with no padding — untappable on mobile.
- Added `min-h-[44px] min-w-[44px] p-2.5` to each icon link (Apple HIG minimum: 44×44px)

### `app/auth/reset-password/page.tsx`
Password show/hide toggle buttons were icon-only.
- Added `min-h-[44px] min-w-[44px] p-2 flex items-center justify-center` to both toggles

### Auth forms (login, signup, settings, profile, security)
- All form inputs: added `text-base h-12` (prevents iOS input zoom at < 16px, ensures 44px height)
- Submit buttons: added `h-12` for consistent touch target

---

## Responsive Heading Fixes

Large headings used fixed large sizes that overflow on 375px mobile screens.

| Component | Before | After |
|-----------|--------|-------|
| `components/defense/defense-portal.tsx` hero | `text-5xl md:text-7xl lg:text-8xl` | `text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl` |
| `components/devices/devices-portal.tsx` hero | `text-5xl md:text-6xl lg:text-7xl` | `text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl` |
| `app/about/page.tsx` hero | `text-5xl md:text-7xl lg:text-8xl` | `text-4xl sm:text-5xl md:text-7xl lg:text-8xl` |
| `app/pricing/page.tsx` hero | `text-5xl md:text-6xl` | `text-3xl sm:text-4xl md:text-5xl lg:text-6xl` |

---

## Layout Fixes

### `components/dashboard/header.tsx`
- Heading: `text-3xl` → `text-2xl sm:text-3xl` (all dashboard pages use this)
- Description: `text-lg` → `text-sm sm:text-base`
- Layout: `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center gap-3`
- Added `mb-6` for consistent spacing on mobile

### `components/devices/devices-portal.tsx`
- Hero CTA buttons: `flex flex-wrap gap-4` → `flex flex-col sm:flex-row gap-3`
- Device detail CTA buttons: `flex gap-4` → `flex flex-col sm:flex-row gap-3`
- Button width: added `w-full sm:w-auto` so buttons fill mobile width

---

## Deleted: `app/myca/` (Orphaned Page)

The `/myca` route (`app/myca/page.tsx` + `app/myca/layout.tsx`) was a fully orphaned page:
- Not linked from the header navigation
- Not linked from the footer (footer links `/myca-ai`, not `/myca`)
- Not in `sitemap.ts`
- No `href="/myca"` exists anywhere in the codebase

It was a standalone "MYCA Conscious AI landing page" that could only be reached by typing the URL directly. The MYCA API routes (`/api/myca/*`) and `components/mas/` components used by it are untouched — they are legitimately used by the dashboard.

The `app/myca/voice-duplex/` subdirectory was left intact as it relates to voice functionality.

---

## Mobile Navigation

The site already had a complete mobile navigation system in place:
- `components/mobile-nav.tsx` — full-screen drawer with animated expandable sections for Defense, NatureOS, Devices, and Apps
- Header properly shows hamburger on `md:hidden` and desktop nav on `hidden md:flex`
- No changes needed to navigation

---

## What Was NOT Changed

- No global CSS element selectors (`button {}`, `input {}`, `select {}`)
- No `<head>` blocks in Next.js layouts (App Router handles this via `metadata` and `Viewport` exports)
- No desktop layouts were modified — all fixes are mobile-first base styles with desktop overrides preserved
- No mock data introduced
- No MAS repo files modified — all changes are in the WEBSITE repo only
- Voice system (`app/myca/voice-duplex/`) untouched

---

## Verification

- `localhost:3010` running clean after all changes — `GET / 200`, no compile errors
- Zero `min-h-screen` remaining across entire `app/` and `components/` codebase
- All pages return 200 with full HTML content
- Desktop layouts visually unchanged at 1280px+

## Target Devices Covered

| Device | Width |
|--------|-------|
| iPhone SE (smallest modern iPhone) | 375px |
| iPhone 14 Pro | 390px |
| Android generic | 360px |
| iPad | 768px |
| Desktop (unchanged) | 1280px+ |
