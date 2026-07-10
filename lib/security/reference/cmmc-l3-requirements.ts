// ═══════════════════════════════════════════════════════════════════════════
// CMMC Level 3 — 24 Enhanced Requirements (NIST SP 800-172)
// ═══════════════════════════════════════════════════════════════════════════
//
// Source: Perplexity primary-source doc (2026-07-10), §3, drawn from the CMMC
// Assessment Guide – Level 3 and codified at 32 CFR §170.14(c)(4).
// REFERENCE ONLY — not part of Mycosoft's current L2 sprint. L3 begins appearing
// in solicitations at Phase 3 (2027-11-10) and requires a prior FINAL Level 2
// (C3PAO) status; assessed only by DCMA DIBCAC (no self-assessment counts).

export interface L3Requirement {
  id: string; // e.g. "AC.L3-3.1.2e"
  family: string; // "AC"
  title: string;
  guidance: string;
  poamIneligible?: boolean; // per §170.21(a)(3) secondary compilations (VERIFY)
}

export const CMMC_L3_REQUIREMENTS: L3Requirement[] = [
  { id: 'AC.L3-3.1.2e', family: 'AC', title: 'Organizationally Controlled Assets', guidance: 'Restrict system access to only resources owned, provisioned, or issued by the organization — no unmanaged BYOD access to CUI enclaves.' },
  { id: 'AC.L3-3.1.3e', family: 'AC', title: 'Secured Information Transfer', guidance: 'Employ secure information-transfer solutions controlling information flows between distinct security domains on connected systems.' },
  { id: 'AT.L3-3.2.1e', family: 'AT', title: 'Advanced Threat Awareness', guidance: 'Provide threat-focused awareness training at hire, after significant cyber events, and at least annually, covering social engineering and APT-actor tactics.' },
  { id: 'AT.L3-3.2.2e', family: 'AT', title: 'Practical Training Exercises', guidance: 'Include role-tailored practical exercises (general, specialized, privileged users) aligned to current threat scenarios, with feedback to participants and supervisors.' },
  { id: 'CM.L3-3.4.1e', family: 'CM', title: 'Authoritative Repository', guidance: 'Maintain an authoritative source/repository of approved and implemented system components for accountability.' },
  { id: 'CM.L3-3.4.2e', family: 'CM', title: 'Automated Detection & Remediation', guidance: 'Automatically detect misconfigured/unauthorized components and quarantine or remediate them.' },
  { id: 'CM.L3-3.4.3e', family: 'CM', title: 'Automated Inventory', guidance: 'Use automated discovery/management tooling to keep a complete, accurate, current component inventory.' },
  { id: 'IA.L3-3.5.1e', family: 'IA', title: 'Bidirectional Authentication', guidance: 'Authenticate systems/components to each other (cryptographically based, replay-resistant) before network connections are established.' },
  { id: 'IA.L3-3.5.3e', family: 'IA', title: 'Block Untrusted Assets', guidance: 'Prohibit unknown, unauthenticated, or improperly configured components from connecting to organizational systems.' },
  { id: 'IR.L3-3.6.1e', family: 'IR', title: 'Security Operations Center', guidance: 'Establish and maintain a 24/7 SOC capability (remote/on-call staffing permitted).', poamIneligible: true },
  { id: 'IR.L3-3.6.2e', family: 'IR', title: 'Cyber Incident Response Team', guidance: 'Maintain a cyber incident response team deployable within 24 hours.', poamIneligible: true },
  { id: 'PS.L3-3.9.2e', family: 'PS', title: 'Adverse Information', guidance: 'Protect organizational systems if adverse information develops or is obtained about individuals with CUI access.' },
  { id: 'RA.L3-3.11.1e', family: 'RA', title: 'Threat-Informed Risk Assessment', guidance: 'Use threat intelligence (open, commercial, and DoD-provided) to inform risk assessments and architecture/security decisions.', poamIneligible: true },
  { id: 'RA.L3-3.11.2e', family: 'RA', title: 'Threat Hunting', guidance: 'Conduct ongoing/aperiodic threat-hunting activities to detect indicators of compromise evading existing controls.' },
  { id: 'RA.L3-3.11.3e', family: 'RA', title: 'Advanced Risk Identification', guidance: 'Employ advanced automation/analytics to predict and identify organizational and system risk.' },
  { id: 'RA.L3-3.11.4e', family: 'RA', title: 'Security Solution Rationale', guidance: 'Document the selected security solution and its rationale/risk determination in the SSP.', poamIneligible: true },
  { id: 'RA.L3-3.11.5e', family: 'RA', title: 'Security Solution Effectiveness', guidance: 'Assess security-solution effectiveness at least annually or upon new threat intelligence/incidents.' },
  { id: 'RA.L3-3.11.6e', family: 'RA', title: 'Supply Chain Risk Response', guidance: 'Assess, respond to, and monitor supply-chain risks tied to organizational systems and components.', poamIneligible: true },
  { id: 'RA.L3-3.11.7e', family: 'RA', title: 'Supply Chain Risk Plan', guidance: 'Develop and annually update a supply-chain risk management plan.', poamIneligible: true },
  { id: 'CA.L3-3.12.1e', family: 'CA', title: 'Penetration Testing', guidance: 'Conduct penetration testing at least annually or after significant security changes, using automated tools plus subject-matter-expert testing.' },
  { id: 'SC.L3-3.13.4e', family: 'SC', title: 'Isolation', guidance: 'Employ physical and/or logical isolation techniques for systems/components.' },
  { id: 'SI.L3-3.14.1e', family: 'SI', title: 'Integrity Verification', guidance: 'Verify integrity of security-critical/essential software via root-of-trust mechanisms or cryptographic signatures.' },
  { id: 'SI.L3-3.14.3e', family: 'SI', title: 'Specialized Asset Security', guidance: 'Ensure IoT/IIoT/OT/GFE/Restricted Information Systems/test equipment are either in-scope for enhanced requirements or segregated into purpose-specific networks.' },
  { id: 'SI.L3-3.14.6e', family: 'SI', title: 'Threat-Guided Intrusion Detection', guidance: 'Use threat-indicator information (open, commercial, DoD-provided) to guide intrusion detection and threat-hunting activity.' },
];

export const CMMC_L3_META = {
  totalRequirements: 24,
  source: 'NIST SP 800-172 / CMMC Assessment Guide – Level 3; 32 CFR §170.14(c)(4)',
  assessor: 'DCMA DIBCAC only (no self-assessment counts toward L3 status)',
  prerequisite: 'Final Level 2 (C3PAO) status required before an L3 assessment may proceed',
  threatModel: 'Advanced Persistent Threat (APT) actors — protection of CUI tied to critical programs / high value assets',
  phaseStart: '2027-11-10', // Phase 3
  phaseNote: 'L3 requirements begin appearing in solicitations at Phase 3 (2027-11-10). Plan L2 self → L2 C3PAO → L3 DIBCAC; the C3PAO step cannot be skipped.',
  verifyTacoL3: 'VERIFY whether NUWC TAC-O Phase 2 (N66604-26-9-A00X) requires L3 sooner via a contract-specific clause rather than the general phase schedule.',
} as const;
