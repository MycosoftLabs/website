/**
 * FUSARIUM Launchpad — Enclave Bridge workbook content.
 *
 * Educational reference data for the "stand up your CUI enclave" workbook,
 * GENERALIZED from Mycosoft's own PreVeil enclave encoding
 * (lib/security/preveil/crm.ts): owner names become roles (Owner / IT lead),
 * Mycosoft-specific facts become worked examples, and nothing here asserts
 * that any provider makes a customer "compliant" — a provider covers part of
 * the work and the customer always owns the rest.
 *
 * Pure data, no secrets, no tenant state. Rendered by
 * app/app/launchpad/enclave/page.tsx.
 */

// ---------------------------------------------------------------------------
// Provider options
// ---------------------------------------------------------------------------

export interface EnclaveProviderOption {
  name: string;
  model: string;
  bestFor: string;
  note: string;
}

export const ENCLAVE_PROVIDER_OPTIONS: EnclaveProviderOption[] = [
  {
    name: 'PreVeil',
    model: 'End-to-end-encrypted email + file drive that overlays your existing Google Workspace or Microsoft 365 — CUI lives in the overlay, everyday mail stays where it is.',
    bestFor: 'Small teams that need a CUI boundary fast without migrating email.',
    note: 'FIPS-validated cryptography; FedRAMP Moderate equivalency claimed by the vendor — verify the current attestation letter yourself before relying on it.',
  },
  {
    name: 'Microsoft 365 GCC High',
    model: 'A full government-community cloud: mail, files, Teams, and identity all inside the boundary.',
    bestFor: 'Teams that want one environment for everything and can absorb the migration and per-seat cost.',
    note: 'Requires validation of eligibility as a defense contractor and a licensing path through an approved reseller.',
  },
  {
    name: 'AWS GovCloud / Azure Government',
    model: 'Infrastructure enclaves — virtual machines, storage, and services authorized for government workloads.',
    bestFor: 'Engineering-heavy work: CUI in code, models, or datasets rather than documents and email.',
    note: 'You build and operate what runs inside; the provider authorizes the underlying platform only.',
  },
  {
    name: 'Google Assured Workloads',
    model: 'Policy-constrained regions of Google Cloud configured for government data requirements.',
    bestFor: 'Teams already deep in Google Cloud tooling.',
    note: 'Confirm the specific service and region against your contract’s data-handling clauses.',
  },
  {
    name: 'Self-hosted enclave',
    model: 'Your own hardware, your own controls, no cloud provider inside the boundary.',
    bestFor: 'Unusual constraints (air-gap requirements, existing cleared facilities).',
    note: 'You inherit nothing: every one of the 110 NIST SP 800-171 requirements is yours alone to implement and evidence.',
  },
];

export const PROVIDER_DISCLAIMER =
  'Launchpad lists these options for education only. It does not resell, endorse, or verify any ' +
  'provider, and no provider selection makes a company compliant by itself. Confirm current ' +
  'authorizations (FedRAMP status, DFARS 252.204-7012 coverage) directly with the provider and ' +
  'your contracting officer.';

// ---------------------------------------------------------------------------
// Customer-responsibility matrix
// ---------------------------------------------------------------------------
// Rows are activities; columns say who does what. The Launchpad column is
// ALWAYS guidance/reference-only — Launchpad is a commercial workbook outside
// the enclave and never performs, stores, or certifies any of this.

export interface ResponsibilityRow {
  activity: string;
  customer: string;
  provider: string;
  launchpad: string;
}

export const RESPONSIBILITY_MATRIX: ResponsibilityRow[] = [
  {
    activity: 'Determine what is CUI on your contracts',
    customer: 'You decide, with your contracting officer. No vendor or tool can make this call for you.',
    provider: 'Cannot determine this for you.',
    launchpad: 'Definitions and guidance only.',
  },
  {
    activity: 'Select an authorized offering',
    customer: 'You evaluate, contract, and document why the offering fits your contract clauses.',
    provider: 'Publishes its authorizations and attestations (FedRAMP, DFARS 7012 flow-down).',
    launchpad: 'Reference comparison only — never a recommendation of record.',
  },
  {
    activity: 'Identity and MFA',
    customer: 'Enroll each user, enforce multi-factor authentication, remove departed users promptly.',
    provider: 'Supplies the identity and MFA mechanisms.',
    launchpad: 'Checklist guidance only.',
  },
  {
    activity: 'Data content',
    customer: 'Keep all CUI inside the enclave — what goes in, and that nothing leaks out, is on you.',
    provider: 'Encrypts and stores data inside its boundary.',
    launchpad: 'Never touches content. Stores references, metadata, and hashes only.',
  },
  {
    activity: 'Evidence retention',
    customer: 'Capture screenshots and exports of your settings; retain them for your assessment.',
    provider: 'Produces audit logs and exposes retention settings.',
    launchpad: 'Evidence index holds references and hashes — the evidence itself stays in your systems.',
  },
  {
    activity: 'Incident response',
    customer: 'Your incident-response plan, your reporting duty (DFARS 252.204-7012 requires DIBNet reporting within 72 hours where it applies).',
    provider: 'Notifies you of provider-side incidents per its agreement.',
    launchpad: 'Workbook guidance only — Launchpad is not an incident-response service.',
  },
  {
    activity: 'SSP inclusion',
    customer: 'Write the enclave into your System Security Plan (SSP) — the document describing how each requirement is met.',
    provider: 'Supplies the Customer Responsibility Matrix (CRM) that feeds it.',
    launchpad: 'DRAFT templates only — every generated document requires customer review.',
  },
];

// ---------------------------------------------------------------------------
// Workbook checklists
// ---------------------------------------------------------------------------
// Step ids are stable — they key the saved checkbox state.

export type WorkbookRole = 'Owner' | 'IT lead';

export interface WorkbookStep {
  id: string;
  title: string;
  detail: string;
  role: WorkbookRole;
  evidenceHint?: string;
}

/**
 * Provider setup, generalized from a real PreVeil provisioning runbook. The
 * steps transfer to most enclave providers; names of screens will differ.
 */
export const SETUP_CHECKLIST: WorkbookStep[] = [
  {
    id: 'setup-agreement',
    title: 'Sign the provider agreement',
    detail: 'Execute the provider’s agreement for exactly the people who will handle CUI — seats are cheap to add later and expensive to un-scope.',
    role: 'Owner',
    evidenceHint: 'signed agreement (keep the executed copy in your records system)',
  },
  {
    id: 'setup-enroll',
    title: 'Enroll every user and device',
    detail: 'Install the provider client on each dedicated CUI machine and create an identity for each person. Unenrolled devices must never touch CUI.',
    role: 'IT lead',
    evidenceHint: 'screenshot of the user/device roster in the provider admin console',
  },
  {
    id: 'setup-device-approval',
    title: 'Turn on device-approval workflow',
    detail: 'Require an admin to approve every new device enrollment, so a stolen password alone cannot add a rogue device.',
    role: 'Owner',
    evidenceHint: 'screenshot of the device-approval setting',
  },
  {
    id: 'setup-mfa',
    title: 'Enforce MFA for all users',
    detail: 'Multi-factor authentication — a hardware key or authenticator code on top of the password — required for every account, no exceptions.',
    role: 'Owner',
    evidenceHint: 'screenshot of the MFA enforcement policy',
  },
  {
    id: 'setup-approval-groups',
    title: 'Configure multi-party approval for sensitive actions',
    detail: 'Where the provider supports it, require two people to approve data export or admin actions, so no single compromised account can drain the enclave.',
    role: 'Owner',
    evidenceHint: 'screenshot of the approval-group membership',
  },
  {
    id: 'setup-sharing',
    title: 'Set the external-recipient and sharing policy',
    detail: 'Default-deny external sharing; allow-list only the .mil/.gov recipients your contract requires.',
    role: 'Owner',
    evidenceHint: 'screenshot of the sharing policy',
  },
  {
    id: 'setup-retention',
    title: 'Set audit-log retention',
    detail: 'At least 3 years; some DoD contracts expect longer (check yours — 7 years is a common ask). Immutable retention beats deletable retention.',
    role: 'Owner',
    evidenceHint: 'screenshot of the retention setting',
  },
  {
    id: 'setup-siem',
    title: 'Connect provider logs to your SIEM',
    detail: 'Stream the provider’s tamper-evident logs into your own monitoring (e.g. Wazuh) so alerts fire in one place.',
    role: 'IT lead',
    evidenceHint: 'screenshot of the connector status + a received event in the SIEM',
  },
  {
    id: 'setup-crm',
    title: 'Obtain and file the signed Customer Responsibility Matrix (CRM)',
    detail: 'The CRM is the provider’s per-requirement statement of who covers what. It is the authoritative input to your SSP — do not guess in its absence.',
    role: 'IT lead',
    evidenceHint: 'the signed CRM document, indexed in your evidence system',
  },
  {
    id: 'setup-boundary',
    title: 'Confirm no CUI outside the enclave',
    detail: 'Verify your everyday email and file storage hold no CUI — the enclave is the sole CUI store. If CUI ever lands outside, treat it as a spillage: stop, move it in, purge the copy, log the incident.',
    role: 'Owner',
    evidenceHint: 'a short signed memo recording the sweep and its date',
  },
];

/** Hardware for the machines that will touch CUI. */
export const HARDWARE_CHECKLIST: WorkbookStep[] = [
  {
    id: 'hw-dedicated',
    title: 'Dedicated assessment laptops',
    detail: 'Separate machines used only for CUI work. Mixing CUI onto everyday laptops drags every app on them into assessment scope.',
    role: 'Owner',
  },
  {
    id: 'hw-screenlock',
    title: 'Automatic screen lock',
    detail: 'Lock after a short idle period (15 minutes or less) with re-authentication required.',
    role: 'IT lead',
  },
  {
    id: 'hw-encryption',
    title: 'Full-disk encryption',
    detail: 'BitLocker (Windows), FileVault (macOS), or LUKS (Linux) enabled — and the recovery key stored somewhere that is not the laptop.',
    role: 'IT lead',
  },
  {
    id: 'hw-mfa-keys',
    title: 'Hardware MFA keys',
    detail: 'A physical security key (FIDO2/WebAuthn) per person beats phone codes — it cannot be phished.',
    role: 'Owner',
  },
  {
    id: 'hw-inventory',
    title: 'Asset inventory record',
    detail: 'Serial number, assigned user, and purpose for each device, written down where you can produce it on request.',
    role: 'IT lead',
  },
];

/** Logging / monitoring for the enclave endpoints. */
export const LOGGING_CHECKLIST: WorkbookStep[] = [
  {
    id: 'log-agents',
    title: 'Install a log agent on every enclave endpoint',
    detail: 'Each CUI machine reports into your SIEM (Security Information and Event Management — the system that collects and alerts on logs). Wazuh is a widely used free, open-source option.',
    role: 'IT lead',
  },
  {
    id: 'log-retention',
    title: 'Set log retention to meet your contract',
    detail: 'Retain logs at least as long as your contract requires, on storage the endpoints themselves cannot erase.',
    role: 'IT lead',
  },
  {
    id: 'log-review',
    title: 'Set an alert-review cadence and write it down',
    detail: 'A named person reviews alerts on a fixed schedule (weekly at minimum). An unreviewed SIEM is a decoration, not a control.',
    role: 'Owner',
  },
];

// ---------------------------------------------------------------------------
// Example commands — clearly examples, never copy-paste-and-run
// ---------------------------------------------------------------------------

export interface CommandExample {
  label: string;
  lines: string[];
}

export const WAZUH_EXAMPLES: CommandExample[] = [
  {
    label: 'Windows — example — adapt to your environment',
    lines: [
      '# example — adapt to your environment (version, manager address)',
      'Invoke-WebRequest -Uri https://packages.wazuh.com/4.x/windows/wazuh-agent-4.9.0-1.msi -OutFile wazuh-agent.msi',
      'msiexec.exe /i wazuh-agent.msi /q WAZUH_MANAGER="siem.example.internal"',
    ],
  },
  {
    label: 'Linux (Debian/Ubuntu) — example — adapt to your environment',
    lines: [
      '# example — adapt to your environment (repo key, version, manager address)',
      'curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo gpg --dearmor -o /usr/share/keyrings/wazuh.gpg',
      'echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list',
      'sudo apt-get update && sudo WAZUH_MANAGER="siem.example.internal" apt-get install -y wazuh-agent',
    ],
  },
];

// ---------------------------------------------------------------------------
// CUI boundary — a worked example of inside vs. outside
// ---------------------------------------------------------------------------

export const CUI_BOUNDARY_EXAMPLE = {
  inside: [
    'All CUI email — sent and received only through the enclave’s encrypted mail',
    'All CUI files — stored only in the enclave’s drive',
    'CUI shared with .mil/.gov recipients — only via the enclave’s approved-recipient controls',
  ],
  outside: [
    'Everyday business email (Gmail / Outlook) — non-CUI only',
    'Everyday file storage (Drive / SharePoint) — non-CUI only',
    'Chat, calendar, and video tools — no CUI, ever',
  ],
  rule:
    'One sentence your whole team can recite: CUI lives only in the enclave. If CUI ever arrives ' +
    'in an everyday system, stop, move it into the enclave, purge the stray copy, and log the ' +
    'incident — that log is itself evidence your incident process works.',
} as const;
