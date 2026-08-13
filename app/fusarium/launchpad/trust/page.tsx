"use client"

import Link from "next/link"
import { ShieldCheck, CheckCircle2, XCircle, Lock, FileCheck, ArrowRight } from "lucide-react"
import {
  NeuButton,
  NeuCard,
  NeuCardContent,
  NeuCardHeader,
  NeuBadge,
  NeuromorphicProvider,
} from "@/components/ui/neuromorphic"
import { COMMERCIAL_NON_CUI_BANNER, BLOCKED_DATA_CLASSES } from "@/lib/launchpad/constants"

const allowed = [
  "Public company information, UEI and CAGE",
  "Opportunity records from official sources",
  "Readiness states and task statuses",
  "Customer-approved non-CUI policy drafts",
  "Evidence metadata, references, and cryptographic hashes",
  "Customer attestations",
  "Non-CUI BOM and supplier records",
  "Sanitized local technical-check results",
]

const enforcement = [
  ["Persistent workspace banner", "Every authenticated page carries the COMMERCIAL // NON-CUI banner and onboarding requires acknowledgment of the data policy."],
  ["Reference-only evidence design", "The evidence index stores title, owner, date, mapping, version, and hash. There is no content column — nowhere to put a protected file."],
  ["Upload interception and quarantine", "File-type, pattern, and content-risk checks with a quarantine queue and an incident workflow for suspected CUI."],
  ["Prompt firewall", "Restricted fields are stripped before any AI call, and outputs are filtered so no AI response can assert certification or mark a control implemented."],
  ["Per-object sensitivity labels", "Every stored object carries a classification and sensitivity label controlling AI use, export, and sharing."],
  ["Immutable audit trail", "Hash-chained, append-only audit events for every material action, exportable by the customer."],
  ["Tenant isolation", "Row-level security in the database plus tenant checks at the API layer. Tenant identity derives from the authenticated session, never from a request."],
  ["No training on your data", "Tenant data is not used to train models without an explicit, separate opt-in."],
]

const customerOwns = [
  "Deciding what information is CUI, classified, export-controlled, or restricted",
  "The authoritative systems where protected evidence lives",
  "The SSP, self-assessment, SPRS entries, and government representations",
  "Every signature and every submission",
  "Selecting and paying external providers",
]

export default function LaunchpadTrustPage() {
  return (
    <NeuromorphicProvider>
      <div className="launchpad-glass-page min-h-dvh">
        <div className="bg-slate-950 text-center py-1.5 px-4">
          <span className="text-[11px] tracking-widest font-semibold text-emerald-400">
            {COMMERCIAL_NON_CUI_BANNER}
          </span>
        </div>

        <section className="py-20">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <NeuBadge variant="default" className="mb-4">Security Boundary</NeuBadge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Launchpad is designed not to become another uncontrolled copy of your sensitive environment.
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The standard service stores readiness metadata, drafts, links, hashes, and sanitized
                results. Keep CUI, classified information, credentials, raw logs, and authoritative
                evidence in your approved systems.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-14">
              <NeuCard>
                <NeuCardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> What Launchpad stores
                  </h2>
                </NeuCardHeader>
                <NeuCardContent>
                  <ul className="space-y-2.5">
                    {allowed.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {a}
                      </li>
                    ))}
                  </ul>
                </NeuCardContent>
              </NeuCard>
              <NeuCard>
                <NeuCardHeader>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" /> What Launchpad never accepts
                  </h2>
                </NeuCardHeader>
                <NeuCardContent>
                  <ul className="space-y-2.5">
                    {BLOCKED_DATA_CLASSES.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> {b}
                      </li>
                    ))}
                  </ul>
                </NeuCardContent>
              </NeuCard>
            </div>

            <div className="mb-14">
              <div className="text-center mb-10">
                <NeuBadge variant="default" className="mb-4">Enforced in Code</NeuBadge>
                <h2 className="text-3xl font-bold">
                  The boundary is implemented, not just stated in terms
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {enforcement.map(([title, detail]) => (
                  <NeuCard key={title}>
                    <NeuCardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <Lock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{title}</h3>
                          <p className="text-sm text-muted-foreground">{detail}</p>
                        </div>
                      </div>
                    </NeuCardContent>
                  </NeuCard>
                ))}
              </div>
            </div>

            <NeuCard className="mb-14">
              <NeuCardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" /> What the customer always owns
                </h2>
              </NeuCardHeader>
              <NeuCardContent>
                <ul className="space-y-2.5">
                  {customerOwns.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-5">
                  Automated identification of CUI cannot be perfect because CUI depends on source and
                  context. Launchpad enforces policy, warns, blocks obvious patterns, quarantines suspect
                  content, and runs a rapid incident workflow — and the customer remains the decision
                  authority on classification. A future Managed CUI Edition would be a separate product
                  with a separate architecture and contract; it is not a tenant setting.
                </p>
              </NeuCardContent>
            </NeuCard>

            <div className="text-center">
              <Link href="/fusarium/launchpad">
                <NeuButton variant="default" className="px-6 py-3">
                  <ShieldCheck className="mr-2 h-5 w-5" /> Back to Launchpad
                </NeuButton>
              </Link>
              <Link href="/fusarium/launchpad/get-started" className="ml-3">
                <NeuButton variant="primary" className="px-6 py-3">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </NeuButton>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </NeuromorphicProvider>
  )
}
