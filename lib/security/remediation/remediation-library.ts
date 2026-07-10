// ═══════════════════════════════════════════════════════════════════════════
// CMMC L2 / NIST SP 800-171 Rev.2 — Remediation knowledge library
// ═══════════════════════════════════════════════════════════════════════════
//
// Turns each control into an actionable "how do we actually become compliant"
// workbook: objective, why it matters, the exact tools/systems/protocols, a
// checklist of concrete steps (configure / procure / document / deploy / collect
// evidence / submit), the evidence artifacts to produce, and the acceptance
// criteria (mapped to NIST SP 800-171A assessment objectives).
//
// Grounded in Mycosoft's real stack (per the CMMC sprint plan):
//   • PreVeil Gov Community  — CUI enclave (AWS GovCloud, FedRAMP Moderate
//     equivalent, FIPS 140-3), email + file + approvals for CUI
//   • Wazuh                  — SIEM / audit log aggregation + alerting (AU + SI)
//   • UniFi Dream Machine Pro — network boundary, VLANs, firewall (SC + PE net)
//   • Cloudflare              — WAF / TLS / boundary protection
//   • Google Workspace        — business ops (CUI kept OUT of scope)
//   • YubiKey / MFA           — multifactor auth (IA)
//   • BitLocker (FIPS mode)   — full-disk encryption on endpoints (MP/SC)
//   • Intune / MDM            — endpoint config baselines, mobile control (CM/AC)
//   • MINDEX evidence repo    — chain-of-custody evidence store
//
// The resolver always returns a non-empty plan: control-specific if authored,
// otherwise the family template, so every control has a real workbook.

export type StepAction =
  | 'procure'
  | 'configure'
  | 'document'
  | 'deploy'
  | 'collect-evidence'
  | 'test'
  | 'submit'
  | 'train';

export interface RemediationStep {
  id: string;
  title: string;
  detail: string;
  action: StepAction;
  /** System / product the step is performed in. */
  system?: string;
  /** External console / form / portal to open. */
  link?: { label: string; href: string };
  /** Evidence artifact this step produces (uploaded to the evidence repo). */
  evidenceArtifact?: string;
  /** Owner role responsible. */
  owner?: string;
}

export interface RemediationPlan {
  /** NIST 800-171A determination — plain-English objective. */
  objective: string;
  /** Why it matters for CUI / the contract. */
  whyItMatters: string;
  /** Assessment method(s) an assessor will use. */
  assessmentMethods: Array<'examine' | 'interview' | 'test'>;
  /** Primary responsible role. */
  responsibleRole: string;
  tools: string[];
  protocols: string[];
  /** Authoritative references (NIST / DFARS / CMMC). */
  references: string[];
  steps: RemediationStep[];
  /** Evidence artifacts required to mark the control Met. */
  evidenceRequired: string[];
  /** NIST 800-171A-style acceptance criteria. */
  acceptanceCriteria: string[];
  estimatedEffort: string;
}

// Two-letter family → human name + shared defaults.
interface FamilyMeta {
  name: string;
  objective: string;
  whyItMatters: string;
  responsibleRole: string;
  tools: string[];
  protocols: string[];
  references: string[];
}

export const FAMILY_META: Record<string, FamilyMeta> = {
  AC: {
    name: 'Access Control',
    objective: 'Limit system access to authorized users, processes, and devices, and to the transactions they are permitted.',
    whyItMatters: 'Access control is the first line of defense for CUI. Weak access = the fastest path to a reportable spillage under DFARS 252.204-7012.',
    responsibleRole: 'System Administrator (Morgan) + Approver (RJ)',
    tools: ['PreVeil Gov (CUI enclave + approval groups)', 'Google Workspace admin', 'Intune/MDM', 'YubiKey MFA'],
    protocols: ['Least privilege', 'Role-based access control (RBAC)', 'Separation of duties'],
    references: ['NIST SP 800-171 Rev.2 §3.1', 'NIST SP 800-171A 3.1.x', 'CMMC L2 AC domain'],
  },
  AT: {
    name: 'Awareness and Training',
    objective: 'Ensure personnel are aware of security risks and trained for their assigned security duties, including insider-threat recognition.',
    whyItMatters: 'Human error is the leading cause of CUI incidents. Documented training is a low-cost, high-weight control an assessor checks first.',
    responsibleRole: 'Security Lead (Morgan)',
    tools: ['CDSE / DCSA training portal', 'PreVeil (store completion records)', 'Google Workspace (calendar cadence)'],
    protocols: ['Annual security awareness training', 'Role-based training', 'Insider threat awareness'],
    references: ['NIST SP 800-171 Rev.2 §3.2', 'NIST SP 800-171A 3.2.x', 'CDSE CUI course'],
  },
  AU: {
    name: 'Audit and Accountability',
    objective: 'Create, protect, and review system audit logs so user actions can be uniquely traced and investigated.',
    whyItMatters: 'Without centralized logging you cannot detect or investigate a CUI incident — and 3.3.x is where most self-assessments lose points.',
    responsibleRole: 'Security Lead (Morgan)',
    tools: ['Wazuh SIEM', 'PreVeil admin audit log', 'Google Workspace audit log', 'UniFi logging'],
    protocols: ['Centralized log aggregation', 'Time synchronization (NTP)', 'Log integrity protection', 'Audit-failure alerting'],
    references: ['NIST SP 800-171 Rev.2 §3.3', 'NIST SP 800-171A 3.3.x', 'CMMC L2 AU domain'],
  },
  CM: {
    name: 'Configuration Management',
    objective: 'Establish and enforce secure baseline configurations and control changes to organizational systems.',
    whyItMatters: 'A documented, enforced baseline is what proves your systems are hardened and not drifting into insecure states.',
    responsibleRole: 'System Administrator (Morgan)',
    tools: ['Intune/MDM baselines', 'CIS Benchmarks', 'PreVeil (change approvals)', 'Git (config-as-code)'],
    protocols: ['Baseline configuration', 'Least functionality', 'Change control board', 'Allowlisting'],
    references: ['NIST SP 800-171 Rev.2 §3.4', 'NIST SP 800-171A 3.4.x', 'CIS Benchmarks'],
  },
  IA: {
    name: 'Identification and Authentication',
    objective: 'Uniquely identify and authenticate users, processes, and devices before granting access, using MFA for privileged and network access.',
    whyItMatters: 'MFA (3.5.3) is a 5-point control and the single highest-impact fix — DoD treats missing MFA as a critical finding.',
    responsibleRole: 'System Administrator (Morgan)',
    tools: ['YubiKey / FIDO2', 'PreVeil (device keys)', 'Google Workspace 2SV enforcement', 'Password manager'],
    protocols: ['Multifactor authentication', 'Replay-resistant auth', 'Password complexity policy', 'Cryptographically-protected credentials'],
    references: ['NIST SP 800-171 Rev.2 §3.5', 'NIST SP 800-171A 3.5.x', 'NIST SP 800-63B'],
  },
  IR: {
    name: 'Incident Response',
    objective: 'Establish an operational incident-handling capability and report incidents to designated authorities (incl. DoD within 72 hours).',
    whyItMatters: 'DFARS 252.204-7012 mandates 72-hour cyber-incident reporting to DIBNet. No IR plan = automatic contract risk.',
    responsibleRole: 'Security Lead (Morgan) + Approver (RJ)',
    tools: ['DIBNet reporting portal', 'PreVeil (IR plan + records)', 'Wazuh (detection)', 'Medium-assurance cert (for DIBNet)'],
    protocols: ['Incident handling lifecycle', 'Incident tracking & reporting', 'Tabletop exercises'],
    references: ['NIST SP 800-171 Rev.2 §3.6', 'DFARS 252.204-7012', 'NIST SP 800-61'],
  },
  MA: {
    name: 'Maintenance',
    objective: 'Perform and control system maintenance, including the tools, personnel, and remote/off-site maintenance of CUI systems.',
    whyItMatters: 'Uncontrolled maintenance (esp. remote/off-site) is a common CUI leakage path assessors probe.',
    responsibleRole: 'System Administrator (Morgan)',
    tools: ['Intune/MDM', 'PreVeil (maintenance logs)', 'MFA for remote sessions'],
    protocols: ['Controlled maintenance', 'Media sanitization before off-site', 'MFA for nonlocal maintenance'],
    references: ['NIST SP 800-171 Rev.2 §3.7', 'NIST SP 800-171A 3.7.x'],
  },
  MP: {
    name: 'Media Protection',
    objective: 'Protect, mark, control, and sanitize media (paper + digital) containing CUI, and encrypt CUI on removable/transported media.',
    whyItMatters: 'Media handling and sanitization are frequent findings; FIPS-validated encryption is required, not optional.',
    responsibleRole: 'System Administrator (Morgan)',
    tools: ['BitLocker (FIPS mode)', 'PreVeil (encrypted at rest)', 'Cross-cut shredder', 'Certified media sanitization'],
    protocols: ['CUI marking', 'FIPS-validated encryption', 'Media sanitization (NIST SP 800-88)', 'Removable-media control'],
    references: ['NIST SP 800-171 Rev.2 §3.8', 'NIST SP 800-88', 'FIPS 140-3'],
  },
  PS: {
    name: 'Personnel Security',
    objective: 'Screen individuals before granting CUI access, and protect CUI during personnel actions (termination/transfer).',
    whyItMatters: 'Background screening (3.9.1) and offboarding controls are quick wins that assessors verify by record.',
    responsibleRole: 'HR/Ops (Morgan) + Approver (RJ)',
    tools: ['Sterling / HireRight (background checks)', 'PreVeil (access revocation)', 'Offboarding checklist'],
    protocols: ['Pre-access screening', 'Access revocation on termination', 'Property/credential return'],
    references: ['NIST SP 800-171 Rev.2 §3.9', 'NIST SP 800-171A 3.9.x'],
  },
  PE: {
    name: 'Physical Protection',
    objective: 'Limit and monitor physical access to systems, equipment, and the facility, and safeguard CUI at alternate work sites.',
    whyItMatters: 'For a small business the physical boundary (the office + laptops) IS the CUI boundary. Assessors examine locks, logs, and visitor control.',
    responsibleRole: 'Facility/Ops Lead (Morgan)',
    tools: ['Badge/lock access control', 'Visitor log', 'Security cameras', 'Cable locks / laptop safes', 'PreVeil (evidence store)'],
    protocols: ['Physical access authorization', 'Visitor escort + logging', 'Alternate-work-site safeguards'],
    references: ['NIST SP 800-171 Rev.2 §3.10', 'NIST SP 800-171A 3.10.x', 'CMMC L2 PE domain'],
  },
  RA: {
    name: 'Risk Assessment',
    objective: 'Periodically assess risk, scan for vulnerabilities, and remediate them in accordance with risk.',
    whyItMatters: 'A recurring vulnerability-scan + remediation cycle is the evidence backbone for 3.11 and feeds the POA&M.',
    responsibleRole: 'Security Lead (Morgan)',
    tools: ['Nessus / OpenVAS', 'Wazuh vulnerability module', 'PreVeil (risk assessment records)'],
    protocols: ['Periodic risk assessment', 'Authenticated vulnerability scanning', 'Risk-based remediation'],
    references: ['NIST SP 800-171 Rev.2 §3.11', 'NIST SP 800-30', 'NIST SP 800-171A 3.11.x'],
  },
  CA: {
    name: 'Security Assessment',
    objective: 'Develop and maintain the SSP and POA&M, assess controls, and monitor them on an ongoing basis.',
    whyItMatters: 'The SSP + POA&M are the documents you submit/keep for the assessment. 3.12.x is literally "did you write and maintain these."',
    responsibleRole: 'Security Lead (Morgan) — SAO',
    tools: ['This compliance dashboard', 'PreVeil (SSP + POA&M repo)', 'SPRS (score submission)'],
    protocols: ['System Security Plan (SSP)', 'Plan of Action & Milestones (POA&M)', 'Continuous monitoring'],
    references: ['NIST SP 800-171 Rev.2 §3.12', 'DFARS 252.204-7019/7020', 'SPRS'],
  },
  SC: {
    name: 'System and Communications Protection',
    objective: 'Monitor and protect communications at system boundaries and protect the confidentiality of CUI in transit and at rest.',
    whyItMatters: 'Boundary protection + FIPS-validated crypto (3.13.8/3.13.11/3.13.16) are high-weight, evidence-heavy controls.',
    responsibleRole: 'System Administrator (Morgan)',
    tools: ['UniFi Dream Machine Pro (firewall/VLAN)', 'Cloudflare (WAF/TLS)', 'PreVeil (E2E encryption)', 'BitLocker (FIPS)'],
    protocols: ['Boundary protection', 'Subnetwork separation', 'FIPS-validated cryptography', 'Deny-by-default'],
    references: ['NIST SP 800-171 Rev.2 §3.13', 'FIPS 140-3', 'NIST SP 800-171A 3.13.x'],
  },
  SI: {
    name: 'System and Information Integrity',
    objective: 'Identify and correct flaws, protect against malicious code, and monitor systems and communications for attacks.',
    whyItMatters: 'System monitoring (3.14.6) is a 5-point control; Wazuh closes it and provides the audit trail for AU too.',
    responsibleRole: 'Security Lead (Morgan)',
    tools: ['Wazuh (monitoring/HIDS)', 'Microsoft Defender', 'Automated patching (Intune)', 'Cloudflare (network monitoring)'],
    protocols: ['Flaw remediation / patching', 'Malicious-code protection', 'System & network monitoring'],
    references: ['NIST SP 800-171 Rev.2 §3.14', 'NIST SP 800-171A 3.14.x'],
  },
};

// Generic, useful steps derived from the family (used when no control-specific
// plan is authored). Kept concrete, not filler.
function familyPlan(family: string): RemediationPlan {
  const m = FAMILY_META[family] ?? FAMILY_META.AC;
  return {
    objective: m.objective,
    whyItMatters: m.whyItMatters,
    assessmentMethods: ['examine', 'interview', 'test'],
    responsibleRole: m.responsibleRole,
    tools: m.tools,
    protocols: m.protocols,
    references: m.references,
    estimatedEffort: '2–6 hours',
    steps: [
      {
        id: 'policy',
        title: `Write / update the ${m.name} policy & procedure`,
        detail: `Document how Mycosoft satisfies this control for the CUI boundary: scope, responsibilities, and the specific mechanism used. Store the policy in the PreVeil SSP repository.`,
        action: 'document',
        system: 'PreVeil (SSP repo)',
        evidenceArtifact: `${m.name} policy (PDF, version-stamped)`,
        owner: m.responsibleRole,
      },
      {
        id: 'implement',
        title: `Implement the technical/administrative control`,
        detail: `Configure the mechanism in ${m.tools[0]} (and supporting tools) to enforce: ${m.protocols.join('; ')}.`,
        action: 'configure',
        system: m.tools[0],
        evidenceArtifact: 'Configuration screenshot / export',
        owner: m.responsibleRole,
      },
      {
        id: 'evidence',
        title: 'Collect objective evidence',
        detail: 'Capture screenshots, config exports, and/or records that demonstrate the control is operating. Upload to the MINDEX evidence repository with a control tag.',
        action: 'collect-evidence',
        system: 'MINDEX evidence repo',
        evidenceArtifact: 'Evidence bundle (screenshots + exports)',
        owner: m.responsibleRole,
      },
      {
        id: 'test',
        title: 'Test / verify the control operates',
        detail: 'Perform the assessment objective test (examine, interview, or test per NIST SP 800-171A) and record the result.',
        action: 'test',
        evidenceArtifact: 'Test result / assessment note',
        owner: m.responsibleRole,
      },
      {
        id: 'ssp',
        title: 'Update SSP implementation narrative + mark Met',
        detail: 'Write the per-control implementation statement in the SSP and set the control to Implemented once evidence is filed.',
        action: 'submit',
        system: 'This dashboard → MAS soc_ops',
        evidenceArtifact: 'SSP narrative entry',
        owner: m.responsibleRole,
      },
    ],
    evidenceRequired: [
      `${m.name} policy/procedure document`,
      'Configuration evidence (screenshot/export)',
      'Test / verification record',
    ],
    acceptanceCriteria: [
      'A documented policy/procedure exists and is current.',
      'The control mechanism is implemented and enforced.',
      'Objective evidence is on file in the evidence repository.',
      'The SSP implementation narrative is written for this control.',
    ],
  };
}

// ── Control-specific overrides ───────────────────────────────────────────────
// Detailed workbooks for the controls Morgan is actively working (Physical
// Protection 3.10.x for the Navy TAC-O engagement). Keyed by NIST id; CMMC ids
// (e.g. PE.L2-3.10.1) resolve to the same plan via nistIdOf().

const CONTROL_OVERRIDES: Record<string, RemediationPlan> = {
  '3.10.1': {
    objective:
      'Limit physical access to systems, equipment, and the operating environment to authorized individuals only (NIST 800-171A 3.10.1: authorized individuals are identified and physical access is limited to them).',
    whyItMatters:
      'The Chula Vista office (451 Acero Pl) and the two CUI laptops are the physical CUI boundary. If an unauthorized person can touch a device, every logical control is moot. This is a foundational PE control the assessor examines first.',
    assessmentMethods: ['examine', 'interview', 'test'],
    responsibleRole: 'Facility/Ops Lead (Morgan)',
    tools: ['Door lock / keyed access', 'Laptop cable locks / lockable cabinet', 'PreVeil (evidence store)', 'Access authorization list'],
    protocols: ['Physical access authorization list', 'Least privilege (physical)', 'Lock-when-unattended'],
    references: ['NIST SP 800-171 Rev.2 3.10.1', 'NIST SP 800-171A 3.10.1', 'CMMC L2 PE.L2-3.10.1'],
    estimatedEffort: '2–3 hours',
    steps: [
      {
        id: 'authlist',
        title: 'Create the physical access authorization list',
        detail: 'List every individual authorized to physically access the CUI work area and devices (currently Morgan + RJ). Record name, role, and access justification. This is the "authorized individuals" artifact the assessor asks for.',
        action: 'document',
        system: 'PreVeil (SSP repo)',
        evidenceArtifact: 'Physical Access Authorization List (signed)',
        owner: 'Facility/Ops Lead (Morgan)',
      },
      {
        id: 'securearea',
        title: 'Secure the work area',
        detail: 'Ensure the CUI work area is behind a lockable door. Install/verify a working lock and confirm keys are held only by authorized individuals. Photograph the lock as evidence.',
        action: 'deploy',
        system: 'Facility (451 Acero Pl)',
        evidenceArtifact: 'Photo of locked entry + key-holder list',
        owner: 'Facility/Ops Lead (Morgan)',
      },
      {
        id: 'devicelock',
        title: 'Physically secure the CUI laptops',
        detail: 'Attach cable locks to both Windows 11 CUI laptops, or store them in a lockable cabinet/safe when unattended. Enforce a lock-screen policy (auto-lock ≤15 min) via Intune/MDM.',
        action: 'configure',
        system: 'Intune/MDM + physical cable lock',
        evidenceArtifact: 'Photo of secured devices + MDM lock-screen policy',
        owner: 'Facility/Ops Lead (Morgan)',
      },
      {
        id: 'policy',
        title: 'Write the Physical Protection policy section',
        detail: 'Document the physical access rule: who is authorized, how access is limited, lock-when-unattended, and alternate-site handling. Store in the SSP.',
        action: 'document',
        system: 'PreVeil (SSP repo)',
        evidenceArtifact: 'Physical Protection policy (PDF)',
        owner: 'Facility/Ops Lead (Morgan)',
      },
      {
        id: 'evidence',
        title: 'File the evidence bundle',
        detail: 'Upload the authorization list, photos, and MDM policy export to the MINDEX evidence repository, tagged to 3.10.1 / PE.L2-3.10.1.',
        action: 'collect-evidence',
        system: 'MINDEX evidence repo',
        evidenceArtifact: 'Evidence bundle tagged PE.L2-3.10.1',
        owner: 'Facility/Ops Lead (Morgan)',
      },
      {
        id: 'markmet',
        title: 'Update SSP narrative + set control to Implemented',
        detail: 'Write the implementation statement and flip the control to Implemented here; the change syncs to MAS soc_ops and raises the SPRS score.',
        action: 'submit',
        system: 'This dashboard → MAS soc_ops',
        evidenceArtifact: 'SSP implementation narrative',
        owner: 'Security Lead (Morgan)',
      },
    ],
    evidenceRequired: [
      'Physical Access Authorization List (authorized individuals)',
      'Photo evidence of locked work area + secured devices',
      'MDM auto-lock policy export',
      'Physical Protection policy document',
    ],
    acceptanceCriteria: [
      'Authorized individuals are identified in a maintained list.',
      'Physical access to CUI systems/equipment is limited to those individuals.',
      'Devices are physically secured and auto-lock when unattended.',
      'Evidence is filed and the SSP narrative is written.',
    ],
  },
  '3.10.2': {
    objective: 'Protect and monitor the physical facility and support infrastructure for organizational systems (NIST 800-171A 3.10.2).',
    whyItMatters: 'Beyond limiting access, you must actively protect and monitor the facility (power, network closet, entry points) so tampering is detected.',
    assessmentMethods: ['examine', 'interview'],
    responsibleRole: 'Facility/Ops Lead (Morgan)',
    tools: ['Security cameras', 'UniFi Protect', 'UPS / power protection', 'Locked network enclosure'],
    protocols: ['Facility monitoring', 'Support-infrastructure protection', 'Tamper detection'],
    references: ['NIST SP 800-171 Rev.2 3.10.2', 'NIST SP 800-171A 3.10.2'],
    estimatedEffort: '2–4 hours',
    steps: [
      { id: 'cameras', title: 'Deploy / verify facility monitoring', detail: 'Install cameras (UniFi Protect) covering entry points and the equipment area; verify recording + retention.', action: 'deploy', system: 'UniFi Protect', evidenceArtifact: 'Camera coverage map + retention config', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'closet', title: 'Secure support infrastructure', detail: 'Lock the network/power enclosure (UDM Pro, switches) and protect with a UPS. Photograph the secured enclosure.', action: 'deploy', system: 'Facility', evidenceArtifact: 'Photo of locked enclosure + UPS', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'policy', title: 'Document facility monitoring procedure', detail: 'Write how the facility + support infrastructure are protected and monitored, incl. footage review cadence.', action: 'document', system: 'PreVeil (SSP repo)', evidenceArtifact: 'Facility monitoring procedure', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'evidence', title: 'File evidence + mark Met', detail: 'Upload camera map, photos, and procedure to the evidence repo; update SSP and set Implemented.', action: 'submit', system: 'MINDEX evidence repo → MAS soc_ops', evidenceArtifact: 'Evidence bundle tagged PE.L2-3.10.2', owner: 'Security Lead (Morgan)' },
    ],
    evidenceRequired: ['Camera coverage map + retention config', 'Photo of secured support infrastructure', 'Facility monitoring procedure'],
    acceptanceCriteria: ['The facility is monitored (cameras/logs).', 'Support infrastructure (network/power) is protected.', 'A monitoring procedure exists and evidence is filed.'],
  },
  '3.10.3': {
    objective: 'Escort visitors and monitor visitor activity (NIST 800-171A 3.10.3).',
    whyItMatters: 'Visitors are an uncontrolled physical vector. A simple escort rule + visitor log is cheap and directly examinable.',
    assessmentMethods: ['examine', 'interview'],
    responsibleRole: 'Facility/Ops Lead (Morgan)',
    tools: ['Visitor log (paper or digital)', 'Visitor badges', 'PreVeil (log retention)'],
    protocols: ['Visitor escort', 'Visitor logging', 'Visitor identification'],
    references: ['NIST SP 800-171 Rev.2 3.10.3', 'NIST SP 800-171A 3.10.3'],
    estimatedEffort: '1–2 hours',
    steps: [
      { id: 'log', title: 'Stand up a visitor log', detail: 'Create a visitor sign-in log capturing name, org, purpose, time in/out, and escort. Place at the entry.', action: 'document', system: 'Visitor log', evidenceArtifact: 'Visitor log template + first entries', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'policy', title: 'Write the visitor escort policy', detail: 'Document that all visitors are escorted in CUI areas and their activity monitored; store in SSP.', action: 'document', system: 'PreVeil (SSP repo)', evidenceArtifact: 'Visitor escort policy', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'evidence', title: 'File evidence + mark Met', detail: 'Upload the visitor log template + policy; update SSP and set Implemented.', action: 'submit', system: 'MINDEX evidence repo → MAS soc_ops', evidenceArtifact: 'Evidence bundle tagged PE.L2-3.10.3', owner: 'Security Lead (Morgan)' },
    ],
    evidenceRequired: ['Visitor log (template + populated entries)', 'Visitor escort policy'],
    acceptanceCriteria: ['Visitors are escorted in CUI areas.', 'Visitor activity is logged and monitored.'],
  },
  '3.10.4': {
    objective: 'Maintain audit logs of physical access (NIST 800-171A 3.10.4).',
    whyItMatters: 'You must retain a record of who physically accessed the facility — the visitor log + any badge/entry records satisfy this.',
    assessmentMethods: ['examine'],
    responsibleRole: 'Facility/Ops Lead (Morgan)',
    tools: ['Visitor log', 'Badge/entry system logs (if any)', 'PreVeil (retention)'],
    protocols: ['Physical access logging', 'Log retention'],
    references: ['NIST SP 800-171 Rev.2 3.10.4', 'NIST SP 800-171A 3.10.4'],
    estimatedEffort: '1 hour',
    steps: [
      { id: 'retain', title: 'Define retention + storage for physical access logs', detail: 'Decide retention period (e.g., 1 year) and store completed visitor/entry logs in PreVeil.', action: 'document', system: 'PreVeil', evidenceArtifact: 'Retention policy + stored logs', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'evidence', title: 'File evidence + mark Met', detail: 'Upload retained logs + retention note; update SSP and set Implemented.', action: 'submit', system: 'MINDEX evidence repo → MAS soc_ops', evidenceArtifact: 'Evidence bundle tagged PE.L2-3.10.4', owner: 'Security Lead (Morgan)' },
    ],
    evidenceRequired: ['Retained physical access logs', 'Log retention note'],
    acceptanceCriteria: ['Physical access logs are maintained and retained.'],
  },
  '3.10.5': {
    objective: 'Control and manage physical access devices — keys, locks, badges (NIST 800-171A 3.10.5).',
    whyItMatters: 'You must know who holds keys/badges and be able to revoke them. Uncontrolled keys undermine the whole PE boundary.',
    assessmentMethods: ['examine', 'interview'],
    responsibleRole: 'Facility/Ops Lead (Morgan)',
    tools: ['Key/badge inventory', 'Lock cores', 'PreVeil (inventory record)'],
    protocols: ['Key/badge inventory', 'Issuance & return tracking', 'Rekey on loss/termination'],
    references: ['NIST SP 800-171 Rev.2 3.10.5', 'NIST SP 800-171A 3.10.5'],
    estimatedEffort: '1–2 hours',
    steps: [
      { id: 'inventory', title: 'Inventory physical access devices', detail: 'List all keys/badges, who holds each, and issuance/return status. Define the rekey trigger (loss or offboarding).', action: 'document', system: 'PreVeil', evidenceArtifact: 'Key/badge inventory', owner: 'Facility/Ops Lead (Morgan)' },
      { id: 'evidence', title: 'File evidence + mark Met', detail: 'Upload the inventory + management procedure; update SSP and set Implemented.', action: 'submit', system: 'MINDEX evidence repo → MAS soc_ops', evidenceArtifact: 'Evidence bundle tagged PE.L2-3.10.5', owner: 'Security Lead (Morgan)' },
    ],
    evidenceRequired: ['Key/badge inventory', 'Access-device management procedure'],
    acceptanceCriteria: ['Physical access devices are inventoried and managed.', 'A rekey/revocation trigger is defined.'],
  },
  '3.10.6': {
    objective: 'Enforce safeguarding measures for CUI at alternate work sites, e.g., remote/home work (NIST 800-171A 3.10.6).',
    whyItMatters: 'Both CUI users work partly remote. Alternate-site safeguards (locked space, no shared devices, VPN, screen privacy) must be defined and enforced.',
    assessmentMethods: ['examine', 'interview'],
    responsibleRole: 'Security Lead (Morgan)',
    tools: ['PreVeil (remote CUI access)', 'VPN / UniFi Teleport', 'BitLocker (FIPS)', 'Privacy screens'],
    protocols: ['Alternate-work-site policy', 'Encrypted remote access', 'Full-disk encryption'],
    references: ['NIST SP 800-171 Rev.2 3.10.6', 'NIST SP 800-171A 3.10.6'],
    estimatedEffort: '1–2 hours',
    steps: [
      { id: 'policy', title: 'Write the alternate-work-site policy', detail: 'Define safeguards for handling CUI remotely: locked space, no family/shared device use, FIPS full-disk encryption, VPN, screen privacy, and PreVeil-only CUI handling.', action: 'document', system: 'PreVeil (SSP repo)', evidenceArtifact: 'Alternate-work-site policy', owner: 'Security Lead (Morgan)' },
      { id: 'enforce', title: 'Enforce technical safeguards', detail: 'Confirm BitLocker (FIPS) on both laptops, VPN configured, and CUI accessed only via PreVeil. Capture config evidence.', action: 'configure', system: 'Intune/MDM + PreVeil', evidenceArtifact: 'BitLocker + VPN config export', owner: 'System Administrator (Morgan)' },
      { id: 'evidence', title: 'File evidence + mark Met', detail: 'Upload policy + config evidence; update SSP and set Implemented.', action: 'submit', system: 'MINDEX evidence repo → MAS soc_ops', evidenceArtifact: 'Evidence bundle tagged PE.L2-3.10.6', owner: 'Security Lead (Morgan)' },
    ],
    evidenceRequired: ['Alternate-work-site policy', 'FIPS full-disk encryption evidence', 'Encrypted remote-access config'],
    acceptanceCriteria: ['Safeguarding measures for CUI at alternate sites are defined and enforced.'],
  },
  // The single POA&M item — special-cased so the workbook explains the POA&M path.
  '3.3.4': {
    objective: 'Alert in the event of an audit logging process failure (NIST 800-171A 3.3.4).',
    whyItMatters: 'This is Mycosoft\'s one planned POA&M item (AU.L2-3.3.4, close 2026-08-31). It is a 1-point control eligible for the POA&M, closed by the Wazuh SIEM deployment + soak.',
    assessmentMethods: ['examine', 'test'],
    responsibleRole: 'Security Lead (Morgan)',
    tools: ['Wazuh SIEM', 'Alerting (email/Slack)', 'PreVeil (POA&M repo)'],
    protocols: ['Audit-failure detection', 'Automated alerting', 'POA&M tracking'],
    references: ['NIST SP 800-171 Rev.2 3.3.4', 'DFARS 252.204-7020 (POA&M)', '32 CFR §170.21 (POA&M eligibility)'],
    estimatedEffort: 'POA&M — close by 2026-08-31',
    steps: [
      { id: 'poam', title: 'Record on the POA&M with owner + close date', detail: 'This control is intentionally on the POA&M. Confirm the POA&M entry: weakness = no audit-failure alerting; remediation = Wazuh; owner = Morgan; close 2026-08-31.', action: 'document', system: 'This dashboard (POA&M) + PreVeil', evidenceArtifact: 'POA&M entry AU.L2-3.3.4', owner: 'Security Lead (Morgan)' },
      { id: 'wazuh', title: 'Deploy Wazuh + configure audit-failure alerting', detail: 'Stand up Wazuh (Day 3 of sprint), configure rules to alert on audit-logging process failure, route alerts to email/Slack, and let it soak.', action: 'deploy', system: 'Wazuh SIEM', evidenceArtifact: 'Wazuh audit-failure alert rule + test alert', owner: 'Security Lead (Morgan)' },
      { id: 'test', title: 'Test the alert fires', detail: 'Simulate an audit-logging failure and confirm the alert fires and is received. Capture the test evidence.', action: 'test', system: 'Wazuh SIEM', evidenceArtifact: 'Alert test screenshot', owner: 'Security Lead (Morgan)' },
      { id: 'close', title: 'Close the POA&M item', detail: 'After the soak, mark the control Implemented and close the POA&M entry with the closure date.', action: 'submit', system: 'This dashboard → MAS soc_ops', evidenceArtifact: 'POA&M closure record', owner: 'Security Lead (Morgan)' },
    ],
    evidenceRequired: ['POA&M entry (AU.L2-3.3.4)', 'Wazuh audit-failure alert rule', 'Alert test evidence'],
    acceptanceCriteria: ['The system alerts on audit-logging process failure.', 'The POA&M item is tracked and closed by 2026-08-31.'],
  },
};

/** Strip a CMMC id ("PE.L2-3.10.1") down to the NIST id ("3.10.1"). */
export function nistIdOf(controlId: string): string {
  const parts = controlId.split('L2-');
  return parts.length > 1 ? parts[1] : controlId;
}

/** Family two-letter code from a NIST 800-171 "3.N.x" id. */
const PREFIX_TO_FAMILY: Record<string, string> = {
  '3.1': 'AC', '3.2': 'AT', '3.3': 'AU', '3.4': 'CM', '3.5': 'IA', '3.6': 'IR',
  '3.7': 'MA', '3.8': 'MP', '3.9': 'PS', '3.10': 'PE', '3.11': 'RA', '3.12': 'CA',
  '3.13': 'SC', '3.14': 'SI',
};

export function familyOf(controlId: string, fallback?: string): string {
  const nist = nistIdOf(controlId);
  const prefix = nist.split('.').slice(0, 2).join('.');
  return PREFIX_TO_FAMILY[prefix] ?? (fallback && FAMILY_META[fallback] ? fallback : 'AC');
}

/**
 * Always returns a non-empty remediation plan for a control: control-specific if
 * authored, otherwise the family template.
 */
export function getRemediationPlan(controlId: string, family?: string): RemediationPlan {
  const nist = nistIdOf(controlId);
  if (CONTROL_OVERRIDES[nist]) return CONTROL_OVERRIDES[nist];
  return familyPlan(familyOf(controlId, family));
}
