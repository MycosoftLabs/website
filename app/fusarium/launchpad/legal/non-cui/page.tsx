"use client"

import LegalDraft from "../legal-draft"

/**
 * The fourth document in the onboarding consent set.
 *
 * It was the only one of the four without a page: the checkbox read "I accept
 * the Non-CUI Data Policy" and linked to /fusarium/launchpad/trust, which is a
 * marketing page, not a policy instrument. Acceptance is written to an immutable
 * ledger, so customers were being recorded as agreeing to a document that did
 * not exist. This is that document, carrying the same DRAFT banner as the other
 * three until counsel signs off.
 *
 * The substance is Mycosoft's own operating rule, turned outward: Launchpad sits
 * OUTSIDE the CUI boundary, and nothing about that is a customer convenience we
 * can waive on request.
 */
export default function NonCuiPolicyPage() {
  return (
    <LegalDraft
      title="Non-CUI Data Policy (Draft Outline)"
      sections={[
        [
          "Launchpad is a commercial system outside any CUI boundary",
          "Launchpad is a commercial, non-CUI service. It is not FedRAMP authorized, not accredited under DFARS 252.204-7012, and not an enclave approved to store, process, or transmit Controlled Unclassified Information. Nothing in your subscription changes that, and no plan tier adds it.",
        ],
        [
          "What must never be entered",
          "Do not put CUI of any category into Launchpad, marked or unmarked. That includes Controlled Technical Information, export-controlled technical data under ITAR or the EAR, anything bearing a CUI banner or portion mark, and covered defense information received under a contract. Also excluded: classified information, credentials and API keys, raw packet captures, unredacted security logs, personnel background-investigation material, and third-party proprietary data you are not authorized to disclose.",
        ],
        [
          "What Launchpad is for",
          "Business facts about your own readiness: company identity and registrations, your self-assessment status against requirements, your plan of action and milestones, your policies and procedures, and descriptions of evidence you hold elsewhere. Describe and reference your evidence here; store the evidence itself in the system your contract requires.",
        ],
        [
          "Where your CUI should live instead",
          "In an environment authorized for it. For Mycosoft that is PreVeil; for you it is whatever enclave your contract and your assessor accept. Launchpad is designed to track and organize readiness without becoming a second, unaccredited copy of your controlled environment.",
        ],
        [
          "AI processing",
          "Text you enter may be processed by AI providers to generate drafts and analysis. Those providers are commercial services outside any CUI boundary. This is a further reason the prohibition above is absolute rather than advisory, and it applies equally when you connect your own AI account.",
        ],
        [
          "If prohibited data is entered anyway",
          "Tell us immediately. We will contain and remove it and confirm what happened. You remain responsible for your own incident reporting obligations, including any DFARS 252.204-7012 report to DIBNet within 72 hours, which is yours to make and not something Mycosoft can make on your behalf.",
        ],
        [
          "Monitoring and enforcement",
          "We may apply automated checks that refuse or flag input matching known controlled-data patterns. These checks reduce accidents; they are not a guarantee and they are not a substitute for your own review. Repeated or deliberate submission of prohibited data may result in suspension.",
        ],
        [
          "No certification claim",
          "Launchpad organizes your self-assessment. It does not certify you, does not make you eligible for any award, and does not represent any assessment of your compliance. Mycosoft, LLC is itself pursuing CMMC Level 2 via self-assessment and does not claim to be assessed compliant.",
        ],
      ]}
    />
  )
}
