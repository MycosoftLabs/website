import type { Metadata } from "next"
import Link from "next/link"
import { postureSummary, resolvePublicMode, POSTURE_OVERLAY } from "@/lib/security/posture/nist-800-171-posture"

export const metadata: Metadata = {
  title: "Trust Center | Mycosoft",
  description:
    "Mycosoft Trust Center — federal contracting registrations, CMMC Level 2 / NIST SP 800-171 self-assessment status, and supply-chain security for U.S. government and defense programs.",
}

export const dynamic = "force-dynamic"

export default function TrustCenterPage() {
  const mode = resolvePublicMode() // 'hidden' | 'in_progress' | 'posted'
  const posted = mode === "posted"
  // Public view always summarizes the CURRENT (honest) posture; the projected
  // target is never published as achieved.
  const cur = postureSummary("current")
  const tgt = postureSummary("target")
  const targetDate = POSTURE_OVERLAY.sprint.target_sprs_submission_date

  return (
    <div className="container py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🛡️</span>
          <h1 className="text-4xl font-bold">Trust Center</h1>
        </div>
        <p className="text-xl text-muted-foreground mb-8">
          Mycosoft builds Earth Intelligence hardware, software, and AI for government, defense, and
          critical-infrastructure customers. This page summarizes our security posture, certifications, and
          federal registrations.
        </p>

        {/* Status banner — honest about where we are */}
        {!posted && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 mb-8 text-sm">
            <strong>CMMC Level 2 self-assessment in progress.</strong> Mycosoft is completing a NIST SP 800-171 Rev. 2
            self-assessment across all 110 security requirements, targeting SPRS submission by{" "}
            <strong>{targetDate}</strong> and a C3PAO certification assessment in{" "}
            {POSTURE_OVERLAY.sprint.c3pao_assessment_target.replace(/_/g, " ")}. Numeric scores are published once
            posted to SPRS.
          </div>
        )}

        {/* Posture cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border p-5">
            <div className="text-sm text-muted-foreground">Framework</div>
            <div className="text-2xl font-bold mt-1">CMMC L2</div>
            <div className="text-sm text-muted-foreground mt-1">NIST SP 800-171 Rev. 2 · 110 requirements</div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="text-sm text-muted-foreground">Assessment Status</div>
            <div className="text-2xl font-bold mt-1">{posted ? "Posted" : "In progress"}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {posted ? `Self-assessment on file` : `Target completion ${targetDate}`}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="text-sm text-muted-foreground">SPRS Score</div>
            <div className="text-2xl font-bold mt-1">
              {posted ? `+${cur.sprsScore}` : "Pending"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {posted ? `of ${cur.maxScore} maximum` : `published after submission`}
            </div>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <h2 className="text-2xl font-bold mt-4 mb-4">Federal Contracting Entity</h2>
          <p>
            Mycosoft, LLC — a California operating subsidiary of Mycosoft, Inc. (a Delaware C-Corporation) — is the
            federal contracting entity and an active, SAM.gov-registered supplier eligible for U.S. federal
            contracting.
          </p>
          <ul>
            <li>
              <strong>UEI:</strong> <span className="font-mono">YK3ARVKJ77S9</span>
            </li>
            <li>
              <strong>CAGE Code:</strong> <span className="font-mono">9KR60</span>
            </li>
            <li>
              <strong>Registration:</strong> Active in SAM.gov (System for Award Management)
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">CMMC &amp; NIST SP 800-171</h2>
          <p>
            Mycosoft maintains a System Security Plan (SSP) and Plan of Action &amp; Milestones (POA&amp;M) covering
            all 110 NIST SP 800-171 Rev. 2 security requirements, which map one-to-one to the CMMC Level 2 practices.
            We are completing a self-assessment and remediation of these controls; progress is tracked on the POA&amp;M
            with owners and target close dates.
          </p>
          <ul>
            <li>
              <strong>DFARS 252.204-7012</strong> safeguarding of Covered Defense Information and cyber incident
              reporting.
            </li>
            <li>
              <strong>DFARS 252.204-7019/7020</strong> — SPRS score posted upon completion of the self-assessment.
            </li>
            <li>
              <strong>CMMC Level 2</strong> — in progress toward a C3PAO certification assessment.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">Supply-Chain &amp; Program Security</h2>
          <ul>
            <li>Exostar-managed DoD supply-chain risk management (SCRM) and partner onboarding.</li>
            <li>CUI handled within a FedRAMP Moderate-equivalent, FIPS-validated boundary.</li>
            <li>Device identity, operator identity, audit logging, and data-lineage controls for secure operations.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">For Auditors &amp; Government POCs</h2>
          <p>
            Detailed control-by-control status, the full SSP, POA&amp;M, and audit logs are available under login to
            authorized auditors and government points of contact.
          </p>
          <p>
            <Link
              href="/security/compliance"
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-white no-underline hover:bg-purple-700"
            >
              Access the Compliance Portal →
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Requests: <a href="mailto:security@mycosoft.com">security@mycosoft.com</a>
          </p>
        </div>
        {/* tgt referenced to keep projected numbers available to future 'posted' copy without publishing them now */}
        <span className="hidden" aria-hidden data-target-met={tgt.met} />
      </div>
    </div>
  )
}
