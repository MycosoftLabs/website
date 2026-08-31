# Live audit + the exact reason payments don't work yet

**Date:** August 13, 2026 · **From:** Claude · **To:** Cursor
**Audited:** production `mycosoft.com`, slot `green`, head `783d4e90`
**Repo is PUBLIC.** Env var names only.

---

## 1. I found a blocker you could not have known about

**Our own Content-Security-Policy was blocking Stripe.** Verified in a real browser against production:

```
Loading the script 'https://js.stripe.com/clover/stripe.js' violates the
following Content Security Policy directive: script-src 'self' 'unsafe-inline' …
```

`script-src` in `next.config.js` did not include `js.stripe.com`. **Stripe's SDK could never load** — so Embedded Checkout would have rendered blank even after the publishable key and the checkout flag were both set. Setting those two and testing would have produced a mystery failure.

**Fixed in `21cdac34`** — `js.stripe.com` added to `script-src` in both the production and development CSP strings. `frame-src ('self' https:)` and `connect-src ('self' blob: https: wss:)` are already permissive enough for Stripe's iframe and `api.stripe.com`, so no other directive changed.

**This must ship before any payment test.** It is a `next.config.js` change, so it needs a rebuild, not just an env flip.

## 2. The other two payment blockers (yours)

| # | Blocker | Effect today | Fix |
|---|---|---|---|
| 2.1 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` unset | Payment card reads *"Payments are not configured in this environment"* | Set in **both** blue-green colors. `NEXT_PUBLIC_*` bakes at **build** time — set it before building the image |
| 2.2 | `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=false` | Route returns 503 `public_checkout_disabled`; button says *"Online checkout is not open yet"* | Flip to `1` when 1 + 2.1 have shipped |

Verified live: the route currently returns exactly that 503, which is the honest fail-closed behavior working as designed.

**Order matters:** CSP fix (needs rebuild) → publishable key (needs rebuild) → flag flip (runtime). Doing the flag first just produces a blank widget.

## 3. Still unbuilt — a paying customer hits a 404

`/fusarium/launchpad/welcome` **does not exist.** Both checkout flows return there with `?session_id=…`. The moment checkout opens, every successful payment lands on a 404.

**This is the highest-priority remaining item after §2.** I need one endpoint from you to build the page:

`GET /api/fusarium/launchpad/billing/session/:id` → `{ paid, email, lookupKey, planName, claimed }` — service-role, read-only, no secrets in the response. Give me that shape and the page ships within the hour.

## 4. Also still yours: the purchase actually provisioning something

`stripe/webhook/route.ts:65` reads `lp_tenant_id` from metadata and treats anything without it as "not a launchpad session." **A public sale has no tenant yet**, so today a successful public payment is recorded by Stripe and dropped on the floor.

Full SQL + handler + the claim rule (match on the **verified auth email only**, never a request body) are in `CURSOR_RUNBOOK_MAKE_PAYMENTS_REAL_AUG13_2026.md` §4. That claim logic is the one place a bug becomes a security incident — please write it rather than accepting my sketch.

---

## 5. Audit results — what IS live and correct

**All 31 authenticated app routes** return 307 to the auth gate — correct, none 404, none publicly exposed. Checked individually: dashboard, tasks, all 8 readiness screens, evidence, documents, signatures, training, opportunities, proposals, origin-graph, local-agent, resources, enclave, partner-mesh, advisory, all 3 learn pages, company, billing, and all 5 settings screens.

**Public surfaces** — all 200: `/defense/fusarium`, `/fusarium/launchpad`, `/pricing`, `/checkout`, `/get-started`, `/trust`, `/legal/terms`, `/sensing/bluesight`, `/api/health`.

**FUSARIUM page content verified in live HTML:** orchestration colony video, sensing-band plates, hyphae SEM, "Land & Biosphere" rename, glass buttons, the "Why the name" disclosure. **Zero maturity-chip leakage** — the three "Operational" hits are prose ("operational environment", "operational picture"), not the status chips you asked removed.

**Pricing verified in a real browser:** billing toggle present, all four plan CTAs render with correct names, 7 per-SKU add-on rows, every price correct including **$999 / $9,990 / $149**, and **zero Founding-50 language**. Glass CSS confirmed shipped — 61 `myco-glass-button` rules loaded.

**Checkout verified:** Partner Mesh Pro renders **$999/month**, both steps present, exactly **3 fields / 3 labels** (the apparent duplicate "Company" in Morgan's screenshot is his browser's autofill overlay, not a real field).

**All 13 NAS assets return 200**, including the space-containing filenames.

**Security posture holding:** the checkout route fails closed; `LAUNCHPAD_ENABLED=true` only exposes the auth-gated app; no CUI or secrets in any public surface.

---

## 6. Known gaps that are not defects

- **Marketing IA:** `how-it-works`, `modules`, `contract-radar`, `origin-graph`, `faq` were planned but the build job died on a spend limit. **Nothing links to them**, so there are no broken links — the public IA is just thinner than planned. Mine to finish.
- **Crypto:** Stripe Checkout does not settle arbitrary crypto. Cash App Pay and PayPal are Dashboard toggles and work today; crypto needs a separate provider decision. Do not report it as covered because Checkout is live.
- **`/fusarium` (no `/defense`)** 404s — that route was never in this build. Add a redirect if Morgan wants the short URL.

---

## 7. What I need from you, in order

1. **Ship `21cdac34`** (CSP) — required rebuild, without it nothing else matters
2. **Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** in both colors, rebuild
3. **Flip `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1`**
4. **Send me the session-lookup endpoint shape** → I build `/welcome` immediately
5. **Write the pending-purchase webhook branch + claim** (runbook §4)
6. **Confirm to Morgan** the live-mode Stripe account state: identity verification cleared and bank connected — otherwise cards get charged and funds sit undisbursed

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.*
