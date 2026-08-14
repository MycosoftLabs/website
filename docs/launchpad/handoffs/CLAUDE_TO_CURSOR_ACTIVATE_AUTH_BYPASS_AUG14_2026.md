# Claude → Cursor — `activate` can log a payer into someone else's account

**Date:** August 14, 2026 · **Severity: high — do not enable the activate path on production until it is fixed.**
**Files:** `app/api/fusarium/launchpad/billing/activate/route.ts`, `lib/launchpad/billing/provision.ts` (both Cursor's lane — I did not edit them)
**Repo is PUBLIC.** No secrets below.

Found while wiring the welcome page against your contract. Confirmed by reading the code, not inferred.

---

## 1. The bypass

Stripe Checkout collects an email. **It does not verify the buyer controls that inbox** — the buyer types whatever they like and pays by card.

`provision.ts:30-48` — `ensureUser` returns a **pre-existing** Supabase user when one already matches the email:

```ts
async function ensureUser(svc, email, name) {
  const existing = await findUserIdByEmail(svc, email);
  if (existing) return existing;        // <-- silently adopts someone else's account
  ...createUser({ email, email_confirm: true })
}
```

`activate/route.ts:110-146` then mints a magic link for that email and **redeems it server-side**, setting auth cookies:

```ts
const { data: link } = await svc.auth.admin.generateLink({ type: 'magiclink', email: provisioned.email })
await sessionClient.auth.verifyOtp({ type: 'email', token_hash: link.properties.hashed_token })
```

Nothing anywhere checks whether the auth user was created **by this purchase** or already belonged to a real person.

### The attack

1. Attacker opens `/fusarium/launchpad/pricing`, picks any plan.
2. In Stripe Checkout they enter **`victim@example.com`** — an address they do not control.
3. They pay (~$149). The `session_id` comes back in **their own** return URL.
4. Their browser POSTs `activate` with it.
5. `ensureUser` finds the victim's existing account. `activate` mints and redeems a magic link for it.
6. **The attacker now holds a logged-in Supabase session as the victim.**

Supabase auth is shared site-wide, so this is not scoped to Launchpad — it is whatever that account can reach.

`provision.ts:93-97` makes it worse: if the victim already has an active Launchpad membership, the payer is dropped **into the victim's existing tenant** rather than a fresh one.

**Cost to the attacker: one card payment, which is chargeback-reversible. Target: any email address that already has an account, including our own staff addresses.**

Even against an email with *no* existing account it is not harmless: it creates an `email_confirm: true` account for an address nobody has proven they own.

## 2. The fix

**Only auto-login when this purchase created the account.** Anyone else must prove inbox ownership through a normal magic link.

`provision.ts` already knows which case it is — it just discards the fact. Surface it:

```ts
async function ensureUser(svc, email, name): Promise<{ id: string; created: boolean }> {
  const existing = await findUserIdByEmail(svc, email);
  if (existing) return { id: existing, created: false };
  ...
  return { id: data.user.id, created: true };
}
```

Carry `userWasCreated` out through `ProvisionResult`, then in `activate`:

```ts
if (!provisioned.userWasCreated) {
  // Pre-existing account: paying does not prove you own this inbox.
  // Send the real magic link to the real address and stop here.
  return NextResponse.json({
    ok: true, provisioned: true, tenantId: provisioned.tenantId, email: provisioned.email,
    loggedIn: false,
    nextStep: 'onboarding',
    redirectTo: `/login?redirectTo=${encodeURIComponent(ONBOARDING)}`,
    note: 'This email already has an account. Sign in to claim the purchase.',
  })
}
// only now: generateLink + verifyOtp + set cookies
```

Do **not** return `actionLink` on that branch — handing the redeemable link back in the HTTP response is the same bypass wearing a hat. Let Supabase email it.

**My welcome page already handles `loggedIn: false` correctly** — it shows a sign-in step instead of redirecting — so this backend change needs no further frontend work.

Provisioning itself (tenant + entitlements) can still run on the webhook. The purchase is honoured either way; only the *automatic login* is gated. Genuinely new customers — nearly everyone — see no difference.

### Worth also considering

`email_confirm: true` marks an unverified address as confirmed. For an address the buyer does control this is fine and saves a step. Combined with the above gate, the blast radius is limited to accounts this flow created, so I would keep it — but it is your call.

## 3. Separate bug, same file — provisioning breaks past 200 users

`provision.ts:23-28`:

```ts
const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
const match = (data.users ?? []).find(...)
```

**Only the first 200 auth users are ever searched.** Once the site passes 200 users:

- an existing user beyond page 1 is not found → `createUser` is called → fails on the unique-email constraint → the fallback `findUserIdByEmail` misses for the same reason → `ensureUser` throws `could not create auth user`
- `activate` returns **500 `provision_failed`** — on a purchase that has **already been charged**

This fails closed on a paid customer, which is the expensive kind of failure. Use `getUserByEmail`-style lookup or a direct filtered query rather than paging the whole user table.

---

## 4. What I need from you

1. Gate the auto-login on `userWasCreated` (§2).
2. Fix the 200-user lookup (§3).
3. Confirm back, and I will re-run the live purchase journey end to end.

Until §1 lands, `activate` should not be reachable on production.

*Mycosoft, LLC is pursuing CMMC Level 2 (Self-Assessment). No purchase flow may state or imply certification, eligibility, or an award.*
