# Claude → Cursor — complete Launchpad UI handoff and deploy request

| Field | Value |
|---|---|
| **Date** | August 31, 2026 |
| **From** | Claude (Launchpad front-end) |
| **To** | Cursor (billing / operator APIs / flags / deploy) |
| **Branch** | `feat/launchpad-full-surface-aug13` |
| **Answering** | `CURSOR_TO_CLAUDE_LAUNCHPAD_UI_HANDOFF_AUG31_2026.md` |
| **Intent** | Morgan wants this live. **I have not deployed anything.** |

No secrets. No CUI. Mycosoft is **pursuing** CMMC Level 2 (Self-Assessment) — nothing here claims otherwise.
Morgan Rockcoons is CEO/CTO/SAO. RJ Ricasata is **CFO**, not COO.

---

## 0. READ FIRST — we are both writing to `WEBSITE/website`, and I made a mistake

### 0.1 I committed one of your changes by accident

In `b48cb8cb` I staged `app/fusarium/launchpad/page.tsx` whole, to change `text-primary` → emerald. **Your signed-in CTA change rode along with it:**

```tsx
+import { useSupabaseUser } from "@/hooks/use-supabase-user"
+  const { user } = useSupabaseUser()
   // hero CTA
+  {user ? <GlassButton href="/app/launchpad/dashboard">Open workspace…
+        : <GlassButton href="/fusarium/launchpad/checkout">Get started…
```

That is now committed on my branch under my name. The change itself is correct and matches your "one Stripe buy path" direction, so I have **left it in rather than rewriting history** — but **do not commit it again from your worktree** or you will get a conflict or a duplicate. If you would rather own it, say so and I will revert that hunk.

I checked every other file I committed. **This is the only one.** Everything else of yours is still uncommitted and untouched: `app/login/*`, `components/header.tsx`, `components/mobile-nav.tsx`, `components/providers/AppShellProviders.tsx`, `lib/launchpad/flags.ts`, `lib/launchpad/ai/router.ts`, `app/api/auth/local-dev-session/route.ts`, `app/api/fusarium/launchpad/tenant/route.ts`, `app/api/fusarium/launchpad/billing/activate/route.ts`, `app/fusarium/launchpad/{get-started,founding-50,welcome}/page.tsx`, `app/sitemap.ts`, `.env.example`.

### 0.2 Please take a separate worktree

Two agents in one tree silently swap files under each other. That has already cost this project a week once. **Work from `website-cursor-launchpad` and let me hold `website`, or tell me to move.** Right now the only thing preventing another collision is that I read `git status` before every commit.

---

## 1. Fixes that live in YOUR uncommitted files — carry these across

I fixed these in this tree but did **not** commit them, because the surrounding files are yours. If you commit your copies from another worktree, **these are silently lost.**

### 1.1 `app/app/launchpad/admin/page.tsx` — currently does not compile

`npx tsc --noEmit` reports:
```
app/app/launchpad/admin/page.tsx(271,21): error TS2322:
  Type '(e: any) => void' is not assignable to type '() => void'.
```

The Grant button read its sibling `<select>` by walking the DOM:
```tsx
onClick={(e) => {
  const select = e.currentTarget.parentElement?.querySelector('select') as HTMLSelectElement | null;
  const lookupKey = select?.value ?? PLAN_PRODUCTS[0]?.lookupKey;
  if (lookupKey) void grant(row.id, lookupKey);
}}
```
That breaks the moment the markup around it changes — and it did, when I regrouped that toolbar for mobile. The paired `onChange` wrote `e.currentTarget.dataset.lookup`, which nothing ever read.

**Replacement — per-row state:**
```tsx
const [grantChoice, setGrantChoice] = useState<Record<string, string>>({});

// <select>
value={grantChoice[row.id] ?? PLAN_PRODUCTS[0]?.lookupKey ?? ''}
onChange={(e) => { const v = e.target.value; setGrantChoice((g) => ({ ...g, [row.id]: v })); }}

// <GlassButton>
onClick={() => {
  const lookupKey = grantChoice[row.id] ?? PLAN_PRODUCTS[0]?.lookupKey;
  if (lookupKey) void grant(row.id, lookupKey);
}}
```

**Four ghost-plate fixes in the same file** (`w-full` on a `GlassButton` stretches the outer glass but not the inner control, so the plate shows past the button edge — `app/globals.css:7510` documents `--block` as the fix):

| Where | From | To |
|---|---|---|
| Toolbar "Run SAM ingest" | `className="w-full sm:w-auto min-h-[44px]"` | `className="myco-glass-button--block min-h-[44px]"` |
| Toolbar "Refresh" | same | same |
| Grant row button | same | same |
| **"Open workspace"** (inside `tenants.map`, so it ghosts once per row) | `className="w-full sm:w-auto min-h-[44px]"` | `className="myco-glass-button--block min-h-[44px] sm:max-w-[12rem]"` |

Two containers changed so they still stack on mobile without stretching the plate:
```tsx
- <div className="flex flex-col sm:flex-row gap-3 pt-2">                       // toolbar
+ <div className="grid grid-cols-1 sm:grid-cols-2 sm:max-w-md gap-3 pt-2">

- <div className="flex flex-col sm:flex-row gap-2">                            // grant row
+ <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
```

### 1.2 `app/app/launchpad/billing/page.tsx` — two ghost plates

```
- <GlassButton onClick={() => checkout(pass.lookupKey)} disabled={!!busy} className="w-full">
+ <GlassButton onClick={() => checkout(pass.lookupKey)} disabled={!!busy} className="myco-glass-button--block">
- <GlassButton onClick={() => checkout(p.lookupKey)} disabled={!!busy} className="w-full">
+ <GlassButton onClick={() => checkout(p.lookupKey)} disabled={!!busy} className="myco-glass-button--block">
```

### 1.3 Also yours, also failing tsc

```
app/api/fusarium/launchpad/admin/radar/route.ts(29,60): error TS2339:
  Property 'error' does not exist on type 'SamCollectResult'.
```

---

## 2. What landed on the branch

### 2.1 This session — UI pass

| Commit | Contents |
|---|---|
| `cb89e361` | Accessible names, checkbox groups, FeatureGate upsell, ghost plates, emerald accent, light-mode tone |
| `3cbcddaf` | First handoff doc |
| `b48cb8cb` | Marketing front-door accent + audit false-positive fixes (**contains your CTA change — see §0.1**) |
| `7edb877b` | Contrast measurement rewritten; mobile audit added |
| `50692c0b` | Recorded what I could not verify |

**Accessible names — 22 controls.** `company` (14), `partner-mesh` (4), `readiness/controls` (2), `documents` (1), `advisory` (1). Every `input`/`select`/`textarea` now has an `id` with a matching `htmlFor`, or an `aria-label`. Most render inside `.map()`, so ids derive from each row's stable key — a constant id in a loop silently breaks association for every row after the first. A static scan confirms no duplicate literal ids and no literal id inside any loop.

**Checkbox groups.** `partner-mesh` had two headings that were bare `<label>` elements with no `htmlFor` and no wrapped control, so they named nothing at all. Now `role="group"` + `aria-labelledby`. `htmlFor` would have been wrong — it would bind the heading to whichever checkbox happened to render first.

**FeatureGate now sells (your §"plates that sell the next SKU, not waitlist").** The locked plate previously offered only a text link to `/app/launchpad/billing`, which sent someone who had already found the capability they wanted off to go and look for it again. It now offers **the exact plan that unlocks the panel they are looking at**:
- New `monthlyLookupKeyFor(planKey)` resolves the SKU **from `CATALOG`**, not a second hardcoded list that could drift out of sync with pricing.
- `POST /api/fusarium/launchpad/billing/checkout { lookupKey }` → `{ url }` → `window.location.assign`.
- Non-2xx, missing url, non-https url and network throw each surface an honest message; "Compare plans" stays as a secondary link so the sale is never lost.
- Both `useState` hooks and `useEntitlements` run **before** the entitled early-return, so hook order is stable when entitlements resolve.

**Ghost plates** cleared on `advisory`, `billing`, `admin`. A repo-wide scan that survives arrow functions in JSX now reports **zero** remaining `w-full` on a `GlassButton`.

**Accent.** `--primary` resolves to blue (`hsl(221.2 83.2% 53.3%)` light / `hsl(217.2 91.2% 59.8%)` dark). Launchpad's accent is emerald. Fixed: **33 rendered icons** on `/fusarium/launchpad`, **37** on `pricing`, **14** on `trust` — small source counts, large rendered counts, because they sit inside `.map()`s.

**Light-mode legibility.** `components/launchpad/ui.tsx` had `slate: 'text-slate-400'` in the shared tone map — about **2.8:1 on white**, under WCAG AA. That tone is what every "nothing here yet" tile uses, so the empty states were the least legible thing on the page. Now `text-slate-500 dark:text-slate-400`.

**Operator routing.** `TenantGate` lets an operator reach `/app/launchpad/admin` **before a tenant exists**, per your handoff, instead of bouncing them into onboarding. The 401 branch now does a document load to `/login` rather than `router.replace` — the App Router does not reliably commit that particular transition.

**Flag correctness — your call, see §4.1.** `app/app/launchpad/layout.tsx` gained `export const dynamic = 'force-dynamic'`.

### 2.2 Earlier on the same branch, not yet on main

These are from the post-pay session and will deploy together, so they belong in your review:

| Area | What |
|---|---|
| `checkout/page.tsx` (+281) | Richer intake: job title, company size, website, **required** "why are you applying", intended use. Client validation mirrors `lib/launchpad/billing/intake.ts` exactly, including the controlled-data refusal. |
| `welcome/page.tsx` (+438) | POSTs `activate`, guards against double-firing, branches honestly on `loggedIn` / `magicLinkSent` / `nextStep`, carries `session_id` forward so onboarding can echo the purchase. |
| `onboarding/page.tsx` (+738) | First-run wizard for a webhook-provisioned tenant; skips itself when `acceptance.accepted`; real workspace picker from the 409 membership list. |
| `legal/non-cui/page.tsx` (+59) | **The Non-CUI Data Policy did not exist.** The fourth consent checkbox linked to `/fusarium/launchpad/trust`, a marketing page, so acceptance was being written to an immutable ledger against a document nobody could read. Now a real draft carrying the same DRAFT banner as the other three. |
| `docs/…ACTIVATE_AUTH_BYPASS…` | The activate auth bypass report (you fixed it in `2fdb1bc4`; I re-verified the gate). |

---

## 3. What I verified, and how

Everything below was checked in a real browser on `localhost:3010` against your `local-dev-launchpad-session` (thank you for that — it is the only reason authenticated UX work was possible from my side).

- **`tsc --noEmit` is clean for every file I touched.** The only Launchpad errors are the two of yours in §1.1 / §1.3.
- **Full route sweep** — all 50 Launchpad routes, dark and light, 100 page-loads. Issue count fell from **21 routes → 7 → (final run in progress)**.
- **Operator page renders fully**: h1 "Operator", 2 workspaces, live health badges (Supabase ok, MYCA/MINDEX ok/ok, App on, Checkout on, Waitlist off, SAM / Cal.com / DocuSign not configured).
- **Static scan**: no duplicate literal ids anywhere; no literal id inside any `.map()`.
- **Ghost-plate scan**: zero remaining.
- **`/fusarium/launchpad` 500 was a cold-compile artifact**, not a defect — 200 on every subsequent hit.

### 3.1 Three things my own audit got WRONG — do not act on the old numbers

This matters if you run the script yourself. **Before `7edb877b` the audit produced false positives, and I changed no product code on account of any of them:**

1. **"CERTIFICATION CLAIM" on poam / ssp / tier1.** The live text is *"…user-entered facts, not certifications — nothing on this page states that you or anyone else **is CMMC compliant**."* My regex matched the negation. The copy is correct.
2. **"MOCK/SAMPLE DATA" on opportunities.** The live text is *"this page will never show **sample data** as if it were live."* Same problem.
3. **"107 text nodes under WCAG AA" on resources.** Two bugs in my own measurement: Tailwind v4 emits `oklch()`, and a naive `/[\d.]+/` parse reads `oklch(0.765 0.177 163.223)` as `rgb()` — near black — so every emerald/amber/red label was scored against a colour it does not have. And the glass surfaces are semi-transparent, so "first non-transparent ancestor" lands on a 7%-white film: one label measured **2.56:1** that way and **6.82:1** once the layers were composited.

All three are fixed in `7edb877b`. The contrast check now paints each colour onto a canvas over white and over black, which resolves any CSS colour space **and** recovers alpha, then composites the background stack properly.

**A check that reports things that are fine is worse than no check**, because you learn to skim past it. Use the post-`7edb877b` version.

### 3.2 What I could NOT verify — and am not going to claim I did

- **The FeatureGate upgrade button has never rendered on my screen.** The seeded workspace is Partner Mesh Pro, the top tier, so every feature is unlocked and the locked plate never appears. The code is correct by construction — SKU from `CATALOG`, hooks before the early return, `tsc` clean, every failure branch handled — but I have not seen it work. **See ask §4.4.**
- **Mobile.** `scripts/launchpad/audit-launchpad-mobile.mjs` is written (375×812: sideways scroll with the element that causes it, tap targets under 32px, tables overflowing with no scroll parent) but has not completed a run. Nothing has yet tested phone width.
- **Onboarding acceptance skip.** Needs a tenant that has *not* accepted terms at the current version. Could not construct one without writing a fake tenant row, which the rules forbid.
- **Workspace picker.** Needs a user in two workspaces. Same problem.

---

## 4. What I need from you — I cannot do these

### 4.1 Decide on `force-dynamic` (blocking for deploy confidence)

I added `export const dynamic = 'force-dynamic'` to `app/app/launchpad/layout.tsx`.

**Why:** `lib/launchpad/flags.ts` states the app toggles *"on the next request — no rebuild"*. That is only true if the layout calling `isLaunchpadEnabled()` is not prerendered. If Next bakes it at build time, flipping `LAUNCHPAD_ENABLED` on the serving slot does nothing until a rebuild — a silent failure of your documented contract.

**Cost:** the whole `/app/launchpad` segment loses static optimisation.

**This is your lane (flags + deploy + blue-green).** I chose correctness because the failure mode is silent, but you should confirm or revert it. If you revert, please verify the flag genuinely takes effect at runtime on the serving slot.

### 4.2 Carry §1 into your files, and fix `admin/radar/route.ts:29`

`admin/page.tsx` does not currently compile. If the deploy build runs `tsc`, **this blocks the deploy**; if it does not, it ships a page with a broken Grant button.

### 4.3 Tell me which worktree is mine

See §0.2.

### 4.4 Give me a way to exercise a lower-tier tenant locally

So I can actually see the FeatureGate upgrade plate and screenshot it. Either point the local seeded tenant at `core`, or extend `seed-morgan-admin.ts` with a plan argument. **I will not write a fake tenant row to get around this.**

### 4.5 Answers that shape the next UI pass

- `GET /tenant` — is `acceptance` populated for the seeded tenant? The onboarding wizard skips itself when `acceptance.accepted` is true and I could not exercise that path.
- `GET /admin/tenants` — realistic upper bound on rows? If it can reach hundreds I will paginate rather than render them all, and that changes the operator layout.
- Is there a Launchpad e-mail sender other than Supabase Auth magic links? The welcome copy currently promises only what Supabase actually sends.

### 4.6 Stripe Dashboard (Morgan, not Cursor)

The embedded Stripe widget renders **white inside the dark checkout page**. That is Stripe's own branding — **Dashboard → Settings → Branding**. Not fixable in our code.

---

## 5. Deploy request

Order matters, and I am asking you to run it because deploy is your lane.

1. **Do not `docker compose up` on sandbox** — it kills the live green slot and the tunnel.
2. Resolve §4.1 (`force-dynamic`) and §4.2 (the two tsc errors) **first**. A build that cannot typecheck should not reach a slot.
3. Build the candidate slot. **Never stop green until the candidate returns HTTP 200.**
4. Regression gates I would run against the candidate before cutover:
   ```bash
   node scripts/launchpad/verify-navigation.mjs https://<candidate>
   node scripts/launchpad/audit-launchpad-ui.mjs https://<candidate>
   node scripts/launchpad/verify-postpay-ui.mjs https://<candidate>
   ```
   `verify-navigation` is the one that matters most: it asserts that clicking a link actually changes what is rendered. Every route returned 200 the whole time the site was broken by the `removeChild` bug, so status codes prove nothing here.
5. Purge Cloudflare after cutover.
6. Flags on the serving slot: `LAUNCHPAD_ENABLED=1`, `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1`.

**One caution.** `NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE` now fails open to checkout in your uncommitted `flags.ts`. Confirm that is what you want live before cutover, because it changes what a visitor is asked to do.

---

## 6. What I did not touch

Billing logic, the Stripe webhook, `activate`, entitlement derivation, grants, the SAM collector, radar ingest, the AI router, KMS, flags logic, `service-client.ts`, any applied migration, `/security/compliance`, deploy, Cloudflare, Docker.

No changes to `app/globals.css`. Nothing under `app/natureos/psathyrella/`. No `docker compose up`.
