// PreVeil — Mycosoft's CMMC Level 2 CUI enclave (the L2 boundary).
//
// PreVeil is an end-to-end-encrypted Email + Drive platform that overlays existing
// mail/file systems (Google Workspace, Gmail, Drive, M365, Outlook). CUI is stored and
// transmitted ONLY inside PreVeil; Google Workspace stays OUTSIDE the CUI boundary. This
// is the L2 enclave. (Exostar is a Level-3 / DoD-SCRM concern — not used at L2.)
//
// Sources (PreVeil public docs + the Mycosoft PreVeil call snapshot 2026-07-15):
//   preveil.com/cmmc-compliance, /admin-features, /resources/preveil-siem-connector,
//   PreVeil CMMC whitepaper + Customer Responsibility Matrix (CRM, Appendix A).
//
// Authoritative per-control Met/Joint/Customer designations come from the SIGNED CRM
// document PreVeil delivers on MSA execution. Until that lands, this encodes the 36
// controls PreVeil closes on provisioning (from PreVeil's own snapshot) and family-level
// responsibility defaults. Drop the real CRM into PREVEIL_CRM_IMPORT to override.

export type PreVeilResponsibility = 'preveil' | 'joint' | 'customer';

export const PREVEIL_FACTS = {
  product: 'PreVeil Gov (Email + Drive)',
  tier: 'PreVeil Pass (Compliance Accelerator)',
  seats: 2, // Morgan + RJ — locked at 2, do not plan a third
  boundary: 'CMMC Level 2 CUI enclave',
  encryption: 'End-to-end (per-message/per-file); FIPS 140-3 validated',
  fipsCmvp: 'CMVP certificate #5145',
  fedramp: 'FedRAMP Moderate Equivalent (DoD CIO Dec-2023 equivalency)',
  architecture: 'Zero Trust; no PreVeil-server plaintext access; ransomware-resistant',
  keyModel: 'Approval Groups (multi-party): decrypt/export/admin actions require group consent',
  auditLog: 'Tamper-proof cryptographic logs of all user/admin/system actions',
  siemConnector: 'Exports PreVeil logs to the org SIEM (Wazuh) for real-time alerting',
  overlays: ['Google Workspace', 'Gmail', 'Google Drive', 'Microsoft 365', 'Outlook', 'Exchange'],
  controlsSupported: 102, // of 110 (CRM: Met + Joint); ~8 remain pure-customer
  closesOnProvisioning: 36, // credibly Met the moment the enclave is live + enrolled
} as const;

// The 36 controls PreVeil closes on provisioning (PreVeil call snapshot 2026-07-15).
// These flip to Met once PreVeil is signed, both devices enrolled, and evidence captured.
export const PREVEIL_ENCLAVE_CONTROLS: Record<string, string[]> = {
  AC: ['AC.L2-3.1.1', 'AC.L2-3.1.2', 'AC.L2-3.1.3', 'AC.L2-3.1.11', 'AC.L2-3.1.14', 'AC.L2-3.1.15', 'AC.L2-3.1.20', 'AC.L2-3.1.22'],
  AU: ['AU.L2-3.3.1', 'AU.L2-3.3.2', 'AU.L2-3.3.5', 'AU.L2-3.3.6', 'AU.L2-3.3.7', 'AU.L2-3.3.8', 'AU.L2-3.3.9'],
  IA: ['IA.L2-3.5.1', 'IA.L2-3.5.2', 'IA.L2-3.5.3', 'IA.L2-3.5.4', 'IA.L2-3.5.5', 'IA.L2-3.5.6', 'IA.L2-3.5.10', 'IA.L2-3.5.11'],
  SC: ['SC.L2-3.13.1', 'SC.L2-3.13.5', 'SC.L2-3.13.6', 'SC.L2-3.13.8', 'SC.L2-3.13.10', 'SC.L2-3.13.11', 'SC.L2-3.13.13', 'SC.L2-3.13.15', 'SC.L2-3.13.16'],
  MP: ['MP.L2-3.8.3', 'MP.L2-3.8.4', 'MP.L2-3.8.6', 'MP.L2-3.8.9'],
};
export const PREVEIL_ENCLAVE_LIST = Object.values(PREVEIL_ENCLAVE_CONTROLS).flat();

// Family-level responsibility default (refined per-control by the signed CRM).
export const PREVEIL_FAMILY_RESPONSIBILITY: Record<string, PreVeilResponsibility> = {
  AC: 'joint', AU: 'preveil', IA: 'preveil', SC: 'preveil', MP: 'joint',
  AT: 'customer', CM: 'customer', IR: 'customer', MA: 'customer',
  PE: 'customer', PS: 'customer', RA: 'customer', CA: 'joint',
};

/** Responsibility for a given control (enclave list wins; else family default; CRM override wins over all). */
export function preveilResponsibility(controlId: string, family: string): PreVeilResponsibility {
  const imp = PREVEIL_CRM_IMPORT[controlId];
  if (imp) return imp;
  if (PREVEIL_ENCLAVE_LIST.includes(controlId)) return 'preveil';
  return PREVEIL_FAMILY_RESPONSIBILITY[family] ?? 'customer';
}

// Drop-in slot for the signed CRM (Appendix A). Key = control_id, value = designation.
// When PreVeil delivers the CRM on the call, populate this (or ingest a JSON) to make the
// mapping authoritative. Empty until then — no fabricated designations.
export const PREVEIL_CRM_IMPORT: Record<string, PreVeilResponsibility> = {};

// Google Workspace ↔ PreVeil CUI boundary. This is the data-flow control story for the
// assessor (SC.L2-3.13.1/.5, AC.L2-3.1.3/.20): CUI never lands in Google.
export const CUI_BOUNDARY = {
  insideEnclave: [
    'All CUI email (send/receive via PreVeil Email companion)',
    'All CUI files (PreVeil Drive)',
    'CUI shared with .mil/.gov via PreVeil approved external recipients',
  ],
  outsideBoundary: [
    'Google Workspace / Gmail — business (non-CUI) mail only',
    'Google Drive — business (non-CUI) documents only',
    'Google Calendar/Chat/Meet — no CUI',
  ],
  rule: 'No CUI in Google. If CUI arrives in Gmail, it is moved to PreVeil and purged from Gmail (incident-logged). Google Admin audit logs supplement PreVeil for the business surface.',
  companion: 'The PreVeil Email companion (Outlook add-in / Gmail-alongside app) lets users send E2E-encrypted CUI mail from their normal workflow; the message body/attachments transit only through PreVeil, never Google.',
} as const;

// SIEM Connector → Wazuh: this is how PreVeil evidences the AU (audit) family and feeds
// the same Wazuh manager that (at PROV) monitors the endpoints.
export const PREVEIL_SIEM = {
  target: 'Wazuh manager (MAS 192.168.0.188)',
  exports: 'Tamper-proof PreVeil user/admin/system event logs',
  satisfies: ['AU.L2-3.3.1', 'AU.L2-3.3.2', 'AU.L2-3.3.5', 'AU.L2-3.3.6', 'AU.L2-3.3.8', 'AU.L2-3.3.9'],
  note: 'Approval-Group consent gates log decrypt/export. Connector runs post-provisioning.',
} as const;

// Provisioning checklist — what makes the 36 controls credible. Gated until each is done +
// evidenced (PreVeil admin-console screenshots → evidence/<family>/<id>_preveil.png).
export interface PreVeilStep { id: string; title: string; detail: string; owner: 'morgan' | 'rj' | 'cursor'; evidence: string; }
export const PREVEIL_PROVISIONING: PreVeilStep[] = [
  { id: 'msa', title: 'Sign PreVeil MSA (2 seats)', detail: 'Execute the PreVeil Pass MSA for Morgan + RJ. Do not add a third seat.', owner: 'morgan', evidence: 'signed MSA' },
  { id: 'enroll', title: 'Enroll both users + devices', detail: 'Install PreVeil desktop client on each CMMC laptop; create Morgan + RJ identities.', owner: 'cursor', evidence: 'evidence/ac/3.1.1_preveil_users.png' },
  { id: 'approve', title: 'Turn on device-approval workflow', detail: 'Require admin approval for new device enrollment (blocks unauthorized devices).', owner: 'morgan', evidence: 'evidence/ac/3.1.2_preveil_device_approval.png' },
  { id: 'mfa', title: 'Enforce MFA for all users', detail: 'PreVeil hardware key or TOTP required for both users.', owner: 'morgan', evidence: 'evidence/ia/3.5.3_preveil_mfa.png' },
  { id: 'approval-groups', title: 'Configure Approval Groups', detail: 'Multi-party group for CUI export / admin actions (Morgan + RJ).', owner: 'morgan', evidence: 'evidence/ac/3.1.15_preveil_approval_group.png' },
  { id: 'external', title: 'Set external-recipient + sharing policy', detail: 'Default-deny sharing; allow-list .mil/.gov CUI recipients only.', owner: 'morgan', evidence: 'evidence/sc/3.13.6_preveil_sharing.png' },
  { id: 'retention', title: 'Set retention ≥ 3 years (7yr DoD)', detail: 'Immutable audit-log retention aligned to contract.', owner: 'morgan', evidence: 'evidence/au/3.3.8_preveil_retention.png' },
  { id: 'siem', title: 'Connect SIEM Connector → Wazuh', detail: 'Stream PreVeil logs to the Wazuh manager on MAS 188.', owner: 'cursor', evidence: 'evidence/au/3.3.5_preveil_siem.png' },
  { id: 'crm', title: 'Ingest the signed CRM (Appendix A)', detail: 'Populate PREVEIL_CRM_IMPORT with the authoritative Met/Joint/Customer designations.', owner: 'cursor', evidence: 'CRM document + PREVEIL_CRM_IMPORT' },
  { id: 'boundary', title: 'Confirm no CUI in Google Workspace', detail: 'Verify Gmail/Drive hold no CUI; PreVeil is the sole CUI store.', owner: 'morgan', evidence: 'evidence/sc/3.13.1_cui_boundary.md' },
];
