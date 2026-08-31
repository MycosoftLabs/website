"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarClock, CheckCircle2, Coins, Wallet } from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import {
  CATALOG,
  PLAN_ENTITLEMENTS,
  type PlanKey,
} from "@/lib/launchpad/catalog"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"

const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`

/** Third-party costs a customer pays their own providers, itemized so the
 *  total cost of becoming contract-ready is legible before anyone signs up. */
const DIRECT_COSTS = [
  "Secure enclave and collaboration services",
  "Cloud and GovCloud hosting",
  "C3PAO or practitioner assessments",
  "Legal, tax, and accounting",
  "Registered agent services",
  "Internet and fiber service",
  "Networking and security hardware",
  "Endpoint and security software",
  "E-signature services",
] as const

// Presentation order + descriptions for the four recurring plans.
const PLAN_COPY: Array<{ key: PlanKey; monthly: string; annual: string; blurb: string; highlight?: boolean }> = [
  {
    key: "core", monthly: "fus_launchpad_core_monthly", annual: "fus_launchpad_core_annual",
    blurb: "For 1–3 person companies becoming administratively and cybersecurity ready.",
  },
  {
    key: "contractor_ops", monthly: "fus_launchpad_ops_monthly", annual: "fus_launchpad_ops_annual",
    blurb: "For active bidders needing continuous discovery and recurring operations.", highlight: true,
  },
  {
    key: "origin_graph", monthly: "fus_launchpad_origin_monthly", annual: "fus_launchpad_origin_annual",
    blurb: "For hardware companies with domestic-source and supplier complexity.",
  },
  {
    key: "partner_mesh_pro", monthly: "fus_launchpad_partner_monthly", annual: "fus_launchpad_partner_annual",
    blurb: "For companies integrating technology or collaborating through FUSARIUM.",
  },
]

const PLAN_NAMES: Record<PlanKey, string> = {
  launch_pass_30d: "Launch Pass",
  core: "Launchpad Core",
  contractor_ops: "Contractor Ops",
  origin_graph: "Ops + Origin Graph",
  partner_mesh_pro: "Partner Mesh Pro",
}

function planFeatures(key: PlanKey): string[] {
  const e = PLAN_ENTITLEMENTS[key]
  const f = [
    `${e.users} users`,
    `${e.aiCreditsMonthly} AI credits / month`,
    `${e.contractRadarFrequency === "daily" ? "Daily" : "Weekly"} Contract Radar matching`,
    `${e.activeOpportunityWatches} active opportunity watches`,
  ]
  if (e.proposalWorkspaces > 0) f.push(`${e.proposalWorkspaces} proposal workspaces`)
  if (e.localAgentDevices > 0) f.push(`Local Assurance Agent — ${e.localAgentDevices} devices`)
  if (e.enclaveBridge) f.push("Enclave Bridge metadata connections")
  if (e.originGraph) f.push(`Origin Graph — ${e.bomLineLimit.toLocaleString()} BOM lines`)
  if (e.partnerMesh) f.push("Partner Mesh profile + sandbox")
  if (e.apiAccess) f.push("API access")
  return f
}

const credits = CATALOG.filter((p) => p.kind === "credits")
const advisory = CATALOG.filter((p) => p.kind === "advisory")

export default function LaunchpadPricingPage() {
  // Billing period drives every displayed price AND the checkout link, so what
  // a visitor sees is what they are charged.
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const [selected, setSelected] = useState<PlanKey | null>(null)

  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>

        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <GlassChip className="mb-4">Pricing</GlassChip>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Transparent pricing. Direct third-party costs.</h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Start for less than the monthly cost of many secure collaboration tools. Pay external
                providers directly. Upgrade only when you need deeper opportunity, supply-chain, and
                integration operations. Annual plans are priced at ten months.
              </p>
            </div>

            {/* Launch Pass */}
            <NeuCard className="max-w-3xl mx-auto mb-16 border-2 border-primary/30">
              <NeuCardHeader className="text-center pb-2 flex-col items-center gap-1">
                <GlassChip className="mb-2 mx-auto">Start here</GlassChip>
                <h2 className="text-2xl font-bold">Launch Pass</h2>
                <div className="text-4xl font-bold mt-2">
                  {fmt(39700)} <span className="text-base font-normal text-muted-foreground">one time</span>
                </div>
              </NeuCardHeader>
              <NeuCardContent>
                <div className="grid sm:grid-cols-2 gap-2 mb-6">
                  {[
                    "Guided onboarding and tenant activation",
                    "Company profile setup",
                    "Baseline readiness snapshot",
                    "Initial opportunity profile",
                    "Core templates and workflows",
                    "First 30 days of Launchpad Core",
                    "One group onboarding clinic",
                    "Direct line to the Launchpad team",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Does not silently convert to a paid subscription — recurring enrollment requires explicit
                  selection at checkout. Does not include external vendors, certification, legal advice,
                  private advisory, or proposal submission.
                </p>
                <div className="text-center">
                  <GlassButton href="/fusarium/launchpad/checkout">
                    Get started <ArrowRight className="ml-2 h-4 w-4 text-current" />
                  </GlassButton>
                </div>
              </NeuCardContent>
            </NeuCard>

            {/* Billing period — one control for all four plans, so the prices
                below always agree with what checkout will charge. */}
            <div className="flex justify-center mb-8">
              <div
                className="myco-glass-surface inline-flex items-center gap-1 rounded-full border border-border/70 p-1"
                role="radiogroup"
                aria-label="Billing period"
              >
                {(["monthly", "annual"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    role="radio"
                    aria-checked={billing === period}
                    onClick={() => setBilling(period)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      billing === period
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {period === "monthly" ? "Monthly" : "Annual"}
                    {period === "annual" && (
                      <span className={billing === "annual" ? "text-white/80 ml-1.5" : "text-emerald-600 dark:text-emerald-400 ml-1.5"}>
                        2 months free
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Recurring plans — selectable. Choosing one carries the plan AND
                the billing period through to checkout, so nobody picks the
                $999 tier and lands on a $397 page. */}
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16 items-stretch">
              {PLAN_COPY.map(({ key, monthly, annual, blurb, highlight }) => {
                const mo = CATALOG.find((p) => p.lookupKey === monthly)!
                const yr = CATALOG.find((p) => p.lookupKey === annual)!
                const active = billing === "annual" ? yr : mo
                const isSelected = selected === key
                return (
                  <NeuCard
                    key={key}
                    onClick={() => setSelected(key)}
                    // h-full + column so every card's CTA lands on the same
                    // baseline regardless of how many features it lists.
                    className={`cursor-pointer transition-shadow h-full flex flex-col ${
                      isSelected
                        ? "ring-2 ring-emerald-500 border-2 border-emerald-500/50"
                        : highlight
                          ? "border-2 border-primary/40"
                          : ""
                    }`}
                  >
                    <NeuCardHeader className="pb-2 flex-col items-start gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSelected && <GlassChip className="w-fit">Selected</GlassChip>}
                        {highlight && !isSelected && <GlassChip className="w-fit">Most popular</GlassChip>}
                      </div>
                      <h3 className="text-lg font-semibold mt-1">{PLAN_NAMES[key]}</h3>
                      <div className="text-3xl font-bold mt-1 tabular-nums">
                        {fmt(active.unitAmount)}
                        <span className="text-sm font-normal text-muted-foreground">
                          {billing === "annual" ? "/year" : "/month"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {billing === "annual"
                          ? `${fmt(Math.round(yr.unitAmount / 12))}/month billed annually`
                          : `or ${fmt(yr.unitAmount)}/year — two months free`}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 text-balance">{blurb}</p>
                    </NeuCardHeader>
                    <NeuCardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2">
                        {planFeatures(key).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                      {/* mt-auto pushes every CTA to the card floor. */}
                      <div className="mt-auto pt-5">
                        <GlassButton
                          href={`/fusarium/launchpad/checkout?plan=${key}&billing=${billing}`}
                          className="myco-glass-button--block"
                        >
                          Choose {PLAN_NAMES[key]}
                          <ArrowRight className="ml-2 h-4 w-4 text-current" />
                        </GlassButton>
                      </div>
                    </NeuCardContent>
                  </NeuCard>
                )
              })}
            </div>

            {/* Credits + advisory — add-ons, bought as needed, never bundled
                into the entry price. Each row carries its own unit economics so
                the value is legible without doing arithmetic. */}
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-14 items-start">
              <div className="myco-glass-surface rounded-2xl border border-border/70 p-6 sm:p-7 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="myco-glass-tile h-11 w-11 shrink-0">
                    <Coins className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-tight">AI credit packs</h3>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      One-time · never expires
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Credits abstract model and workflow costs, so you are never doing raw token
                  accounting. Your plan&apos;s monthly credits reset each cycle; purchased packs sit
                  on top and carry over.
                </p>

                <ul className="border-t border-border/60">
                  {credits.map((c) => {
                    const per = c.creditQuantity ? c.unitAmount / c.creditQuantity : null
                    return (
                      <li key={c.lookupKey} className="border-b border-border/60">
                        <Link
                          href={`/fusarium/launchpad/checkout?item=${c.lookupKey}`}
                          className="group flex items-baseline justify-between gap-4 py-3.5 -mx-2 px-2 rounded-lg hover:bg-emerald-500/5 transition-colors"
                        >
                        <div className="min-w-0">
                          <div className="text-sm font-medium tabular-nums group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {c.creditQuantity?.toLocaleString()} credits
                          </div>
                          {per !== null && (
                            // `per` is CENTS per credit (unitAmount is cents).
                            // Render as dollars — 2000¢ / 100 credits is $0.20,
                            // not 0.20¢.
                            <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                              ${(per / 100).toFixed(2)} per credit
                            </div>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 shrink-0">
                          <span className="text-base font-semibold tabular-nums">{fmt(c.unitAmount)}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                <p className="text-xs text-muted-foreground leading-relaxed mt-5 pt-4 border-t border-border/60">
                  Bringing your own AI provider key costs zero credits — on every plan, including
                  the entry tier.
                </p>

                <div className="mt-5 pt-1 flex-1 flex items-end">
                  <GlassButton href="/fusarium/launchpad/checkout" className="myco-glass-button--block">
                    Get started <ArrowRight className="h-4 w-4 text-current ml-2" />
                  </GlassButton>
                </div>
              </div>

              <div className="myco-glass-surface rounded-2xl border border-border/70 p-6 sm:p-7 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="myco-glass-tile h-11 w-11 shrink-0">
                    <CalendarClock className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-tight">Private advisory</h3>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      Prepaid · scheduled
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Focused sessions with Mycosoft&apos;s founder, booked against your own calendar.
                  Group clinics are already included in your plan; this is private, scoped time.
                </p>

                <ul className="border-t border-border/60">
                  {advisory.map((a) => {
                    const perHour = a.advisoryMinutes
                      ? (a.unitAmount / 100) * (60 / a.advisoryMinutes)
                      : null
                    return (
                      <li key={a.lookupKey} className="border-b border-border/60">
                        <Link
                          href={`/fusarium/launchpad/checkout?item=${a.lookupKey}`}
                          className="group flex items-baseline justify-between gap-4 py-3.5 -mx-2 px-2 rounded-lg hover:bg-emerald-500/5 transition-colors"
                        >
                        <div className="min-w-0">
                          <div className="text-sm font-medium tabular-nums group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {a.advisoryMinutes} minutes
                          </div>
                          {perHour !== null && (
                            <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                              ${Math.round(perHour)} per hour equivalent
                            </div>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 shrink-0">
                          <span className="text-base font-semibold tabular-nums">{fmt(a.unitAmount)}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                <p className="text-xs text-muted-foreground leading-relaxed mt-5 pt-4 border-t border-border/60">
                  Guidance and working sessions — not legal, accounting, or assessment services, and
                  never a compliance determination.
                </p>

                <div className="mt-5 pt-1 flex-1 flex items-end">
                  {/* Names the SKU. Bare /checkout falls back to the $397 Launch
                      Pass when no item is given, so this button was opening a
                      payment page for a completely different product. */}
                  <GlassButton href="/fusarium/launchpad/checkout?item=fus_launchpad_advisory_30" className="myco-glass-button--block">
                    Book a 30-minute session <ArrowRight className="h-4 w-4 text-current ml-2" />
                  </GlassButton>
                </div>
              </div>
            </div>

            {/* Direct-cost disclosure — the honest "what else will this cost me"
                answer, itemized rather than buried in a paragraph. */}
            <div className="myco-glass-surface rounded-2xl border border-border/70 p-6 sm:p-8 max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="myco-glass-tile h-11 w-11 shrink-0">
                  <Wallet className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight">
                    What you pay third parties directly
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Launchpad never buries third-party infrastructure in the entry price. These are
                    billed by their own providers, at their own rates, unless separately quoted:
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2.5 mt-6 pt-6 border-t border-border/60">
                {DIRECT_COSTS.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-[0.45rem] h-1 w-1 rounded-full bg-emerald-500/70 shrink-0" />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed mt-6 pt-4 border-t border-border/60">
                You choose every one of these vendors yourself. Nothing here is a Mycosoft resale, and
                no listing implies endorsement or that a given provider satisfies a requirement.
              </p>
            </div>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
