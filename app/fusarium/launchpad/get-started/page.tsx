"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react"
import { CATALOG, PLAN_ENTITLEMENTS, type PlanKey } from "@/lib/launchpad/catalog"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

/**
 * Launchpad sign-up.
 *
 * This is an open front door, not a selection process. An earlier draft framed
 * it as applying to a capped "Founding 50" cohort — a number carried in from
 * the spec package that was never a real limit. Launchpad is not seat-limited
 * and does not publish a seat count, so nothing here implies scarcity,
 * competition, review order, or acceptance.
 */

const STAGES = [
  ["idea", "Idea — entity not fully established"],
  ["entity", "Entity exists — registrations and acquisition knowledge are thin"],
  ["bidding", "Registered — proposals and capture are inconsistent"],
  ["award", "Expecting FCI/CUI or contract flow-downs"],
  ["production", "Hardware moving from prototype to production"],
] as const

const offerTerms = [
  "$397 one-time Launch Pass — no seat limit, no cohort, no waiting list",
  "Guided activation plus the first 30 days of Launchpad Core",
  "A recurring plan is optional and explicitly selected — nothing auto-renews",
  "External providers (enclave, cloud, assessors, counsel, hardware) are paid directly by you",
  "No certification, no independent assessment, no legal advice, no award guarantee, no clearance sponsorship, no CUI hosting",
]

/** Terms shown when a visitor arrived having chosen a recurring plan, so the
 *  page never quotes the $397 pass at someone who selected the $999 tier. */
function planTerms(planKey: PlanKey, billing: "monthly" | "annual", amountCents: number): string[] {
  return [
    `${PLAN_NAMES[planKey]} — ${fmtUsd(amountCents)} ${billing === "annual" ? "per year" : "per month"}`,
    billing === "annual"
      ? "Annual billing is priced at ten months — two months free"
      : "Monthly billing, cancel any time; nothing is locked in",
    "Guided activation is included; your plan's entitlements apply from day one",
    "External providers (enclave, cloud, assessors, counsel, hardware) are paid directly by you",
    "No certification, no independent assessment, no legal advice, no award guarantee, no clearance sponsorship, no CUI hosting",
  ]
}

// myco-glass-field, not bg-background: the plain utility left the <select> and
// its native options rendering white-on-white against the dark glass page.
// (The global `color-scheme` rule themes the OS-drawn options popup; this
// styles the closed control so the two agree.)
const input =
  "myco-glass-field w-full rounded-lg border border-border px-3 py-2.5 text-base " +
  "focus:outline-none focus:ring-2 focus:ring-emerald-500/40"

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

/** Resolve ?plan=&billing= into a real catalog product. Returns null for the
 *  default (no plan chosen) path so the page falls back to the Launch Pass. */
/**
 * Resolve ?item=<lookupKey> for the one-time add-ons — credit packs and
 * advisory sessions. Whitelisted against the catalog: an unknown key resolves
 * to null rather than rendering an unpriced or invented item.
 */
function resolveItem(itemParam: string | null) {
  if (!itemParam) return null
  const product = CATALOG.find((p) => p.lookupKey === itemParam)
  if (!product) return null
  if (product.kind !== "credits" && product.kind !== "advisory") return null
  const isAdvisory = product.kind === "advisory"
  return {
    product,
    title: isAdvisory
      ? `${product.advisoryMinutes}-minute advisory session`
      : `${product.creditQuantity?.toLocaleString()} AI credits`,
    kicker: isAdvisory ? "Prepaid session" : "One-time credit pack",
    nextStep: isAdvisory
      ? "You pay first, then pick a time against real availability — a slot is never held without payment."
      : "Credits are added to your workspace balance and never expire. They sit on top of your plan's monthly allotment.",
  }
}

function resolveSelection(planParam: string | null, billingParam: string | null) {
  if (!planParam || !(planParam in PLAN_LOOKUP)) return null
  const billing: "monthly" | "annual" = billingParam === "annual" ? "annual" : "monthly"
  const lookupKey = PLAN_LOOKUP[planParam][billing]
  const product = CATALOG.find((p) => p.lookupKey === lookupKey)
  if (!product) return null
  return { planKey: planParam as PlanKey, billing, product }
}

export default function GetStartedPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <GetStartedForm />
    </Suspense>
  )
}

function GetStartedForm() {
  const searchParams = useSearchParams()
  const selection = resolveSelection(searchParams?.get("plan") ?? null, searchParams?.get("billing") ?? null)
  const item = resolveItem(searchParams?.get("item") ?? null)

  const [form, setForm] = useState({
    name: "", email: "", company: "", website: "", builds: "",
    stage: "", targetAgencies: "", heardFrom: "",
  })
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState("sending"); setError(null)
    try {
      const r = await fetch("/api/fusarium/launchpad/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Carry the chosen plan through, so the activation email and the
        // workspace we provision match what the customer actually picked
        // rather than defaulting everyone to the Launch Pass.
        body: JSON.stringify({
          ...form,
          ...(selection
            ? {
                selectedPlan: selection.planKey,
                selectedBilling: selection.billing,
                selectedLookupKey: selection.product.lookupKey,
              }
            : {}),
          ...(item
            ? { selectedItemKind: item.product.kind, selectedLookupKey: item.product.lookupKey }
            : {}),
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d?.error || "Submission failed"); setState("error"); return }
      setState("done")
    } catch {
      setError("Network error — please try again"); setState("error")
    }
  }

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
              href={selection || item ? "/fusarium/launchpad/pricing" : "/fusarium/launchpad"}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {selection || item ? "Back to pricing" : "Back to Launchpad"}
            </Link>
          </div>
        </div>

        <section className="py-16">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <NeuBadge variant="default" className="mb-4">
                Get Started
              </NeuBadge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
                One guided path from technical startup to defense contractor.
              </h1>
              <p className="text-lg text-muted-foreground">
                Tell us what you build and where you are today. We use it to set your workspace up
                against the right readiness track, then send your activation link and next steps.
              </p>
            </div>

            {/* The plan the visitor actually chose on /pricing. Without this the
                page quoted the $397 pass at someone who clicked the $999 tier. */}
            {selection && (
              <div className="myco-glass-surface rounded-2xl border-2 border-emerald-500/50 p-6 sm:p-7 mb-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
                      Your selected plan
                    </p>
                    <h2 className="text-2xl font-bold mt-1">{PLAN_NAMES[selection.planKey]}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {PLAN_ENTITLEMENTS[selection.planKey].users} users ·{" "}
                      {PLAN_ENTITLEMENTS[selection.planKey].aiCreditsMonthly.toLocaleString()} AI credits per month
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold tabular-nums">
                      {fmtUsd(selection.product.unitAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selection.billing === "annual" ? "per year" : "per month"}
                    </div>
                  </div>
                </div>
                <Link
                  href="/fusarium/launchpad/pricing"
                  className="inline-block text-xs text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mt-4"
                >
                  Change plan
                </Link>
              </div>
            )}

            {/* One-time add-ons: a credit pack or an advisory session. Same
                treatment as a plan — the page shows what was actually clicked,
                priced from the catalog, with the real next step spelled out. */}
            {item && (
              <div className="myco-glass-surface rounded-2xl border-2 border-emerald-500/50 p-6 sm:p-7 mb-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
                      {item.kicker}
                    </p>
                    <h2 className="text-2xl font-bold mt-1">{item.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md leading-relaxed">
                      {item.nextStep}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-bold tabular-nums">{fmtUsd(item.product.unitAmount)}</div>
                    <div className="text-xs text-muted-foreground">one time</div>
                  </div>
                </div>
                <Link
                  href="/fusarium/launchpad/pricing"
                  className="inline-block text-xs text-emerald-600 dark:text-emerald-400 underline underline-offset-2 mt-4"
                >
                  Choose something else
                </Link>
              </div>
            )}

            <NeuCard className="mb-10">
              <NeuCardHeader>
                <h2 className="text-lg font-semibold">What you get, plainly</h2>
              </NeuCardHeader>
              <NeuCardContent>
                <ul className="space-y-2.5">
                  {(selection
                    ? planTerms(selection.planKey, selection.billing, selection.product.unitAmount)
                    : offerTerms
                  ).map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </NeuCardContent>
            </NeuCard>

            {state === "done" ? (
              <NeuCard>
                <NeuCardContent className="pt-8 pb-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">You&apos;re in — check your inbox</h2>
                  <p className="text-muted-foreground">
                    We&apos;ll send your activation link and next steps to {form.email || "your email"}.
                    No payment is due now.
                  </p>
                </NeuCardContent>
              </NeuCard>
            ) : (
              <NeuCard>
                <NeuCardHeader>
                  <h2 className="text-lg font-semibold">Tell us about your company</h2>
                  <p className="text-sm text-muted-foreground">
                    Public, non-sensitive company facts only. Do not include CUI, credentials, or
                    proprietary technical data in this form.
                  </p>
                </NeuCardHeader>
                <NeuCardContent>
                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Your name *</label>
                        <input required className={input} value={form.name} onChange={set("name")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Work email *</label>
                        <input required type="email" className={input} value={form.email} onChange={set("email")} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Company *</label>
                        <input required className={input} value={form.company} onChange={set("company")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Website</label>
                        <input className={input} placeholder="https://" value={form.website} onChange={set("website")} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">What does your company build?</label>
                      <textarea rows={3} className={input} value={form.builds} onChange={set("builds")}
                        placeholder="Robotics, AI, sensors, software, biotech, manufacturing…" />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Where are you today?</label>
                      <select className={input} value={form.stage} onChange={set("stage")}>
                        <option value="">Select a stage…</option>
                        {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium block mb-1.5">Target agencies (optional)</label>
                        <input className={input} placeholder="Navy, DARPA, DIU…" value={form.targetAgencies} onChange={set("targetAgencies")} />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-1.5">How did you hear about us?</label>
                        <input className={input} value={form.heardFrom} onChange={set("heardFrom")} />
                      </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <NeuButton type="submit" variant="primary" className="w-full py-3 text-base" disabled={state === "sending"}>
                      {state === "sending"
                        ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending…</>
                        : <><Send className="mr-2 h-5 w-5" /> Get started</>}
                    </NeuButton>
                    <p className="text-xs text-muted-foreground text-center">
                      Submitting this creates no obligation on either side and stores only the
                      information above.
                    </p>
                  </form>
                </NeuCardContent>
              </NeuCard>
            )}
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
