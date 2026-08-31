"use client"

import LegalDraft from "../legal-draft"

export default function AupPage() {
  return (
    <LegalDraft
      title="Acceptable Use and Anti-Fabrication Policy (Draft Outline)"
      sections={[
        ["Truthful use", "Customers may not upload fabricated evidence, backdate records, misstate training or implementation, or direct AI to create false certifications, customers, revenue, test results, or qualifications."],
        ["Prohibited data", "No CUI, classified information, export-controlled technical data, credentials, raw packet captures, unredacted security logs, or background-investigation material in the standard workspace."],
        ["No deceptive government submissions", "Launchpad may not be used to evade acquisition, security, sanction, export, domestic-source, or eligibility requirements, or to prepare submissions the customer knows to be false. Mycosoft may suspend accounts used deceptively."],
        ["Security of the service", "No probing, scanning, or testing of Launchpad itself except under a written authorization; no attempts to access other tenants' data; no credential sharing."],
        ["AI usage", "AI drafts require human review before use. Customers may not present AI drafts as certified or independently assessed work product."],
        ["Enforcement", "Warnings, quarantine, suspension, and termination processes — with export rights preserved except where legally restricted."],
      ]}
    />
  )
}
