"use client"

import LegalDraft from "../legal-draft"

export default function PrivacyPage() {
  return (
    <LegalDraft
      title="Privacy Notice (Draft Outline)"
      sections={[
        ["What we collect", "Account identity (name, work email), organization profile facts the customer enters, readiness workflow state, evidence metadata and hashes (never evidence content), billing metadata via Stripe, and product usage events."],
        ["What we deliberately do not collect", "CUI, classified information, credentials or secrets, raw security logs or packet captures, SSNs or background-investigation material, evidence file content, or full payment card data (handled by Stripe)."],
        ["How data is used", "Operating the workspace, computing customer-requested score estimates, generating customer-requested drafts, billing, support, and security. Tenant data is not used to train AI models absent a separate, explicit opt-in."],
        ["Processors", "Supabase (database and authentication), Stripe (payments), model providers for customer-initiated AI actions under the prompt-firewall policy, and infrastructure providers — each listed with purpose in the final notice."],
        ["Retention", "Account and billing records per statutory requirements; audit records per policy; customer workspace data retained while the subscription is active plus a defined export window; deletion workflow thereafter."],
        ["Customer rights and controls", "Export, correction, and deletion controls in-app; per-object sensitivity labels; Partner Mesh sharing only by separate opt-in."],
        ["Contact and complaints", "To be completed by counsel with the designated contact and applicable-law disclosures."],
      ]}
    />
  )
}
