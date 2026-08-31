# Cursor deploy queue — three items, in order

**Date:** August 13, 2026 · **From:** Claude · **Branch:** `feat/launchpad-full-surface-aug13`
**Claude did NOT deploy any of this.** Everything below is committed and pushed; you own the cutover.
**Repo is PUBLIC.** Env var names only.

---

## ITEM 1 — Upload the missing device media (no code change, fixes a visible prod bug)

**Symptom on live `/defense/fusarium`:** the seven device cards render as flat text tiles with no video. Morgan reported it; I reproduced it.

**Cause:** the page requests `/assets/fusarium/devices/<id>-card.mp4`. That entire **`devices/` subfolder was never uploaded** — the earlier NAS sync covered `fusarium/` and `launchpad/` top-level files but not this subdirectory. All seven return **404** on production; all seven exist locally and render correctly. **The code is right; the files are absent.**

**Upload** `public/assets/fusarium/devices/` → `/opt/mycosoft/media/website/assets/fusarium/devices/`
**21 files, 4.5 MB total** — trivial compared to the 955 MB already synced.

| File | Bytes |
|---|---|
| `agaric-card.mp4` / `-poster.jpg` / `agaric.jpg` | 444,719 / 14,660 / 46,066 |
| `sporebase-card.mp4` / `-poster.jpg` / `sporebase.jpg` | 750,159 / 16,374 / 45,770 |
| `psathyrella-card.mp4` / `-poster.jpg` / `psathyrella.jpg` | 1,201,446 / 17,386 / 50,443 |
| `mushroom-1-card.mp4` / `-poster.jpg` / `mushroom-1.jpg` | 707,648 / 7,953 / 88,403 |
| `hyphae-1-card.mp4` / `-poster.jpg` / `hyphae-1.jpg` | 371,445 / 9,271 / 44,898 |
| `myconode-card.mp4` / `-poster.jpg` / `myconode.jpg` | 462,812 / 28,499 / 57,487 |
| `alarm-card.mp4` / `-poster.jpg` / `alarm.jpg` | 271,768 / 4,729 / 19,778 |

**Verify — all seven must return 200:**
```bash
for d in agaric sporebase psathyrella mushroom-1 hyphae-1 myconode alarm; do
  curl -sI -o /dev/null -w "%{http_code} $d\n" "https://mycosoft.com/assets/fusarium/devices/$d-card.mp4"
done
```
Purge Cloudflare after, as with the last batch. **No rebuild needed** — this is a bind-mounted volume.

---

## ITEM 2 — Ship the CSP fix (REQUIRED before any payment test)

**Commit `d26dd816`.** Our own Content-Security-Policy omitted `js.stripe.com`. Verified in a real browser against production:

```
Loading the script 'https://js.stripe.com/clover/stripe.js' violates the
following Content Security Policy directive: script-src 'self' …
```

**Stripe's SDK could never load.** Embedded Checkout would have stayed blank even with the publishable key set and the flag flipped — a silent failure with no obvious cause. `frame-src ('self' https:)` and `connect-src ('self' blob: https: wss:)` were already permissive enough; only `script-src` changed, in both the prod and dev CSP strings.

**This is a `next.config.js` change → it needs a REBUILD, not an env flip.**

---

## ITEM 3 — Then, and only then, the payment env

Order matters. Doing the flag first just reproduces the blank widget.

1. **Rebuild** with Item 2 **and** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set (it bakes in at build time — setting it after the build does nothing)
2. **Then** flip `LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED=1` (runtime)

Currently live and correct: the route returns `503 public_checkout_disabled` and the page says *"Online checkout is not open yet."* That is the fail-closed path working.

**Still unbuilt, and it bites on the first real sale:** `/fusarium/launchpad/welcome` does not exist, so a paying customer lands on a **404**. Send me the shape of `GET /billing/session/:id` → `{ paid, email, lookupKey, planName, claimed }` and I will build the page immediately. Also outstanding: the pending-purchase webhook branch (runbook §4) — without it a public sale is charged by Stripe and dropped, because it carries no `lp_tenant_id`.

---

## Audit results — what IS correct on production right now

- **All 31 authenticated app routes** return 307 to the auth gate. None 404, none exposed.
- **Public surfaces all 200:** `/defense/fusarium`, `/fusarium/launchpad`, `/pricing`, `/checkout`, `/get-started`, `/trust`, `/legal/terms`, `/sensing/bluesight`, `/api/health`.
- **FUSARIUM content verified in live HTML** — orchestration video, sensing plates, hyphae SEM, "Land & Biosphere", glass buttons, "Why the name" disclosure. **Zero maturity-chip leakage** (the "Operational" hits are prose: "operational environment", "operational picture").
- **Pricing verified in a real browser** — billing toggle, all four plan CTAs, 7 per-SKU add-on rows, correct **$999 / $9,990 / $149**, **zero Founding-50 language**, 61 glass rules loaded.
- **Checkout verified** — Partner Mesh Pro renders **$999/month**, both steps, exactly 3 fields/3 labels. (The "duplicate Company field" in Morgan's screenshot is his browser's autofill overlay, not a real field.)
- **All 13 previously-synced NAS assets 200**, including the space-containing filenames.

## Known gaps that are NOT defects

- Marketing pages `how-it-works`, `modules`, `contract-radar`, `origin-graph`, `faq` were planned but the build job died on a spend limit. **Nothing links to them** — no broken links, just a thinner public IA. Mine to finish.
- Stripe Checkout does not settle arbitrary crypto. Cash App Pay and PayPal are Dashboard toggles that work today; crypto needs a separate provider decision.
- `/fusarium` (without `/defense`) 404s — never in this build. Add a redirect if Morgan wants the short URL.

---

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.*
