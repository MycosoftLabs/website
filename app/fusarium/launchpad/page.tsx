"use client"

import { useState } from "react"
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
  PlayCircle,
  X,
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
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { deviceHeroVideoSources } from "@/lib/asset-video-sources"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"

// ---------------------------------------------------------------------------
// Hero backdrop. Large media lives on the NAS bind mount under public/assets/
// (gitignored) — the 50 MB master never enters git. `-web` is tried first, the
// full file only if the NAS is missing the smaller variant. The poster is the
// video's own first frame, so the still that paints instantly is continuous
// with the motion that follows.
// ---------------------------------------------------------------------------
const LAUNCHPAD_HERO_MP4 = "/assets/launchpad/launchpad-hero.mp4"
const LAUNCHPAD_HERO_POSTER =
  process.env.NEXT_PUBLIC_LAUNCHPAD_HERO_POSTER?.trim() ||
  "/assets/launchpad/launchpad-hero-poster.jpg"
const launchpadHeroSources = deviceHeroVideoSources(LAUNCHPAD_HERO_MP4, {
  envUrl: process.env.NEXT_PUBLIC_LAUNCHPAD_HERO_MP4,
})

/**
 * Product-walkthrough video for the hero's Demo button. Not filmed yet, so the
 * button is opt-in: point NEXT_PUBLIC_LAUNCHPAD_DEMO_MP4 at the file (or drop
 * the default onto the NAS and set the flag) and the button appears. Until
 * then it stays out of the DOM — a Demo button that opens an empty player is
 * worse than no Demo button.
 */
const LAUNCHPAD_DEMO_MP4 =
  process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_MP4?.trim() || "/assets/launchpad/launchpad-demo.mp4"
const LAUNCHPAD_DEMO_POSTER =
  process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_POSTER?.trim() || "/assets/launchpad/launchpad-demo-poster.jpg"
const LAUNCHPAD_DEMO_ENABLED = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED === "1"
const launchpadDemoSources = deviceHeroVideoSources(LAUNCHPAD_DEMO_MP4)

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

// Why a founder should care — the pain first, then what changes. Kept to
// things Launchpad genuinely does; nothing here promises an award.
const whyLaunchpad = [
  {
    title: "Small teams, prime-sized paperwork",
    icon: Building2,
    pain: "AI has collapsed the team size needed to build defense-grade technology. It has not collapsed the compliance surface: a four-person company answers the same security requirements as a four-hundred-person prime, with the same registrations, the same evidence, and the same sourcing rules.",
    shift: "the work is scoped to the environment you actually run and sequenced so each step unlocks the next, instead of arriving all at once.",
  },
  {
    title: "What CMMC Level 2 actually asks of you",
    icon: ClipboardCheck,
    pain: "If a contract sends you Controlled Unclassified Information — drawings, specs, test data — you must assess your own systems against NIST SP 800-171, a catalogue of 110 security requirements, and post the resulting score to SPRS, the government's supplier risk database. Most Level 2 work is self-assessed; some programs require a third-party assessor. Buyers increasingly check that score before award.",
    shift: "the 110 become a worked register with a live score, using the same arithmetic an assessor uses — where a partial implementation still deducts the requirement's full weight and anything unassessed counts as not met, which is why so many first scores come back negative.",
  },
  {
    title: "Evidence nobody kept",
    icon: FolderLock,
    pain: "Claiming a requirement is implemented is easy. Producing the artifact, its owner, its date and its hash eighteen months later, under assessment, is where companies fail.",
    shift: "an evidence index that records the reference, owner and hash as you go — the content stays in your systems.",
  },
  {
    title: "Opportunities found too late",
    icon: Radar,
    pain: "Solicitations sit across scattered official sources, amendments move deadlines quietly, and by the time a small team notices a fit there is no runway left to respond well.",
    shift: "official sources ingested once, deduplicated, matched to your profile, and watched for amendments.",
  },
  {
    title: "\u201cMade in America\u201d is not one rule",
    icon: Factory,
    pain: "It is several, and they stack. The Buy American Act sets a domestic-content percentage that rises on a published schedule. The Trade Agreements Act permits some countries of origin and bars others. The Berry Amendment restricts certain materials outright. And Section 889 prohibits specific Chinese telecom and video-surveillance brands anywhere in your supply chain — including a camera module inside a subassembly you bought whole.",
    shift: "your bill of materials is tracked by part origin with domestic-content estimates under the rule pack the contract actually invokes, so a disqualifying part surfaces during design rather than during a contract review.",
  },
  {
    title: "AI that drafts, never decides",
    icon: ShieldCheck,
    pain: "Tooling that lets a model mark controls implemented produces a confident, unfounded posture — the exact thing an assessment is designed to catch.",
    shift: "AI drafts, organizes and explains; a human marks implementation, and the data model has no way to record otherwise.",
  },
]

const timeSinks = [
  "Which registration unlocks which portal, and in what order",
  "Which of the 110 security requirements your scope genuinely excludes",
  "What counts as evidence for a given requirement, and who has to own it",
  "Which gaps may sit on a POA&M — a scheduled fix-it plan — and which block an award outright",
  "Which sourcing rule a given solicitation actually invokes, and at what threshold",
  "When SAM, portal accounts and training quietly expire",
  "What a submission package must contain before it is worth writing",
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
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
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
        <section className="relative overflow-hidden py-24 md:py-32 lp-media-band" data-over-video>
          {/* Hero artwork: the ecosystem Launchpad exists to serve — droids,
              vessels, satellites, operators, all on one mesh. Same band
              treatment as the FUSARIUM intelligence-core section, so the
              frosted CTAs read THROUGH to the image in both themes. */}
          <div className="lp-media-bg">
            <AutoplayVideo
              sources={launchpadHeroSources}
              poster={LAUNCHPAD_HERO_POSTER}
              preload="auto"
              pointerEventsNone
              smoothLoop
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="lp-media-scrim lp-media-scrim--strong" aria-hidden="true" />
          {/* Hold the dark ground until past the trust strip, then hand off to
              the page. The copy in this hero is white in both themes, so the
              fade must not reach the light background while text sits on it. */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,transparent_84%,var(--background)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff2_1px,transparent_1px),linear-gradient(to_bottom,#fff2_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.06] pointer-events-none" />
          <div className="container max-w-7xl mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <GlassChip className="mb-4">FUSARIUM LAUNCHPAD</GlassChip>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white text-balance">
                Build the technology. Launchpad helps you build the contractor around it.
              </h1>
              <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8">
                FUSARIUM Launchpad guides small technical companies through federal registrations,
                CMMC self-assessment readiness, evidence, opportunity discovery, proposal operations,
                domestic sourcing, and secure vendor decisions — without pretending software can certify you.
              </p>
              {/* Demo · Get started · See pricing. The demo button is gated on
                  the asset actually existing — until the walkthrough is filmed
                  and dropped on the NAS it stays out of the DOM rather than
                  opening an empty player. Set NEXT_PUBLIC_LAUNCHPAD_DEMO_MP4
                  (or drop the default file) and it appears. */}
              <div className="flex flex-wrap gap-4 justify-center">
                {LAUNCHPAD_DEMO_ENABLED && (
                  <GlassButton onClick={() => setDemoOpen(true)} dataAnalytics="launchpad_demo_open">
                    <PlayCircle className="mr-2 h-5 w-5 shrink-0 text-current" />
                    Demo
                  </GlassButton>
                )}
                <GlassButton href="/fusarium/launchpad/get-started">
                  Get started
                  <ArrowRight className="ml-2 h-5 w-5 shrink-0 text-current" />
                </GlassButton>
                <GlassButton href="/fusarium/launchpad/pricing">See Pricing</GlassButton>
              </div>
              {/* Trust strip (§26.1) */}
              <p className="mt-8 text-sm text-white/60 tracking-wide">
                Non-CUI by default · Customer-owned signatures and evidence · Official-source tracking ·
                Transparent pricing · Optional expert guidance
              </p>
            </div>
          </div>
        </section>

        {/* ================= WHY THIS EXISTS =================
            The module list says WHAT Launchpad does. This says why a founder
            should care, in the terms they actually feel: the gap between
            building something the DoD wants and being an entity the DoD is
            allowed to buy from. */}
        <section className="py-20 border-t border-border/40">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <GlassChip className="mb-4">Why Launchpad</GlassChip>
              <h2 className="text-4xl font-bold mb-4 text-balance">
                The technology is no longer the hard part. Becoming buyable is.
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                A four-person team with modern tooling can now build something a program office
                genuinely wants. What stops that team is everything around the technology — and most
                of it arrives as acronyms nobody explains: a CMMC Level 2 self-assessment, an SPRS
                score, Section 889, the Buy American Act, a POA&amp;M. None of it is difficult once it
                is sequenced. All of it is expensive to learn by losing an award. Launchpad is the
                operating layer for that second problem, and it says what each term means as you
                meet it.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-12">
              {whyLaunchpad.map((w) => (
                <NeuCard key={w.title}>
                  <NeuCardHeader className="pb-2">
                    <div className="flex items-center gap-2.5">
                      <w.icon className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-semibold">{w.title}</h3>
                    </div>
                  </NeuCardHeader>
                  <NeuCardContent>
                    <p className="text-sm text-muted-foreground mb-3">{w.pain}</p>
                    <p className="text-sm">
                      <span className="font-medium text-primary">With Launchpad: </span>
                      {w.shift}
                    </p>
                  </NeuCardContent>
                </NeuCard>
              ))}
            </div>

            <NeuCard className="max-w-4xl mx-auto">
              <NeuCardContent className="pt-6">
                <h3 className="font-semibold mb-3">Where the time actually goes</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Most of the delay between building it and being able to be paid for it is not
                  technical work. It is sequencing: knowing which registration unlocks which portal,
                  which requirement needs evidence before it can be claimed, and which of the 110 you
                  are allowed to defer. Getting that order wrong costs months. Launchpad encodes the
                  order.
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {timeSinks.map((t) => (
                    <div key={t} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{t}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border/50">
                  Launchpad compresses the administration around the work. It does not certify you,
                  assess you, or win the award — those stay yours. That honesty is the product: a
                  tool willing to claim otherwise would be the thing that fails your assessment.
                </p>
              </NeuCardContent>
            </NeuCard>
          </div>
        </section>

        {/* The honest positioning — is / is not (§1.3) */}
        <section className="py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <GlassChip className="mb-4">The Boundary</GlassChip>
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
        <section className="py-20 lp-band">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <GlassChip className="mb-4">Honest Scoring</GlassChip>
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
              <GlassChip className="mb-4">Ten Modules</GlassChip>
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
                    <div className="myco-glass-tile p-3">
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
              <GlassChip className="mb-4">How It Works</GlassChip>
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
        <section className="py-20 lp-band">
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
            <GlassButton href="/fusarium/launchpad/trust">
              <ShieldCheck className="mr-2 h-5 w-5 text-current" />
              Read the Security Boundary
            </GlassButton>
          </div>
        </section>

        {/* Entry CTA */}
        <section className="py-24" id="get-started">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <GlassChip className="mb-4">Start Here</GlassChip>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
              One guided path from technical startup to defense contractor.
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              The Launch Pass is $397 one time: guided activation, your company baseline, a first
              score and scope snapshot, and the first 30 days of Launchpad Core. Recurring plans are
              optional and explicitly selected — nothing silently converts.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-8">
              External providers — secure enclaves, cloud, assessors, counsel, hardware — remain
              customer-direct purchases, always disclosed and never marked up into the entry price.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <GlassButton href="/fusarium/launchpad/get-started">
                Get started
                <ArrowRight className="ml-2 h-5 w-5 text-current" />
              </GlassButton>
              <GlassButton href="/fusarium/launchpad/pricing">Compare All Plans</GlassButton>
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

        {/* Demo player — mounted only when the asset is configured. */}
        {LAUNCHPAD_DEMO_ENABLED && demoOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            role="dialog" aria-modal="true" aria-label="Launchpad product demo">
            <div className="absolute inset-0 bg-black/80" onClick={() => setDemoOpen(false)} />
            <div className="relative w-full max-w-4xl">
              <button onClick={() => setDemoOpen(false)}
                className="absolute -top-10 right-0 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
                aria-label="Close demo">
                <X className="h-4 w-4" /> Close
              </button>
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl">
                <AutoplayVideo
                  sources={launchpadDemoSources}
                  poster={LAUNCHPAD_DEMO_POSTER}
                  preload="auto"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        )}
    </NeuromorphicProvider>
  )
}
