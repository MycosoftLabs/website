# Claude → Cursor — the navigation crash, and what payments actually need

**Date:** August 13, 2026 · **Branch:** `feat/launchpad-full-surface-aug13` · **Claude did not deploy any of this.**
**Repo is PUBLIC.** Env var names only, never values.

Mycosoft, LLC is **pursuing** CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.

---

## 1. Site-wide navigation was broken, and the fallback was hiding it

**Every link on mycosoft.com** changed the URL and left the previous page rendered. Production appeared to work only because `components/navigation-click-rescue.tsx` noticed the content had not moved and forced `window.location.assign()`. That fallback is also the reason **every navigation reloaded the entire site** — the thing Morgan has reported repeatedly.

Measured on production before the fix, clicking *Get started* on `/fusarium/launchpad/pricing`:

```
marker after nav      GONE (document was reloaded)
document navigations  3          <- full reloads, not a client transition
```

**Cause — one line in `components/theme-color-sync.tsx`:**

```js
document.querySelectorAll('meta[name="theme-color"]').forEach((n) => n.remove())
```

`app/layout.tsx` exports `viewport.themeColor`, so **React owns that `<meta>` as a hoistable** and keeps a fiber pointing at the node. Removing it left the fiber holding a detached element. The next route transition unmounts the metadata subtree and runs `stateNode.parentNode.removeChild(stateNode)` against a **null** parent:

```
TypeError: Cannot read properties of null (reading 'removeChild')
    at commitDeletionEffectsOnFiber (react-dom-client.development.js:13325)
```

A throw during commit aborts the transition, so the new route never mounts. The component is in the **root layout**, so this applied to every link on the site.

**Fix (committed):** set `content` instead of removing the node, and re-run on `pathname` so the colour stays right when React recreates its metadata. Same visual result, React's DOM ownership untouched.

**Verified in a browser, 4/4 soft navigations, destination rendered, previous page gone, zero page errors.** Before the fix the identical run reported the crash and left the pricing page on screen.

> **Generalise this.** Any imperative `.remove()` on a `<meta>`, `<link>`, `<title>`, or `<style>` that React also renders will produce this exact crash. If you add code that touches `<head>`, mutate attributes — do not detach nodes.

### It needs a rebuild, and it should go out on its own

This is a root-layout behaviour change affecting every page. Ship it as its own blue-green cutover, not bundled with payment changes, so if anything regresses the cause is unambiguous.

**Regression gate — run it against the new slot before cutting over:**

```bash
node scripts/launchpad/verify-navigation.mjs https://sandbox.mycosoft.com
```

Exits non-zero on failure. It asserts what HTTP status checks cannot: that a click actually changes what is rendered. Every previous audit called these routes healthy because they all returned 200 — they did, while showing the wrong page.

---

## 2. Payments: the flow is finished and proven; one Dashboard step remains

I drove the whole purchase path in a browser against the live Stripe account. **It works.** The customer reaches a real Stripe checkout for **$149.00 per month**, email prefilled, live card fields.

```
1. pricing              4 plan CTAs
2. picks Core           /checkout?plan=core&billing=monthly   price shown $149   (correct plan, not $397)
3. fills details        name / email / company
4. submits              POST public-checkout -> 200
   -> Stripe hosted:    "Subscribe to FUSARIUM Launchpad Core"  $149.00/month
                        Email dana@northwindrobotics.com
                        Card information / Cardholder name / Country
```

Reproduce with `node scripts/launchpad/verify-checkout-journey.mjs <baseURL>`.

### What I found that the earlier diagnosis missed

The production 502 was **two** problems, not one. Reproduced locally against the live key:

```
No valid payment method types for this Checkout Session. Please ensure that you
have activated payment methods compatible with your chosen currency in your
dashboard, or specify `payment_method_types`.
```

| # | Problem | Nature | Fix |
|---|---|---|---|
| 2.1 | **No payment method enabled for USD** in the Dashboard, so Stripe's automatic selection has nothing to pick and throws | Settings gap | Handled in code (below) + enable methods |
| 2.2 | `charges_enabled: false` — onboarding never completed, nothing can be collected | Account state | **Morgan only** |

Proven: naming `payment_method_types: ['card']` explicitly creates the session fine on this same unactivated account. Session opened, then expired — nothing left behind.

**Both are handled in `public-checkout/route.ts` now:**

- Automatic selection is tried first and falls back to `['card']` **only** on that specific error, with a server-side warning. Cards are deliberately **not** hardcoded — that would freeze the method list exactly when we want it to grow. Enable wallets, Link, Cash App or PayPal in the Dashboard and the richer path resumes with **no deploy**.
- Checkout **preflights** `charges_enabled` and refuses at the door with `503 stripe_account_not_activated`. Without it the buyer fills the form, gets a working card field, submits, and only then hits a wall. Result cached 60s; a failed preflight is non-blocking, so a Stripe outage cannot invent a false closure.

Verified with the flag on: `POST` returns **503 `stripe_account_not_activated`**, not the opaque 502.

### Testing the pipeline before activation

`LAUNCHPAD_CHECKOUT_ALLOW_UNACTIVATED=1` bypasses the preflight so you can exercise session → webhook → pending row. **Sandbox only** — it lets a buyer reach a card field that cannot collect. Never set it on production.

### Welcome page — verified honest

Against a deliberately **unpaid** session it renders `CHECKOUT NOT COMPLETE`, states *"This page confirms your payment. It does not turn on entitlements by itself,"* names the verified webhook as the real gate, and grants nothing. Session lookup returned correct `paid:false / claimed:false`. No false "you're all set". Test session expired after.

---

## 3. What is left, and who owns it

| Owner | Item |
|---|---|
| **Morgan** | **Stripe → Activate account** (identity, bank, ToS). Until `charges_enabled` is true, **no money can be collected and none can reach the bank.** This is the only thing standing between the flow above and real revenue. |
| **Morgan** | **Stripe → Settings → Payment methods**: enable card, and Apple/Google Pay, Link, Cash App, PayPal if wanted. Without this we run card-only via the fallback. |
| **Morgan** (optional) | Publishable key `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for the embedded widget. **Not required** — hosted checkout works today and is what I tested. |
| **Cursor** | Ship §1 as its own cutover, gated on `verify-navigation.mjs`. |
| **Cursor** | Then the payment commits; keep `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED` off on prod until Morgan confirms activation. |
| **Cursor** | Pending-purchase webhook branch + claim on **verified auth email only** (runbook §4). |

**Do not tell Morgan a live card funds the bank while `charges_enabled` is false.** It does not.

---

## 4. Still open from earlier, unchanged

- Marketing pages `how-it-works`, `modules`, `contract-radar`, `origin-graph`, `faq` — never built (build job died on a spend limit). **Nothing links to them**, so no broken links; the public IA is just thinner. Mine.
- Stripe Checkout does not settle arbitrary crypto. Cash App Pay and PayPal are Dashboard toggles; crypto needs a separate provider decision. Do not report it as covered.
- `/fusarium` without `/defense` 404s — add a redirect if the short URL is wanted.
- Walkthrough server persistence blocked on namespaced step ids (gap plan G.12).
