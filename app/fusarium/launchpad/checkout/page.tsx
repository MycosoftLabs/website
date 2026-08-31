"use client"

/**
 * Launchpad checkout — account details and payment on one page.
 *
 * Step 1 collects the facts we need to provision a workspace (name, work email,
 * company) plus the intake that tells us who is arriving. Step 2 mounts Stripe's
 * Embedded Checkout directly underneath, so the buyer never leaves the site and
 * we capture the account and the payment in one sitting.
 *
 * WHY THE FIELDS COME FIRST: the workspace is provisioned against the email the
 * buyer authenticates with. Collecting it before the session is created means
 * the Stripe customer, the pending purchase, and the eventual Supabase user all
 * agree — instead of a payment landing with no idea who it belongs to.
 *
 * WHY THE EXTRA INTAKE: this is the only moment a self-serve buyer talks to us
 * before the workspace exists. Job title, company size and the reason for
 * applying ride along on the pending purchase and survive the webhook, so
 * onboarding starts with context instead of an anonymous paid row.
 *
 * BOUNDARY: card details are entered inside Stripe's iframe. They never touch
 * our DOM, our state, or our servers — that is what keeps us out of PCI scope.
 * These fields are public business facts only: no CUI, no credentials.
 *
 * Entitlements are granted by the verified webhook, never by this page and
 * never by the return redirect.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { loadStripe, type Stripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react"
import {
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { GlassButton } from "@/components/ui/glass-button"
import { CATALOG, PLAN_ENTITLEMENTS, type PlanKey } from "@/lib/launchpad/catalog"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"
import { COMPANY_SIZES, type CompanySize } from "@/lib/launchpad/billing/intake"

const fmtUsd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`

const PLAN_NAMES: Record<PlanKey, string> = {
  launch_pass_30d: "Launch Pass",
  core: "Launchpad Core",
  contractor_ops: "Contractor Ops",
  origin_graph: "Ops + Origin Graph",
  partner_mesh_pro: "Partner Mesh Pro",
}

const PLAN_LOOKUP: Record<string, { monthly: string; annual: string }> = {
  core: { monthly: "fus_launchpad_core_monthly", annual: "fus_launchpad_core_annual" },
  contractor_ops: { monthly: "fus_launchpad_ops_monthly", annual: "fus_launchpad_ops_annual" },
  origin_graph: { monthly: "fus_launchpad_origin_monthly", annual: "fus_launchpad_origin_annual" },
  partner_mesh_pro: { monthly: "fus_launchpad_partner_monthly", annual: "fus_launchpad_partner_annual" },
}

const field =
  "myco-glass-field w-full rounded-lg border border-border px-3 py-2.5 text-base " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-500/40"

/** Human labels for the wire values. The <option> value stays the raw enum —
 *  the list is iterated from COMPANY_SIZES so it cannot drift from the server. */
const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  solo: "Just me",
  "2-10": "2–10 people",
  "11-50": "11–50 people",
  "51-200": "51–200 people",
  "201-1000": "201–1,000 people",
  "1000+": "1,000+ people",
}

const MAX = { jobTitle: 120, companyWebsite: 300, applyReason: 2000, intendedUse: 500 } as const
const MIN_REASON = 12

/** Mirrors clip() in lib/launchpad/billing/intake.ts. Counting the collapsed
 *  string is what makes the counter and the min-length gate agree with the
 *  value the server actually stores — a textarea full of newlines is not 200
 *  characters of reason. */
const normalize = (raw: string, max: number) => raw.replace(/\s+/g, " ").trim().slice(0, max)

/** Mirrors looksLikeCui() in the same module. The server is still the
 *  authority; catching it here just saves the buyer a round-trip. */
const looksLikeCui = (text: string) =>
  /\bcui\s*\/\//i.test(text) || /\b(itar|ear\s*99|controlled technical information)\b/i.test(text)

/** Same wording the server returns, so the buyer sees one message whichever
 *  side catches it. */
const CUI_REFUSED = "Do not submit CUI or export-controlled technical data in this form."

/** Resolve ?plan=&billing= or ?item= into one catalog product. */
function resolveOrder(plan: string | null, billing: string | null, item: string | null) {
  if (item) {
    const product = CATALOG.find((p) => p.lookupKey === item)
    if (!product) return null
    const isAdvisory = product.kind === "advisory"
    return {
      product,
      title: isAdvisory
        ? `${product.advisoryMinutes}-minute advisory session`
        : product.kind === "credits"
          ? `${product.creditQuantity?.toLocaleString()} AI credits`
          : product.name,
      cadence: "one time",
      planKey: null as PlanKey | null,
    }
  }
  if (plan && plan in PLAN_LOOKUP) {
    const period: "monthly" | "annual" = billing === "annual" ? "annual" : "monthly"
    const product = CATALOG.find((p) => p.lookupKey === PLAN_LOOKUP[plan][period])
    if (!product) return null
    return {
      product,
      title: PLAN_NAMES[plan as PlanKey],
      cadence: period === "annual" ? "per year" : "per month",
      planKey: plan as PlanKey,
    }
  }
  const pass = CATALOG.find((p) => p.lookupKey === "fus_launchpad_launch_pass")
  return pass
    ? { product: pass, title: "Launch Pass", cadence: "one time", planKey: null as PlanKey | null }
    : null
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutFlow />
    </Suspense>
  )
}

function CheckoutFlow() {
  const params = useSearchParams()
  const order = useMemo(
    () => resolveOrder(params?.get("plan") ?? null, params?.get("billing") ?? null, params?.get("item") ?? null),
    [params],
  )

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    jobTitle: "",
    companySize: "",
    companyWebsite: "",
    applyReason: "",
    intendedUse: "",
  })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Kept alongside the message so the CUI refusal can be explained rather than
  // just repeated — the codes come from the route, see intake.ts.
  const [errCode, setErrCode] = useState<string | null>(null)
  const [stripe, setStripe] = useState<Stripe | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const baked = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      if (baked?.startsWith("pk_")) {
        const loaded = await loadStripe(baked)
        if (!cancelled) setStripe(loaded)
        return
      }
      try {
        const r = await fetch("/api/fusarium/launchpad/billing/publishable-key")
        const d = await r.json().catch(() => ({}))
        const key = typeof d?.publishableKey === "string" ? d.publishableKey : ""
        if (!key.startsWith("pk_")) return
        const loaded = await loadStripe(key)
        if (!cancelled) setStripe(loaded)
      } catch {
        // Hosted Checkout still works without a publishable key.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }))
      // Clear a previous refusal as soon as they start changing the answer.
      // Otherwise someone who deletes the offending word keeps reading "this was
      // refused" while looking at input that would now be accepted.
      if (err || errCode) {
        setErr(null)
        setErrCode(null)
      }
    }

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    setErr(null)
    setErrCode(null)

    // Send exactly what the server would keep, and check it against the same
    // rules first so a fixable mistake costs a keystroke instead of a round
    // trip. The server re-parses everything — this is convenience, not a gate.
    const intake = {
      jobTitle: normalize(form.jobTitle, MAX.jobTitle),
      companySize: form.companySize,
      companyWebsite: normalize(form.companyWebsite, MAX.companyWebsite),
      applyReason: normalize(form.applyReason, MAX.applyReason),
      intendedUse: normalize(form.intendedUse, MAX.intendedUse),
    }

    // This route parses with requireReason:false, so an empty reason would pass
    // server validation. We require it here because onboarding needs it, not
    // because anything downstream enforces it.
    if (intake.applyReason.length < MIN_REASON) {
      setErrCode("apply_reason_required")
      setErr(`Tell us why you are applying (at least ${MIN_REASON} characters).`)
      return
    }
    if (
      looksLikeCui(
        [normalize(form.name, 200), normalize(form.company, 200), intake.jobTitle, intake.applyReason, intake.intendedUse].join(" "),
      )
    ) {
      setErrCode("cui_refused")
      setErr(CUI_REFUSED)
      return
    }

    setBusy(true)
    try {
      const embedded = Boolean(stripe)
      const r = await fetch("/api/fusarium/launchpad/billing/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookupKey: order.product.lookupKey,
          email: form.email,
          name: form.name,
          company: form.company,
          embedded,
          ...intake,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setErrCode(typeof d?.code === "string" ? d.code : null)
        setErr(d?.error || "Could not start checkout. Please try again.")
        return
      }
      if (embedded) {
        if (!d?.clientSecret) {
          setErr(d?.error || "Could not start checkout. Please try again.")
          return
        }
        setClientSecret(d.clientSecret)
        return
      }
      if (typeof d?.url === "string" && d.url.startsWith("https://")) {
        window.location.assign(d.url)
        return
      }
      setErr(d?.error || "Could not start checkout. Please try again.")
    } catch {
      setErr("Network error — please try again.")
    } finally {
      setBusy(false)
    }
  }

  const fetchClientSecret = useCallback(async () => clientSecret ?? "", [clientSecret])

  if (!order) {
    return (
      <NeuromorphicProvider>
        <div className="launchpad-glass-page min-h-dvh flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">That plan is not recognized.</p>
            <Link
              href="/fusarium/launchpad/pricing"
              className="text-sm text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mt-2 inline-block"
            >
              Back to pricing
            </Link>
          </div>
        </div>
      </NeuromorphicProvider>
    )
  }

  const reasonLen = normalize(form.applyReason, MAX.applyReason).length

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.company.trim() &&
    form.jobTitle.trim() &&
    form.companySize &&
    reasonLen >= MIN_REASON &&
    !busy

  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>

        <div className="border-b border-border/50">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            <Link
              href="/fusarium/launchpad/pricing"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to pricing
            </Link>
          </div>
        </div>

        <section className="py-12">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8">
              <NeuBadge variant="default" className="mb-4">Checkout</NeuBadge>
              <h1 className="text-3xl md:text-4xl font-bold">Set up your workspace and pay</h1>
              <p className="text-muted-foreground mt-2">
                Your details and your payment in one step — you will not be bounced anywhere else.
              </p>
            </div>

            {/* Order summary */}
            <div className="myco-glass-surface rounded-2xl border-2 border-emerald-500/50 p-6 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
                    You are buying
                  </p>
                  <h2 className="text-2xl font-bold mt-1">{order.title}</h2>
                  {order.planKey && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {PLAN_ENTITLEMENTS[order.planKey].users} users ·{" "}
                      {PLAN_ENTITLEMENTS[order.planKey].aiCreditsMonthly.toLocaleString()} AI credits per month
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-bold tabular-nums">{fmtUsd(order.product.unitAmount)}</div>
                  <div className="text-xs text-muted-foreground">{order.cadence}</div>
                </div>
              </div>
            </div>

            {/* Step 1 — account details */}
            <div className="myco-glass-surface rounded-2xl border border-border/70 p-6 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="myco-glass-tile h-7 w-7 text-xs font-bold">1</span>
                <h2 className="text-lg font-semibold">Your details</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                We create your workspace against this email. Public business facts only — never CUI,
                credentials, or proprietary technical data.
              </p>

              <form onSubmit={startPayment} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lp-name" className="text-sm font-medium block mb-1.5">Your name *</label>
                    <input
                      id="lp-name"
                      required
                      maxLength={200}
                      className={field}
                      value={form.name}
                      onChange={set("name")}
                      disabled={!!clientSecret}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lp-email" className="text-sm font-medium block mb-1.5">Work email *</label>
                    <input
                      id="lp-email"
                      required
                      type="email"
                      className={field}
                      value={form.email}
                      onChange={set("email")}
                      disabled={!!clientSecret}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lp-company" className="text-sm font-medium block mb-1.5">Company *</label>
                    <input
                      id="lp-company"
                      required
                      maxLength={200}
                      className={field}
                      value={form.company}
                      onChange={set("company")}
                      disabled={!!clientSecret}
                      autoComplete="organization"
                    />
                  </div>
                  <div>
                    <label htmlFor="lp-job-title" className="text-sm font-medium block mb-1.5">Job title *</label>
                    <input
                      id="lp-job-title"
                      required
                      maxLength={MAX.jobTitle}
                      className={field}
                      value={form.jobTitle}
                      onChange={set("jobTitle")}
                      disabled={!!clientSecret}
                      autoComplete="organization-title"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="lp-company-size" className="text-sm font-medium block mb-1.5">Company size *</label>
                    {/* Same glass class as the inputs. A plain background utility
                        left this control — and its OS-drawn options popup —
                        white-on-white against the dark page; the global
                        color-scheme rule themes the popup, this themes the
                        closed trigger so the two agree. */}
                    <select
                      id="lp-company-size"
                      required
                      className={field}
                      value={form.companySize}
                      onChange={set("companySize")}
                      disabled={!!clientSecret}
                    >
                      <option value="">Select…</option>
                      {COMPANY_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {COMPANY_SIZE_LABELS[size]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lp-company-website" className="text-sm font-medium block mb-1.5">
                      Company website <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    {/* type="text", not type="url": native url validation rejects
                        a bare "example.com", which is what most people type. The
                        server only clips this to 300 chars, so nothing downstream
                        needs a scheme. */}
                    <input
                      id="lp-company-website"
                      type="text"
                      inputMode="url"
                      maxLength={MAX.companyWebsite}
                      placeholder="example.com"
                      className={field}
                      value={form.companyWebsite}
                      onChange={set("companyWebsite")}
                      disabled={!!clientSecret}
                      autoComplete="url"
                    />
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 space-y-4">
                  <div>
                    <label htmlFor="lp-apply-reason" className="text-sm font-medium block mb-1.5">Why are you applying? *</label>
                    <textarea
                      id="lp-apply-reason"
                      required
                      rows={4}
                      maxLength={MAX.applyReason}
                      className={field}
                      value={form.applyReason}
                      onChange={set("applyReason")}
                      disabled={!!clientSecret}
                      placeholder="What are you trying to get done, and by when?"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <p className="text-xs text-muted-foreground">
                        Business reason only — no CUI and no export-controlled (ITAR/EAR) technical data.
                      </p>
                      {/* <div>, not <span>: the neuromorphic dark shell forces
                          color:inherit on p/span/label, which would silently
                          flatten the under-minimum amber back to body text. */}
                      <div
                        className={
                          reasonLen > 0 && reasonLen < MIN_REASON
                            ? "text-xs tabular-nums text-amber-600 dark:text-amber-400"
                            : "text-xs tabular-nums text-muted-foreground"
                        }
                      >
                        {/* Each number is measured the same way as the rule it
                            describes. The minimum is checked against collapsed
                            whitespace because that is what the server counts;
                            the maximum is the raw length because that is what
                            maxLength stops. Using the collapsed count for both
                            made the ceiling unreachable — typing died at the raw
                            limit while the counter still showed room left. */}
                        {reasonLen < MIN_REASON
                          ? `${reasonLen} / ${MIN_REASON} minimum`
                          : `${form.applyReason.length} / ${MAX.applyReason}`}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lp-intended-use" className="text-sm font-medium block mb-1.5">
                      How do you plan to use it?{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      id="lp-intended-use"
                      rows={3}
                      maxLength={MAX.intendedUse}
                      className={field}
                      value={form.intendedUse}
                      onChange={set("intendedUse")}
                      disabled={!!clientSecret}
                    />
                    <div className="mt-1.5 text-right text-xs tabular-nums text-muted-foreground">
                      {form.intendedUse.length} / {MAX.intendedUse}
                    </div>
                  </div>
                </div>

                {/* No tinted panel or coloured rule around this. An unlayered
                    `* { border-color }` and the .launchpad-glass-page surface
                    rules override border and background colour page-wide, so a
                    warning box would render as neutral grey and read as decoration.
                    On this shell the signal has to come from text and icon colour. */}
                {err && (
                  <div>
                    {/* <div>, not <p>, and an explicit red rather than
                        text-destructive: the shell forces color:inherit on
                        p/span, and the destructive token is a near-black red
                        that vanishes against the dark page. An error the buyer
                        has to read cannot depend on either. */}
                    <div className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                      {errCode === "cui_refused" && (
                        // text-yellow, not text-amber: the shell repaints every
                        // icon grey unless the class names white/green/red/
                        // yellow/blue/purple. Yellow is on that list and reads
                        // as the same caution accent as the panel.
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                      )}
                      <span>{err}</span>
                    </div>
                    {errCode === "cui_refused" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        This intake is a commercial, non-CUI channel, so controlled unclassified
                        information and export-controlled technical data cannot be accepted here.
                        Describe the work in general business terms and the checkout will go
                        through — controlled detail belongs on an authorized channel instead.
                      </p>
                    )}
                  </div>
                )}

                {!clientSecret && (
                  <GlassButton type="submit" disabled={!canSubmit} className="myco-glass-button--block">
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 text-current mr-2 animate-spin" /> Preparing secure payment…
                      </>
                    ) : (
                      <>
                        Continue to payment <ArrowRight className="ml-2 h-4 w-4 text-current" />
                      </>
                    )}
                  </GlassButton>
                )}
              </form>
            </div>

            {/* Step 2 — Stripe's own payment widget, embedded */}
            <div className="myco-glass-surface rounded-2xl border border-border/70 p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="myco-glass-tile h-7 w-7 text-xs font-bold">2</span>
                <h2 className="text-lg font-semibold">Payment</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5 flex items-start gap-2">
                <Lock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                Card, Apple Pay, Google Pay, Link and any other method enabled on our Stripe account.
                Card details are entered inside Stripe and never reach our servers.
              </p>

              {!stripe ? (
                <p className="text-sm text-muted-foreground">
                  Continue above to open Stripe&apos;s hosted checkout. Card details are collected
                  on Stripe, never on this page.
                </p>
              ) : !clientSecret ? (
                <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Fill in your details above and the payment form appears here.
                  </p>
                </div>
              ) : (
                <div id="stripe-embedded-checkout">
                  <EmbeddedCheckoutProvider stripe={stripe} options={{ fetchClientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-6 flex items-start gap-2 max-w-3xl">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              Launchpad organizes your own self-assessment. Purchase does not confer certification,
              eligibility, or any award, and external providers are billed by them directly. Your
              workspace is activated by our verified payment webhook — not by this page.
            </p>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
