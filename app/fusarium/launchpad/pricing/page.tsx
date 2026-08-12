"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, Info } from "lucide-react"
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
  FOUNDING_PASS_CAP,
  type PlanKey,
} from "@/lib/launchpad/catalog"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`

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
  founding_pass_30d: "Founding Launch Pass",
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
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>

        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4">Pricing</NeuBadge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Transparent pricing. Direct third-party costs.</h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Start for less than the monthly cost of many secure collaboration tools. Pay external
                providers directly. Upgrade only when you need deeper opportunity, supply-chain, and
                integration operations. Annual plans are priced at ten months.
              </p>
            </div>

            {/* Founding pass */}
            <NeuCard className="max-w-3xl mx-auto mb-16 border-2 border-primary/30">
              <NeuCardHeader className="text-center pb-2">
                <NeuBadge variant="default" className="mb-2 border-destructive/30 text-destructive mx-auto">
                  First {FOUNDING_PASS_CAP} companies
                </NeuBadge>
                <h2 className="text-2xl font-bold">Founding Launch Pass</h2>
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
                    "Founding member status",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {f}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Does not silently convert to a paid subscription — recurring enrollment requires explicit
                  selection at checkout. Does not include external vendors, certification, legal advice,
                  private advisory, or proposal submission.
                </p>
                <div className="text-center">
                  <Link href="/fusarium/launchpad/founding-50">
                    <NeuButton variant="primary" className="px-6 py-3">
                      Apply for the Founding 50 <ArrowRight className="ml-2 h-4 w-4" />
                    </NeuButton>
                  </Link>
                </div>
              </NeuCardContent>
            </NeuCard>

            {/* Recurring plans */}
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
              {PLAN_COPY.map(({ key, monthly, annual, blurb, highlight }) => {
                const mo = CATALOG.find((p) => p.lookupKey === monthly)!
                const yr = CATALOG.find((p) => p.lookupKey === annual)!
                return (
                  <NeuCard key={key} className={highlight ? "border-2 border-primary/40" : ""}>
                    <NeuCardHeader className="pb-2">
                      {highlight && (
                        <NeuBadge variant="default" className="mb-2 w-fit">Most popular</NeuBadge>
                      )}
                      <h3 className="text-lg font-semibold">{PLAN_NAMES[key]}</h3>
                      <div className="text-3xl font-bold mt-1">
                        {fmt(mo.unitAmount)}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        or {fmt(yr.unitAmount)}/year (two months free)
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{blurb}</p>
                    </NeuCardHeader>
                    <NeuCardContent>
                      <ul className="space-y-2">
                        {planFeatures(key).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                    </NeuCardContent>
                  </NeuCard>
                )
              })}
            </div>

            {/* Credits + advisory */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
              <NeuCard>
                <NeuCardHeader>
                  <h3 className="text-lg font-semibold">AI credit packs</h3>
                  <p className="text-sm text-muted-foreground">
                    Credits abstract model and workflow costs — no raw token accounting. Subscription
                    credits reset monthly; purchased packs last longer.
                  </p>
                </NeuCardHeader>
                <NeuCardContent>
                  <ul className="space-y-3">
                    {credits.map((c) => (
                      <li key={c.lookupKey} className="flex items-center justify-between text-sm">
                        <span>{c.creditQuantity?.toLocaleString()} credits</span>
                        <span className="font-semibold">{fmt(c.unitAmount)}</span>
                      </li>
                    ))}
                  </ul>
                </NeuCardContent>
              </NeuCard>
              <NeuCard>
                <NeuCardHeader>
                  <h3 className="text-lg font-semibold">Private advisory</h3>
                  <p className="text-sm text-muted-foreground">
                    Focused, prepaid sessions with Mycosoft&apos;s founder. Group clinics are included in
                    plans; private time is scheduled and scoped.
                  </p>
                </NeuCardHeader>
                <NeuCardContent>
                  <ul className="space-y-3">
                    {advisory.map((a) => (
                      <li key={a.lookupKey} className="flex items-center justify-between text-sm">
                        <span>{a.advisoryMinutes}-minute session</span>
                        <span className="font-semibold">{fmt(a.unitAmount)}</span>
                      </li>
                    ))}
                  </ul>
                </NeuCardContent>
              </NeuCard>
            </div>

            {/* Direct-cost disclosure */}
            <NeuCard className="max-w-4xl mx-auto">
              <NeuCardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Paid directly to the provider unless separately quoted:
                    </span>{" "}
                    secure enclave and collaboration services, cloud and GovCloud hosting, C3PAO or
                    practitioner assessments, legal, tax, accounting, registered agents, internet and
                    fiber service, networking and security hardware, endpoint software, and e-signature
                    services. Launchpad never buries third-party infrastructure in the entry price.
                  </div>
                </div>
              </NeuCardContent>
            </NeuCard>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
