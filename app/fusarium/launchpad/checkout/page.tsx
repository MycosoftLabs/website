"use client"

/**
 * Launchpad checkout — account details and payment on one page.
 *
 * Step 1 collects the facts we need to provision a workspace (name, work email,
 * company). Step 2 mounts Stripe's Embedded Checkout directly underneath, so
 * the buyer never leaves the site and we capture the account and the payment in
 * one sitting.
 *
 * WHY THE FIELDS COME FIRST: the workspace is provisioned against the email the
 * buyer authenticates with. Collecting it before the session is created means
 * the Stripe customer, the pending purchase, and the eventual Supabase user all
 * agree — instead of a payment landing with no idea who it belongs to.
 *
 * BOUNDARY: card details are entered inside Stripe's iframe. They never touch
 * our DOM, our state, or our servers — that is what keeps us out of PCI scope.
 * These fields are public business facts only: no CUI, no credentials.
 *
 * Entitlements are granted by the verified webhook, never by this page and
 * never by the return redirect.
 */

import { Suspense, useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { ArrowLeft, ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react"
import {
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { GlassButton } from "@/components/ui/glass-button"
import { CATALOG, PLAN_ENTITLEMENTS, type PlanKey } from "@/lib/launchpad/catalog"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

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

/** Publishable key is safe in the browser by design; the secret key never is. */
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const field =
  "myco-glass-field w-full rounded-lg border border-border px-3 py-2.5 text-base " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-500/40"

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

  const [form, setForm] = useState({ name: "", email: "", company: "" })
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const startPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch("/api/fusarium/launchpad/billing/public-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lookupKey: order.product.lookupKey,
          email: form.email,
          name: form.name,
          company: form.company,
          embedded: true,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.clientSecret) {
        setErr(d?.error || "Could not start checkout. Please try again.")
        return
      }
      setClientSecret(d.clientSecret)
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

  const canSubmit = form.name.trim() && form.email.trim() && form.company.trim() && !busy

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
                    <label className="text-sm font-medium block mb-1.5">Your name *</label>
                    <input
                      required
                      className={field}
                      value={form.name}
                      onChange={set("name")}
                      disabled={!!clientSecret}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Work email *</label>
                    <input
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
                <div>
                  <label className="text-sm font-medium block mb-1.5">Company *</label>
                  <input
                    required
                    className={field}
                    value={form.company}
                    onChange={set("company")}
                    disabled={!!clientSecret}
                    autoComplete="organization"
                  />
                </div>

                {err && <p className="text-sm text-destructive">{err}</p>}

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

              {!stripePromise ? (
                <p className="text-sm text-muted-foreground">
                  Payments are not configured in this environment.
                </p>
              ) : !clientSecret ? (
                <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Fill in your details above and the payment form appears here.
                  </p>
                </div>
              ) : (
                <div id="stripe-embedded-checkout">
                  <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
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
