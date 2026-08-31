// IR.L2-3.6.3 — Rapid HITL tabletop facilitation script (data only).
//
// Source of truth: docs/cmmc_evidence/ir/EV-IR-3.6.3_RAPID_HITL_SCRIPT_JUL22_2026.md
// and EV-IR-3.6.3_HITL_DECISION_CAPTURE_JUL22_2026.md.
//
// Honesty gate: this module carries the QUESTIONS only. It must never carry a
// default answer, attendance mark, or timestamp — running the discussion with
// Morgan and RJ *is* the tabletop, and pre-filling any of it would fabricate
// attendance evidence on an attestation control. Nothing here promotes
// IR.L2-3.6.3 or writes soc_ops; the control becomes evidence-ready only after
// the AAR is signed via DocuSign, stored, hashed, and registered as EV-IR-001.

export type QType = 'one' | 'many';

export interface TabletopQuestion {
  /** Stable key — persisted in the saved session record. Do not renumber. */
  k: string;
  /** Question text, verbatim from the facilitation script. */
  t: string;
  type: QType;
  options: string[];
  /** Label for the free-text escape hatch, when the script allows one. */
  other?: string;
  /** Whether the script provides a Notes line for this question. */
  notes?: boolean;
}

export interface TabletopInject {
  id: 'A' | 'B' | 'C';
  title: string;
  premise: string;
  /** Modeled MYCA automated-responder actions — read as context, not performed. */
  modeled: string;
  questions: TabletopQuestion[];
}

export const BOUNDARY_STATEMENT =
  'This is a fictitious tabletop. We will not run a live ransomware response, process or paste CUI, ' +
  'wipe a device, revoke a real session, modify a VM, or send an external notice. We will record the ' +
  'decisions we would make if the scenario were real.';

export const CLASSIFICATION =
  'UNCLASSIFIED exercise-administration record — fictitious scenarios only; no CUI, PII, credentials, or production actions';

export const INJECTS: TabletopInject[] = [
  {
    id: 'A',
    title: 'Inject A — Simulated ransomware on a non-CUI or boundary-adjacent host',
    premise:
      'A hypothetical endpoint shows a ransom note and mass file renaming. The scope is not yet confirmed. No endpoint is actually isolated or restored.',
    modeled:
      'SecurityAgent opens a high-severity-pending-scope incident and requests endpoint + CUI-boundary identification. ' +
      'Guardian correlates indicators; N8N starts a simulated audit timeline. DeploymentAgent models MAS, MINDEX, and ' +
      'Sandbox scope as unaffected. MYCA recommends isolation, volatile-evidence preservation, session review, and ' +
      'authorized indicator blocking. SecurityAgent prepares a reportability decision packet — no external notice or ' +
      'containment action occurs automatically.',
    questions: [
      { k: 'A1', t: 'Scope: Is the hypothetical endpoint inside the CUI boundary?', type: 'one', notes: true,
        options: ['Yes', 'No', 'Unknown; treat as boundary-relevant pending validation'] },
      { k: 'A2', t: 'Containment: Would Morgan authorize immediate network isolation while preserving evidence?', type: 'one', notes: true,
        options: ['Yes', 'No'], other: 'Defer pending' },
      { k: 'A3', t: 'Notifications: Would this scenario require counsel, cyber insurer, customer/prime, or DIBNet review?', type: 'many', other: 'Other',
        options: ['None at this stage', 'Counsel', 'Insurer', 'Customer/prime', 'DIBNet assessment'] },
      { k: 'A4', t: 'Recovery: Choose the preferred recovery path after scope validation.', type: 'one', other: 'Other',
        options: ['Restore from validated backup', 'Wipe/clean rebuild'] },
      { k: 'A5', t: 'Finance: Does RJ authorize any payment, vendor engagement, or banking action now?', type: 'one', other: 'Approve / defer',
        options: ['No payment or external spend without separate approval'] },
    ],
  },
  {
    id: 'B',
    title: 'Inject B — Simulated CUI paste to a commercial AI system',
    premise:
      'A participant hypothetically attempts to paste CUI into a commercial AI session. No CUI is entered into this document, Cursor, or any AI system.',
    modeled:
      'Guardian detects the simulated prohibited prompt pattern and blocks further modeled processing. MYCA models session ' +
      'termination/revocation where supported, opens an immutable incident-log entry, and targets notification to Morgan ' +
      'within one hour. SecurityAgent prepares spillage-triage questions: what, where, provenance, retention/deletion ' +
      'controls, and affected parties. N8N routes the simulated case to Morgan’s approval queue and a corrective-action ' +
      'queue; it sends no external notice automatically. MYCA records coaching and DLP/prompt-guardrail recommendations; ' +
      'SecurityAgent drafts a reportability assessment marked for SAO/legal determination.',
    questions: [
      { k: 'B1', t: 'Classification: Treat this hypothetical event as a suspected CUI spillage until facts prove otherwise?', type: 'one', other: 'Need facts',
        options: ['Yes', 'No'] },
      { k: 'B2', t: 'Immediate containment: Would Morgan direct stop/contain actions, preserve logs, and revoke the affected session where supported?', type: 'one', notes: true, other: 'Defer pending',
        options: ['Yes', 'No'] },
      { k: 'B3', t: 'Notification: Which review path would Morgan initiate for a real event?', type: 'many', other: 'Other',
        options: ['Morgan/SAO within one hour', 'Counsel', 'Customer/prime', 'DIBNet assessment'] },
      { k: 'B4', t: 'External reporting: May MYCA send external notifications automatically?', type: 'one', other: 'Other policy decision',
        options: ['No; Morgan/SAO approves each external notice'] },
      { k: 'B5', t: 'Corrective action: Accept a POA&M for commercial-AI DLP, alerting, and session-kill validation?', type: 'one', other: 'Modify owner/date',
        options: ['Yes', 'No'] },
    ],
  },
  {
    id: 'C',
    title: 'Inject C — Simulated lost or stolen CUI-capable laptop',
    premise:
      'A CUI-capable laptop is reported missing. PreVeil remote wipe is not assumed available until live enrollment and capability are validated. No account is disabled and no device is wiped in this tabletop.',
    modeled:
      'MYCA opens a simulated lost/stolen incident and requests asset owner, last-known location, and CUI-boundary status. ' +
      'MYCA recommends disabling accounts, revoking sessions, rotating high-risk credentials, and preserving device/account ' +
      'logs. N8N creates simulated review tasks for security, operations, insurer, and counsel; it does not send ' +
      'notifications. MYCA records remote wipe as a POA&M dependency pending validation of live PreVeil administration and ' +
      'asset enrollment. SecurityAgent prepares an encryption, inventory, PreVeil-status, and access-log checklist, then ' +
      'recommends replacement, enrollment validation, credential reset, and review.',
    questions: [
      { k: 'C1', t: 'Scope: Would Morgan treat the missing laptop as CUI-boundary relevant until inventory, encryption, and PreVeil status are verified?', type: 'one', other: 'Need facts',
        options: ['Yes', 'No'] },
      { k: 'C2', t: 'Account containment: Would Morgan authorize immediate account disablement/session revocation and high-risk credential rotation?', type: 'one', notes: true, other: 'Defer pending',
        options: ['Yes', 'No'] },
      { k: 'C3', t: 'Remote wipe: Should a remote wipe be requested only after live-tool availability and asset enrollment are confirmed?', type: 'one', other: 'Other',
        options: ['Yes', 'No'] },
      { k: 'C4', t: 'Notifications: Which review path would be initiated for a real loss?', type: 'many', other: 'Other',
        options: ['Counsel', 'Insurer', 'Law enforcement', 'Customer/prime', 'DIBNet assessment', 'None pending facts'] },
      { k: 'C5', t: 'Finance/recovery: Does RJ approve replacement-device/insurance work only through separate, recorded approval?', type: 'one', other: 'Other',
        options: ['Yes', 'No'] },
    ],
  },
];

export const CLOSEOUT_FIELDS: Array<{ k: string; label: string }> = [
  { k: 'c_worked', label: 'What worked in this human discussion' },
  { k: 'c_unresolved', label: 'Unresolved issues / decision assumptions to reflect in the AAR' },
  { k: 'c_poam', label: 'POA&M owner or target-date changes (ID · owner · date)' },
  { k: 'c_actions', label: 'Additional corrective actions proposed' },
];

/** Total decisions that must be recorded before a capture can be generated. */
export const DECISION_COUNT = INJECTS.reduce((n, i) => n + i.questions.length, 0);

export const PARTICIPANTS = [
  { k: 'morgan', name: 'Morgan Rockcoons', role: 'Incident Commander / SAO' },
  { k: 'rj', name: 'RJ Ricasata', role: 'Finance / Operations' },
] as const;
