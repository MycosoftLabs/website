"use client"

import { useState, type ReactNode } from "react"
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
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { AutoplayVideo } from "@/components/ui/autoplay-video"
import { deviceHeroVideoSources } from "@/lib/asset-video-sources"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import { useSupabaseUser } from "@/hooks/use-supabase-user"

// ---------------------------------------------------------------------------
// Hero backdrop. Large media lives on the NAS bind mount under public/assets/
// (gitignored) — the 50 MB master never enters git. `-web` is tried first, the
// full file only if the NAS is missing the smaller variant. The poster is the
// video's own first frame, so the still that paints instantly is continuous
// with the motion that follows.
// Live production URLs (mycosoft.com): /assets/launchpad/launchpad-hero-web.mp4
// and /assets/launchpad/launchpad-hero-poster.jpg
// ---------------------------------------------------------------------------
const LAUNCHPAD_HERO_MP4 = "/assets/launchpad/launchpad-hero.mp4"
const LAUNCHPAD_HERO_POSTER =
  process.env.NEXT_PUBLIC_LAUNCHPAD_HERO_POSTER?.trim() ||
  "/assets/launchpad/launchpad-hero-poster.jpg"
const launchpadHeroSources = deviceHeroVideoSources(LAUNCHPAD_HERO_MP4, {
  envUrl: process.env.NEXT_PUBLIC_LAUNCHPAD_HERO_MP4,
})

/** Why Launchpad commercial — separate from the hero earth footage. */
const LAUNCHPAD_COMMERCIAL_MP4 = "/assets/launchpad/launchpad-commercial.mp4"
const LAUNCHPAD_COMMERCIAL_POSTER = "/assets/launchpad/launchpad-commercial-cover.jpg"

/**
 * Product-walkthrough video for the hero's Demo button. Not filmed yet, so the
 * button is opt-in: point NEXT_PUBLIC_LAUNCHPAD_DEMO_MP4 at the file (or drop
 * the default onto the NAS and set the flag) and the button appears. Until
 * then it stays out of the DOM — a Demo button that opens an empty player is
 * worse than no Demo button.
 */
const LAUNCHPAD_DEMO_MP4 = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_MP4?.trim() || ""
const LAUNCHPAD_DEMO_POSTER = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_POSTER?.trim() || ""
const LAUNCHPAD_DEMO_ENABLED =
  process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_ENABLED === "1" && Boolean(LAUNCHPAD_DEMO_MP4)
const launchpadDemoSources = LAUNCHPAD_DEMO_MP4 ? deviceHeroVideoSources(LAUNCHPAD_DEMO_MP4) : []

// Phthalo / mold icon chips — glass tile + colored tint/icon (not flat solids).
const MOLD = {
  phthalo: { tint: "bg-[#0A4D4A]/50", text: "#2DD4BF", ring: "ring-[#14B8A6]/40" },
  moss: { tint: "bg-[#2F4F3E]/50", text: "#86B89A", ring: "ring-[#6B8F71]/40" },
  teal: { tint: "bg-[#0F5C56]/50", text: "#5EEAD4", ring: "ring-[#0D9488]/40" },
  mold: { tint: "bg-[#1C3A2E]/55", text: "#A7C4A0", ring: "ring-[#4A7C59]/40" },
  deep: { tint: "bg-[#134E4A]/50", text: "#14B8A6", ring: "ring-[#0F766E]/40" },
  slateGreen: { tint: "bg-[#243B35]/55", text: "#7DD3B0", ring: "ring-[#3D6B5A]/40" },
} as const

type MoldTone = keyof typeof MOLD

// The ten Launchpad modules (master plan §4.1).
const modules = [
  {
    name: "ASA Workspace",
    description:
      "Automated Self-Assessment: scope your environment, work the 110 NIST SP 800-171 requirements, and get a deterministic weighted score with POA&M eligibility — never a guess, never an AI verdict.",
    icon: ClipboardCheck,
    tone: "phthalo" as MoldTone,
  },
  {
    name: "Contractor Ops",
    description:
      "The recurring operating layer: SAM renewals, registrations, portal accounts, training calendars, policy reviews, evidence freshness, and a guided weekly founder plan.",
    icon: Building2,
    tone: "moss" as MoldTone,
  },
  {
    name: "Contract Radar",
    description:
      "Centralized ingestion of official opportunity sources, normalized and deduplicated once, then matched to your company profile — with amendment and deadline monitoring.",
    icon: Radar,
    tone: "teal" as MoldTone,
  },
  {
    name: "Proposal Workspace",
    description:
      "Portal-specific checklists, compliance matrices, section ownership, and draft packages. You review, you authorize, you submit — Launchpad never submits for you.",
    icon: FileText,
    tone: "mold" as MoldTone,
  },
  {
    name: "Origin Graph",
    description:
      "BOM origin tracking, supplier evidence, domestic-content estimates under the selected rule pack, and U.S. substitution research for hardware companies.",
    icon: Factory,
    tone: "deep" as MoldTone,
  },
  {
    name: "Resource Graph",
    description:
      "Neutral vendor and resource cards — what it is, when it is actually required, what it costs, what data may go there, and every Mycosoft relationship disclosed.",
    icon: Map,
    tone: "slateGreen" as MoldTone,
  },
  {
    name: "Enclave Bridge",
    description:
      "Metadata-only links to your approved secure workspace. Your enclave stays authoritative; Launchpad stores references, statuses, and hashes — not protected content.",
    icon: Link2,
    tone: "phthalo" as MoldTone,
  },
  {
    name: "Local Assurance Agent",
    description:
      "A customer-installed, read-only checker that turns device posture into sanitized structured results. No remote shell, no credential harvesting, raw data stays local.",
    icon: MonitorCheck,
    tone: "moss" as MoldTone,
  },
  {
    name: "Evidence Index",
    description:
      "Customer-owned evidence references with owners, timestamps, versions, hashes, review states, and retention tracking. Content lives in your systems, not ours.",
    icon: FolderLock,
    tone: "teal" as MoldTone,
  },
  {
    name: "Partner Mesh",
    description:
      "An optional, affirmative path to integrate your technology with the FUSARIUM ecosystem — only after separate consent and a written integration agreement.",
    icon: Network,
    tone: "mold" as MoldTone,
  },
]

interface WhyCard {
  title: string
  icon: typeof Building2
  tone: MoldTone
  pain: ReactNode
  shift: ReactNode
}

// Why a founder should care — high-point claims are bold; titles are short UI labels.
const whyLaunchpad: WhyCard[] = [
  {
    title: "Prime paperwork, small teams",
    icon: Building2,
    tone: "phthalo",
    pain: (
      <>
        AI has collapsed the team size needed to build defense-grade technology. It has{" "}
        <strong className="font-semibold text-foreground/90">not</strong> collapsed the compliance
        surface: a <strong className="font-semibold text-foreground/90">four-person company</strong>{" "}
        answers the same security requirements as a four-hundred-person prime, with the same
        registrations, the same evidence, and the same sourcing rules.
      </>
    ),
    shift: (
      <>
        the work is{" "}
        <strong className="font-semibold text-foreground/90">scoped to the environment you actually run</strong>{" "}
        and sequenced so each step unlocks the next, instead of arriving all at once.
      </>
    ),
  },
  {
    title: "CMMC Level 2, explained",
    icon: ClipboardCheck,
    tone: "moss",
    pain: (
      <>
        If a contract sends you Controlled Unclassified Information — drawings, specs, test data — you
        must assess your own systems against{" "}
        <strong className="font-semibold text-foreground/90">NIST SP 800-171</strong>, a catalogue of{" "}
        <strong className="font-semibold text-foreground/90">110 security requirements</strong>, and
        post the resulting score to{" "}
        <strong className="font-semibold text-foreground/90">SPRS</strong>, the government&apos;s
        supplier risk database. Most Level 2 work is self-assessed; some programs require a third-party
        assessor. Buyers increasingly check that score before award.
      </>
    ),
    shift: (
      <>
        the 110 become a{" "}
        <strong className="font-semibold text-foreground/90">worked register with a live score</strong>,
        using the same arithmetic an assessor uses — where a partial implementation still deducts the
        requirement&apos;s full weight and anything unassessed counts as not met, which is why so many
        first scores come back negative.
      </>
    ),
  },
  {
    title: "Evidence that sticks",
    icon: FolderLock,
    tone: "teal",
    pain: (
      <>
        Claiming a requirement is implemented is easy. Producing the artifact, its owner, its date and
        its hash{" "}
        <strong className="font-semibold text-foreground/90">eighteen months later, under assessment</strong>,
        is where companies fail.
      </>
    ),
    shift: (
      <>
        an evidence index that records the{" "}
        <strong className="font-semibold text-foreground/90">reference, owner and hash</strong> as you
        go — the content stays in your systems.
      </>
    ),
  },
  {
    title: "Opportunities on time",
    icon: Radar,
    tone: "mold",
    pain: (
      <>
        Solicitations sit across scattered official sources, amendments move deadlines quietly, and by
        the time a small team notices a fit there is{" "}
        <strong className="font-semibold text-foreground/90">no runway left</strong> to respond well.
      </>
    ),
    shift: (
      <>
        official sources{" "}
        <strong className="font-semibold text-foreground/90">ingested once, deduplicated, matched</strong>{" "}
        to your profile, and watched for amendments.
      </>
    ),
  },
  {
    title: "Domestic sourcing rules",
    icon: Factory,
    tone: "deep",
    pain: (
      <>
        &ldquo;Made in America&rdquo; is not one rule — it is several, and they stack. The{" "}
        <strong className="font-semibold text-foreground/90">Buy American Act</strong>,{" "}
        <strong className="font-semibold text-foreground/90">Trade Agreements Act</strong>,{" "}
        <strong className="font-semibold text-foreground/90">Berry Amendment</strong>, and{" "}
        <strong className="font-semibold text-foreground/90">Section 889</strong> each bite differently —
        including a camera module inside a subassembly you bought whole.
      </>
    ),
    shift: (
      <>
        your bill of materials is tracked by part origin with{" "}
        <strong className="font-semibold text-foreground/90">domestic-content estimates</strong> under
        the rule pack the contract actually invokes, so a disqualifying part surfaces during design
        rather than during a contract review.
      </>
    ),
  },
  {
    title: "AI drafts. You decide.",
    icon: ShieldCheck,
    tone: "slateGreen",
    pain: (
      <>
        Tooling that lets a model mark controls implemented produces a{" "}
        <strong className="font-semibold text-foreground/90">confident, unfounded posture</strong> — the
        exact thing an assessment is designed to catch.
      </>
    ),
    shift: (
      <>
        AI drafts, organizes and explains;{" "}
        <strong className="font-semibold text-foreground/90">a human marks implementation</strong>, and
        the data model has no way to record otherwise.
      </>
    ),
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

function MoldIconWell({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: typeof Building2
  tone: MoldTone
  size?: "sm" | "md"
}) {
  const t = MOLD[tone]
  const box = size === "sm" ? "h-10 w-10" : "h-11 w-11"
  const iconSize = size === "sm" ? "h-5 w-5" : "h-6 w-6"
  return (
    <div className={`myco-glass-tile ${box} shrink-0 ring-1 ${t.ring} overflow-hidden`}>
      <span className={`absolute inset-0 rounded-[inherit] ${t.tint}`} aria-hidden />
      <Icon className={`${iconSize} relative z-10`} style={{ color: t.text }} aria-hidden />
    </div>
  )
}

function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-[#3D6B5A]/30 bg-[#0F1F1A]/45 backdrop-blur-xl shadow-[0_8px_32px_rgba(8,20,16,0.28),inset_0_1px_0_rgba(167,196,160,0.12)] ${className}`}
    >
      {children}
    </div>
  )
}

export default function LaunchpadPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const { user } = useSupabaseUser()

  return (
    <NeuromorphicProvider>
      {/* No solid page bg — opaque fills cover .lp-media-bg (z-index:-2) and hide the hero video. */}
      <div className="launchpad-glass-page min-h-dvh">
        {/* Hero — match live mycosoft.com structure (lp-media-bg / scrim--strong /
            fade / grid). No commercial non-CUI banner on this marketing page. */}
        <section
          className="relative overflow-hidden py-24 md:py-32 lp-media-band"
          data-over-video
        >
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
              <div className="flex flex-wrap gap-4 justify-center">
                {LAUNCHPAD_DEMO_ENABLED && (
                  <GlassButton onClick={() => setDemoOpen(true)} dataAnalytics="launchpad_demo_open">
                    <PlayCircle className="mr-2 h-5 w-5 shrink-0 text-current" />
                    Demo
                  </GlassButton>
                )}
                {user ? (
                  <GlassButton href="/app/launchpad/dashboard">
                    Open workspace
                    <ArrowRight className="ml-2 h-5 w-5 shrink-0 text-current" />
                  </GlassButton>
                ) : (
                  <GlassButton href="/fusarium/launchpad/checkout">
                    Get started
                    <ArrowRight className="ml-2 h-5 w-5 shrink-0 text-current" />
                  </GlassButton>
                )}
                <GlassButton href="/fusarium/launchpad/pricing">See Pricing</GlassButton>
              </div>
              <div className="mt-8 flex justify-center px-2">
                <GlassPanel className="w-full max-w-xl px-5 py-4 sm:px-6">
                  <p className="text-center text-sm leading-relaxed text-white/85 tracking-wide">
                    Non-CUI by default
                    <span className="mx-2 text-[#6B8F71]/70" aria-hidden>
                      ·
                    </span>
                    Customer-owned signatures and evidence
                    <span className="mx-2 text-[#6B8F71]/70" aria-hidden>
                      ·
                    </span>
                    Official-source tracking
                    <span className="hidden sm:inline mx-2 text-[#6B8F71]/70" aria-hidden>
                      ·
                    </span>
                    <span className="block sm:inline mt-1.5 sm:mt-0">Transparent pricing</span>
                    <span className="mx-2 text-[#6B8F71]/70" aria-hidden>
                      ·
                    </span>
                    Optional expert guidance
                  </p>
                </GlassPanel>
              </div>
            </div>
          </div>
        </section>

        {/* Why Launchpad — no hero still background */}
        <section className="lp-surface py-20 border-t border-border/40">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <GlassChip className="mb-4">Why Launchpad</GlassChip>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
                The technology is no longer the hard part. Becoming buyable is.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                A four-person team with modern tooling can now build something a program office
                genuinely wants. What stops that team is everything around the technology — and most
                of it arrives as acronyms nobody explains: a{" "}
                <strong className="font-semibold text-foreground">CMMC Level 2</strong> self-assessment, an{" "}
                <strong className="font-semibold text-foreground">SPRS</strong> score,{" "}
                <strong className="font-semibold text-foreground">Section 889</strong>, the{" "}
                <strong className="font-semibold text-foreground">Buy American Act</strong>, a{" "}
                <strong className="font-semibold text-foreground">POA&amp;M</strong>. None of it is difficult
                once it is sequenced. All of it is expensive to learn by losing an award. Launchpad is
                the operating layer for that second problem.
              </p>
            </div>

            {/* Commercial — below intro copy, above the six Why cards. Not the hero. */}
            <GlassPanel className="mx-auto mb-12 w-full max-w-3xl overflow-hidden p-3 sm:p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#0A1210] ring-1 ring-[#3D6B5A]/35">
                <video
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster={LAUNCHPAD_COMMERCIAL_POSTER}
                  aria-label="FUSARIUM Launchpad commercial"
                >
                  <source src={LAUNCHPAD_COMMERCIAL_MP4} type="video/mp4" />
                </video>
              </div>
            </GlassPanel>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-12">
              {whyLaunchpad.map((w) => (
                <GlassPanel key={w.title} className="p-5 sm:p-6 flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <MoldIconWell icon={w.icon} tone={w.tone} size="sm" />
                    <h3 className="font-semibold text-base sm:text-lg leading-snug pt-1.5 text-foreground">
                      {w.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed flex-1">{w.pain}</p>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold text-emerald-700 dark:text-[#7DD3B0]">With Launchpad: </span>
                    {w.shift}
                  </p>
                </GlassPanel>
              ))}
            </div>

            <GlassPanel className="max-w-4xl mx-auto p-5 sm:p-6">
              <h3 className="font-semibold mb-3 text-foreground">Where the time actually goes</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Most of the delay between building it and being able to be paid for it is not
                technical work. It is sequencing: knowing which registration unlocks which portal,
                which requirement needs evidence before it can be claimed, and which of the 110 you
                are allowed to defer. Getting that order wrong costs months. Launchpad encodes the
                order.
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {timeSinks.map((t) => (
                  <div key={t} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-[#7DD3B0] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{t}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-5 pt-4 border-t border-border/50 leading-relaxed">
                Launchpad compresses the administration around the work. It does not certify you,
                assess you, or win the award — those stay yours. That honesty is the product: a
                tool willing to claim otherwise would be the thing that fails your assessment.
              </p>
            </GlassPanel>
          </div>
        </section>

        <section className="lp-surface lp-surface--alt py-20">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <GlassChip className="mb-4">The Boundary</GlassChip>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">What Launchpad is — and is not</h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
                You own every representation, self-assessment, SPRS submission, proposal, signature, and
                affirmation. Mycosoft supplies software, templates, workflow, cost-aware AI, and optional
                advisory time.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <GlassPanel className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Launchpad is
                </h3>
                <ul className="space-y-3">
                  {isIsNot.map(([is]) => (
                    <li key={is} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {is}
                    </li>
                  ))}
                </ul>
              </GlassPanel>
              <GlassPanel className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                  <XCircle className="h-5 w-5 text-destructive" /> Launchpad is not
                </h3>
                <ul className="space-y-3">
                  {isIsNot.map(([, isNot]) => (
                    <li key={isNot} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      {isNot}
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </div>
          </div>
        </section>

        <section className="relative py-20 lp-photo-band overflow-hidden">
          <div className="lp-photo-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/launchpad/honest-scoring-bg.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="lp-photo-scrim" aria-hidden="true" />
          <div className="container relative z-10 max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div>
                <GlassChip className="mb-4">Honest Scoring</GlassChip>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white text-balance">
                  &ldquo;96 of 110 controls complete&rdquo; is not a CMMC status.
                </h2>
                <div className="space-y-4 text-base sm:text-lg text-white/70">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ["Implementation count", "How many of 110 requirements you have marked implemented"],
                  ["Weighted score estimate", "110 minus the verified deduction of every gap"],
                  ["Conditional eligibility estimate", "Whether score, POA&M limits, and exclusions line up"],
                  ["Evidence confidence", "Whether your evidence is current, attributed, and consistent"],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                    <div className="text-sm font-semibold text-emerald-400 mb-1.5">{title}</div>
                    <div className="text-sm text-white/60">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lp-surface py-24">
          <div className="container max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <GlassChip className="mb-4">Ten Modules</GlassChip>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">One operating system for the whole journey</h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Compliance is the front door. The durable value is everything that keeps a defense
                contractor organized, discoverable, and bid-ready.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
              {modules.map((m) => (
                <GlassPanel key={m.name} className="p-5 sm:p-6 transition-transform hover:scale-[1.01]">
                  <div className="flex flex-row items-start gap-4">
                    <MoldIconWell icon={m.icon} tone={m.tone} />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{m.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </div>
        </section>

        <section className="relative lp-photo-band py-20 overflow-hidden">
          <div className="lp-photo-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/launchpad/how-it-works-bg.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="lp-photo-scrim" aria-hidden="true" />
          <div className="container relative z-10 max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <GlassChip className="mb-4">How It Works</GlassChip>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
                From technical startup to organized contractor
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {journey.map((j) => (
                <GlassPanel key={j.step} className="p-5 sm:p-6">
                  <div className="text-3xl font-bold text-emerald-600/40 dark:text-emerald-400/40 mb-3">{j.step}</div>
                  <h3 className="font-semibold mb-2 text-foreground">{j.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{j.detail}</p>
                </GlassPanel>
              ))}
            </div>
            <p className="text-center text-sm text-white/70 mt-8 max-w-2xl mx-auto">
              The 14-day sprint is an accelerated operating cadence, not a universal compliance promise.
              Results vary by scope, starting condition, customer effort, and contract requirements.
            </p>
          </div>
        </section>

        <section className="py-20 lp-band">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <div className="myco-glass-tile h-12 w-12 mx-auto mb-6 ring-1 ring-[#14B8A6]/35 overflow-hidden">
              <span className="absolute inset-0 rounded-[inherit] bg-[#0A4D4A]/50" aria-hidden />
              <Lock className="h-6 w-6 relative z-10" style={{ color: "#5EEAD4" }} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white text-balance">
              We designed Launchpad not to want your sensitive data.
            </h2>
            <p className="text-base sm:text-lg text-white/70 max-w-3xl mx-auto mb-8 leading-relaxed">
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

        <section className="lp-surface py-24" id="get-started">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <GlassChip className="mb-4">Start Here</GlassChip>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-balance">
              One guided path from technical startup to defense contractor.
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              The Launch Pass is $397 one time: guided activation, your company baseline, a first
              score and scope snapshot, and the first 30 days of Launchpad Core. Recurring plans are
              optional and explicitly selected — nothing silently converts.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-8">
              External providers — secure enclaves, cloud, assessors, counsel, hardware — remain
              customer-direct purchases, always disclosed and never marked up into the entry price.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <GlassButton href="/fusarium/launchpad/checkout">
                Get started
                <ArrowRight className="ml-2 h-5 w-5 text-current" />
              </GlassButton>
              <GlassButton href="/fusarium/launchpad/pricing">Compare All Plans</GlassButton>
            </div>
          </div>
        </section>

        <section className="lp-surface lp-surface--alt pb-16">
          <div className="container max-w-4xl mx-auto px-4">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              FUSARIUM Launchpad provides software, automation, drafting, evidence organization, and
              guidance. It is not a C3PAO, does not conduct independent assessments, does not provide
              legal advice, does not guarantee awards, funding, eligibility, or clearances, and does not
              submit or sign on your behalf. The customer remains responsible for every representation,
              signature, assessment, submission, and compliance determination. Standard service is
              designed for non-CUI data only. Mycosoft is pursuing CMMC Level 2 — this page does not
              claim CMMC compliance.
            </p>
          </div>
        </section>
      </div>

      {LAUNCHPAD_DEMO_ENABLED && demoOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Launchpad product demo"
        >
          <div className="absolute inset-0 bg-black/80" onClick={() => setDemoOpen(false)} />
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setDemoOpen(false)}
              className="absolute -top-10 right-0 inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 text-sm text-white/80 hover:text-white"
              aria-label="Close demo"
            >
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
