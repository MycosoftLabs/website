"use client"

import Link from "next/link"
import {
  ArrowRight,
  ClipboardCheck,
  Radar,
  FileText,
  Factory,
  Map,
  Link2,
  MonitorCheck,
  FolderLock,
  Network,
  Building2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { COMMERCIAL_NON_CUI_BANNER } from "@/lib/launchpad/constants"

// The ten Launchpad modules (master plan §4.1).
const modules = [
  {
    name: "ASA Workspace",
    description:
      "Automated Self-Assessment: scope your environment, work the 110 NIST SP 800-171 requirements, and get a deterministic weighted score with POA&M eligibility — never a guess, never an AI verdict.",
    icon: ClipboardCheck,
  },
  {
    name: "Contractor Ops",
    description:
      "The recurring operating layer: SAM renewals, registrations, portal accounts, training calendars, policy reviews, evidence freshness, and a guided weekly founder plan.",
    icon: Building2,
  },
  {
    name: "Contract Radar",
    description:
      "Centralized ingestion of official opportunity sources, normalized and deduplicated once, then matched to your company profile — with amendment and deadline monitoring.",
    icon: Radar,
  },
  {
    name: "Proposal Workspace",
    description:
      "Portal-specific checklists, compliance matrices, section ownership, and draft packages. You review, you authorize, you submit — Launchpad never submits for you.",
    icon: FileText,
  },
  {
    name: "Origin Graph",
    description:
      "BOM origin tracking, supplier evidence, domestic-content estimates under the selected rule pack, and U.S. substitution research for hardware companies.",
    icon: Factory,
  },
  {
    name: "Resource Graph",
    description:
      "Neutral vendor and resource cards — what it is, when it is actually required, what it costs, what data may go there, and every Mycosoft relationship disclosed.",
    icon: Map,
  },
  {
    name: "Enclave Bridge",
    description:
      "Metadata-only links to your approved secure workspace. Your enclave stays authoritative; Launchpad stores references, statuses, and hashes — not protected content.",
    icon: Link2,
  },
  {
    name: "Local Assurance Agent",
    description:
      "A customer-installed, read-only checker that turns device posture into sanitized structured results. No remote shell, no credential harvesting, raw data stays local.",
    icon: MonitorCheck,
  },
  {
    name: "Evidence Index",
    description:
      "Customer-owned evidence references with owners, timestamps, versions, hashes, review states, and retention tracking. Content lives in your systems, not ours.",
    icon: FolderLock,
  },
  {
    name: "Partner Mesh",
    description:
      "An optional, affirmative path to integrate your technology with the FUSARIUM ecosystem — only after separate consent and a written integration agreement.",
    icon: Network,
  },
]

const isIsNot: Array<[string, string]> = [
  ["A readiness workflow and evidence-indexing platform", "A C3PAO or independent certification body"],
  ["A customer-owned self-assessment workspace", "A guarantee of CMMC status or a government finding"],
  ["A contract and grant discovery engine", "A guarantee of eligibility, award, funding, or selection"],
  ["A local-first technical checking system", "A remote administrator with unrestricted credentials"],
  ["An AI operator that drafts and organizes", "An autonomous signer or submitter of binding representations"],
  ["A system of record for non-CUI readiness metadata", "A repository for CUI, classified data, or customer secrets"],
]

const journey = [
  { step: "1", title: "Free Readiness Snapshot", detail: "10–15 minutes. Maturity stage, critical blockers, likely registration sequence, and your top five next actions." },
  { step: "2", title: "Guided activation", detail: "Create your workspace, accept the non-CUI data policy, complete the company baseline, pick a readiness track." },
  { step: "3", title: "14-day readiness sprint", detail: "Scope, identity baseline, inventories, policies, evidence index, score review, and a customer-owned affirmation workflow." },
  { step: "4", title: "Ongoing operations", detail: "Contract Radar matches, renewal reminders, evidence freshness, proposal workspaces, and optional expert guidance." },
]

export default function LaunchpadPage() {
  return (
    <NeuromorphicProvider>
      <div className="min-h-dvh">
        {/* Boundary strip — always visible, before anything else */}
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
          <span className="text-[11px] text-slate-400 ml-3 hidden sm:inline">
            Standard service stores readiness metadata, drafts, links, and hashes — never CUI, credentials, or raw logs.
          </span>
        </div>

        {/* Hero (copy: master plan §26.1) */}
        <section className="relative overflow-hidden py-24 md:py-32" data-over-video>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-background" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff2_1px,transparent_1px),linear-gradient(to_bottom,#fff2_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.06] pointer-events-none" />
          <div className="container max-w-7xl mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-400">
                FUSARIUM LAUNCHPAD
              </NeuBadge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white text-balance">
                Build the technology. Launchpad helps you build the contractor around it.
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8">
                FUSARIUM Launchpad guides small technical companies through federal registrations,
                CMMC self-assessment readiness, evidence, opportunity discovery, proposal operations,
                domestic sourcing, and secure vendor decisions — without pretending software can certify you.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/fusarium/launchpad/founding-50">
                  <NeuButton variant="primary" className="text-base px-6 py-3">
                    Apply for the Founding 50
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </NeuButton>
                </Link>
                <Link href="/fusarium/launchpad/pricing">
                  <NeuButton variant="default" className="text-base px-6 py-3">
                    See Pricing
                  </NeuButton>
                </Link>
              </div>
              {/* Trust strip (§26.1) */}
              <p className="mt-8 text-sm text-white/60 tracking-wide">
                Non-CUI by default · Customer-owned signatures and evidence · Official-source tracking ·
                Transparent pricing · Optional expert guidance
              </p>
            </div>
          </div>
        </section>

        {/* The honest positioning — is / is not (§1.3) */}
        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <NeuBadge variant="default" className="mb-4">The Boundary</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">What Launchpad is — and is not</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                You own every representation, self-assessment, SPRS submission, proposal, signature, and
                affirmation. Mycosoft supplies software, templates, workflow, cost-aware AI, and optional
                advisory time.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <NeuCard>
                <NeuCardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Launchpad is
                  </h3>
                </NeuCardHeader>
                <NeuCardContent>
                  <ul className="space-y-3">
                    {isIsNot.map(([is]) => (
                      <li key={is} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        {is}
                      </li>
                    ))}
                  </ul>
                </NeuCardContent>
              </NeuCard>
              <NeuCard>
                <NeuCardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" /> Launchpad is not
                  </h3>
                </NeuCardHeader>
                <NeuCardContent>
                  <ul className="space-y-3">
                    {isIsNot.map(([, isNot]) => (
                      <li key={isNot} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        {isNot}
                      </li>
                    ))}
                  </ul>
                </NeuCardContent>
              </NeuCard>
            </div>
          </div>
        </section>

        {/* Why a count is not a status (§2.2) — the product's core honesty pitch */}
        <section className="py-20 bg-slate-950 text-white">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <NeuBadge variant="default" className="mb-4 border-emerald-500/40 text-emerald-400">
                  Honest Scoring
                </NeuBadge>
                <h2 className="text-4xl font-bold mb-6 text-white">
                  &ldquo;96 of 110 controls complete&rdquo; is not a CMMC status.
                </h2>
                <div className="space-y-4 text-lg text-white/70">
                  <p>
                    Level 2 requirements carry 1-, 3-, or 5-point deductions under the DoD scoring
                    methodology. Conditional status depends on the weighted score, POA&amp;M eligibility,
                    excluded requirements, and 180-day closeout rules — not a progress ring.
                  </p>
                  <p>
                    Launchpad shows four independent indicators so a founder can never mistake activity
                    for status. Every score comes from a deterministic, test-vectored engine with a full
                    calculation trace. No AI ever marks a control implemented.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Implementation count", "How many of 110 requirements you have marked implemented"],
                  ["Weighted score estimate", "110 minus the verified deduction of every gap"],
                  ["Conditional eligibility estimate", "Whether score, POA&M limits, and exclusions line up"],
                  ["Evidence confidence", "Whether your evidence is current, attributed, and consistent"],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className="text-sm font-semibold text-emerald-400 mb-1.5">{title}</div>
                    <div className="text-sm text-white/60">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section className="py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <NeuBadge variant="default" className="mb-4">Ten Modules</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">One operating system for the whole journey</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Compliance is the front door. The durable value is everything that keeps a defense
                contractor organized, discoverable, and bid-ready.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {modules.map((m) => (
                <NeuCard key={m.name} className="transition-all hover:scale-[1.01]">
                  <NeuCardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <m.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{m.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                    </div>
                  </NeuCardHeader>
                </NeuCard>
              ))}
            </div>
          </div>
        </section>

        {/* Journey */}
        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <NeuBadge variant="default" className="mb-4">How It Works</NeuBadge>
              <h2 className="text-4xl font-bold mb-4">From technical startup to organized contractor</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {journey.map((j) => (
                <NeuCard key={j.step}>
                  <NeuCardContent className="pt-6">
                    <div className="text-3xl font-bold text-primary/40 mb-3">{j.step}</div>
                    <h3 className="font-semibold mb-2">{j.title}</h3>
                    <p className="text-sm text-muted-foreground">{j.detail}</p>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
              The 14-day sprint is an accelerated operating cadence, not a universal compliance promise.
              Results vary by scope, starting condition, customer effort, and contract requirements.
            </p>
          </div>
        </section>

        {/* Security boundary teaser */}
        <section className="py-20 bg-slate-950 text-white">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <Lock className="h-10 w-10 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              We designed Launchpad not to want your sensitive data.
            </h2>
            <p className="text-lg text-white/70 max-w-3xl mx-auto mb-8">
              The standard service stores readiness metadata, drafts, links, hashes, and sanitized
              results. Keep CUI, classified information, credentials, raw logs, and authoritative
              evidence in your approved systems. That boundary is enforced in code — banners, upload
              interception, prompt firewalls, and per-object sensitivity labels — not just stated in terms.
            </p>
            <Link href="/fusarium/launchpad/trust">
              <NeuButton variant="default" className="text-base px-6 py-3">
                <ShieldCheck className="mr-2 h-5 w-5" />
                Read the Security Boundary
              </NeuButton>
            </Link>
          </div>
        </section>

        {/* Founding 50 CTA */}
        <section className="py-24" id="founding-50">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <NeuBadge variant="default" className="mb-4 border-destructive/30 text-destructive">
              Limited Cohort
            </NeuBadge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
              Fifty technical startups. One guided path into defense contracting.
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              The Founding Launch Pass is $397 one time: guided activation, your company baseline, a
              first score and scope snapshot, and the first 30 days of Launchpad Core. Recurring plans
              are optional and explicitly selected — nothing silently converts.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-8">
              External providers — secure enclaves, cloud, assessors, counsel, hardware — remain
              customer-direct purchases, always disclosed and never marked up into the entry price.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/fusarium/launchpad/founding-50">
                <NeuButton variant="primary" className="text-base px-6 py-3">
                  Apply for the Founding 50
                  <ArrowRight className="ml-2 h-5 w-5" />
                </NeuButton>
              </Link>
              <Link href="/fusarium/launchpad/pricing">
                <NeuButton variant="default" className="text-base px-6 py-3">
                  Compare All Plans
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer disclaimers */}
        <section className="pb-16">
          <div className="container max-w-4xl mx-auto px-4">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              FUSARIUM Launchpad provides software, automation, drafting, evidence organization, and
              guidance. It is not a C3PAO, does not conduct independent assessments, does not provide
              legal advice, does not guarantee awards, funding, eligibility, or clearances, and does not
              submit or sign on your behalf. The customer remains responsible for every representation,
              signature, assessment, submission, and compliance determination. Standard service is
              designed for non-CUI data only.
            </p>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
