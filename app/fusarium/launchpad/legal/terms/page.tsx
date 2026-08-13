"use client"

import LegalDraft from "../legal-draft"

// Outline per master plan §21.1. Counsel supplies the operative text.
export default function TermsPage() {
  return (
    <LegalDraft
      title="Terms of Service (Draft Outline)"
      sections={[
        ["Software license and permitted use", "Subscription license to the Launchpad workspace for internal business use by the customer organization; no resale, no service-bureau use, no circumvention of usage limits."],
        ["Non-CUI data policy and prohibited data", "The standard service is a non-CUI workspace. CUI, classified information, export-controlled technical data, credentials, raw security telemetry, and background-investigation material may not be submitted. Mycosoft may block, quarantine, and require removal."],
        ["Customer responsibilities", "The customer owns its systems of record, self-assessment, SPRS submissions, proposals, signatures, affirmations, and all government representations, and decides what information is restricted."],
        ["AI limitations and required review", "AI outputs are drafts requiring customer review. No AI output marks a requirement implemented, affirms compliance, or makes representations on the customer's behalf."],
        ["No certification, assessment, or professional advice", "Launchpad is not a C3PAO and provides no certification, independent assessment, or legal, tax, accounting, or export-control advice. No guarantee of eligibility, award, funding, or clearance."],
        ["Payments, renewal, cancellation, refunds", "Prices per the published catalog. Recurring plans renew only as explicitly selected; failed payment leads to a defined grace and read/export period, not immediate data loss. Launch Pass terms as published."],
        ["Data ownership, export, and deletion", "Customer data belongs to the customer; export in standard formats and deletion workflows are available, subject to legal holds and billing records."],
        ["Security incidents", "Defined notification process for incidents affecting customer data, including suspected prohibited-data submissions."],
        ["Liability, indemnity, disputes, governing law", "To be completed by counsel."],
        ["Change management", "Versioned terms; material changes notified; regulatory-content updates documented with source and effective date."],
      ]}
    />
  )
}
