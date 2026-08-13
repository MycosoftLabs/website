/**
 * Guided tour / Lego-step workbook of the Launchpad product.
 * Progress is tenant-scoped; steps are static product structure, not mock compliance.
 */

export interface WorkbookStep {
  id: string;
  module: string;
  title: string;
  summary: string;
  href: string;
  bff: string;
}

export const WORKBOOK_STEPS: WorkbookStep[] = [
  { id: 'onboard', module: 'Onboarding', title: 'Create the workspace and accept non-CUI terms', summary: 'Tenant, membership, banner acknowledgement.', href: '/app/launchpad/onboarding', bff: 'GET/POST /onboarding' },
  { id: 'company', module: 'Contractor Ops', title: 'Record company identity (non-restricted facts)', summary: 'Legal name, UEI, CAGE — never passwords, DUNS, or EIN values.', href: '/app/launchpad/company', bff: 'GET/PATCH /company' },
  { id: 'registrations', module: 'Contractor Ops', title: 'Track SAM / portal renewals', summary: 'Dates and statuses only.', href: '/app/launchpad/company', bff: 'GET/POST /company/registrations' },
  { id: 'asa-scope', module: 'ASA Workspace', title: 'Write the assessment scope', summary: 'Customer-authored boundary facts.', href: '/app/launchpad/readiness', bff: 'GET/PATCH /readiness/scope' },
  { id: 'asa-controls', module: 'ASA Workspace', title: 'Mark the 110-requirement register', summary: 'Customer or Local Agent only — AI cannot mark implemented.', href: '/app/launchpad/readiness/controls', bff: 'GET/PATCH /readiness/controls' },
  { id: 'asa-score', module: 'ASA Workspace', title: 'Compute four independent measurements', summary: 'Count, weighted score, POA&M eligibility, evidence completeness.', href: '/app/launchpad/readiness/score', bff: 'GET /asa/indicators · POST /readiness/score' },
  { id: 'asa-poam', module: 'ASA Workspace', title: 'Open 180-day POA&M items', summary: 'Deterministic from the rule pack; not an LLM score.', href: '/app/launchpad/readiness/poam', bff: 'GET/PATCH /readiness/poam' },
  { id: 'evidence', module: 'Evidence Index', title: 'Index evidence hashes and references', summary: 'No content column. Content stays in the customer system.', href: '/app/launchpad/evidence', bff: 'GET/POST /evidence' },
  { id: 'training', module: 'ASA Workspace', title: 'Assign training (title/URL, not hosted content)', summary: 'Completion dates and certificate refs only.', href: '/app/launchpad/training', bff: 'GET/POST/PATCH /training' },
  { id: 'tier1', module: 'Tier-1 Turnkey', title: 'Record training, screening, tabletop, DIBNet readiness', summary: 'Human-entered operator controls scanners cannot prove.', href: '/app/launchpad/tier1', bff: 'GET/POST /tier1' },
  { id: 'closure', module: 'Closure Board', title: 'Work waves from the tenant register', summary: 'Tenant control states — not Mycosoft MAS.', href: '/app/launchpad/closure', bff: 'GET /closure' },
  { id: 'documents', module: 'Document factory', title: 'Generate DRAFT policies / SSP / reports', summary: 'Placeholders only. Human PATCH to approve. Never invented Met.', href: '/app/launchpad/documents', bff: 'POST /documents · POST /reports · PATCH /documents' },
  { id: 'radar', module: 'Contract Radar', title: 'Review ingested official opportunities', summary: 'Empty and honest if SAM is not configured. No mock awards.', href: '/app/launchpad/opportunities', bff: 'GET /radar/opportunities' },
  { id: 'proposals', module: 'Proposal Workspace', title: 'Draft a proposal workspace', summary: 'Launchpad never submits bids.', href: '/app/launchpad/proposals', bff: 'GET/POST /proposals' },
  { id: 'origin', module: 'Origin Graph', title: 'Load a BOM and review 889 / PRC flags', summary: 'Customer records replacement candidates. No invented origin %.', href: '/app/launchpad/origin', bff: 'GET/POST /origin-graph' },
  { id: 'resources', module: 'Resource Graph', title: 'Browse disclosed vendor / process listings', summary: 'FTC compensation disclosure on every card. Not a certification.', href: '/app/launchpad/resources', bff: 'GET /resources' },
  { id: 'enclave', module: 'Enclave Bridge', title: 'Reference enclave items by metadata', summary: 'No CUI import. Playbooks are templates, not telemetry.', href: '/app/launchpad/enclave', bff: 'GET/POST /enclave · GET /enclave/playbooks' },
  { id: 'agent', module: 'Local Assurance Agent', title: 'Enroll a device; view sanitized findings', summary: 'Raw logs stay on-prem. Cloud stores result + one-sentence summary + hash.', href: '/app/launchpad/local-agent', bff: 'GET /local-agent · POST /local-agent/enroll' },
  { id: 'mesh', module: 'Partner Mesh', title: 'Opt in before any sharing', summary: 'No consent row = no data flow.', href: '/app/launchpad/partners', bff: 'GET /partner-mesh' },
  { id: 'ai', module: 'AI connections', title: 'Connect BYO keys (envelope) or use managed credits', summary: 'BYO on every tier including Launch Pass. BYO = 0 credits.', href: '/app/launchpad/settings/keys', bff: 'GET/POST /ai/connections' },
  { id: 'education', module: 'Education', title: 'Read Cybernet / NIPRNet / DIBNet / clearance / CUI topics', summary: 'Education only. CUI is not stored.', href: '/app/launchpad/education', bff: 'GET /education/definitions' },
];
