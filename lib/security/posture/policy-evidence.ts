// ═══════════════════════════════════════════════════════════════════════════
// Policy & procedure evidence — canonical catalog + evidence classification
// ═══════════════════════════════════════════════════════════════════════════
//
// Single source of truth shared by the compliance page (step-bar labeling) and
// the report engine (Evidence & Documentation Register section).
//
// HONESTY GATE — a policy/procedure document on file evidences the
// *documentation (Examine)* objective of the controls it covers. It advances
// those controls' remediation-step progress bar to PARTIAL. It is NEVER, by
// itself, an implemented/"Met" determination — that additionally requires the
// technical implementation on the real system plus test evidence. This module
// only classifies and attributes documentation evidence; it does not, and must
// not, change a control's status.
//
// Recognition convention (what an `evidence_uri` looks like for a policy doc):
//   • preferred scheme  →  `policy:<FAMILY>`  e.g. `policy:MA` (optionally
//                          `policy:MA#EV-MA-001` to reference the register id)
//   • supporting docs   →  `doc:<kind>`       e.g. `doc:access-agreement`
//   • fallback          →  a filename/path containing the document's tokens
//                          (e.g. `.../POLICY_MA_Maintenance signed.pdf`)
// Any evidence_uri that does not match is simply not attributed to a named
// policy (it still counts as generic evidence and still advances the bar).

/** Minimal control shape needed to attribute policy evidence. */
export interface EvidenceControl {
  id: string;
  family: string;
  status: string;
  evidence?: string[];
  name?: string;
}

export interface PolicyDoc {
  /** Stable id: `policy:<FAM>` for family policies, kebab kind for supporting docs. */
  id: string;
  title: string;
  kind: 'policy' | 'procedure' | 'record';
  /** Family policies evidence every control in this family. */
  family?: string;
  /** Supporting docs evidence an explicit control set (matched loosely by numeric tail). */
  controlIds?: string[];
  /** Lower-case substrings recognised in an evidence_uri (fallback recognition). */
  tokens: string[];
}

// The 14 NIST SP 800-171 / CMMC L2 family policies (Batch B generator output).
const FAMILY_POLICIES: PolicyDoc[] = [
  { id: 'policy:AC', title: 'Access Control Policy', kind: 'policy', family: 'AC', tokens: ['policy:ac', 'policy_ac', 'ac_access_control', 'access control policy', 'access_control_policy'] },
  { id: 'policy:AT', title: 'Security Awareness & Training Policy', kind: 'policy', family: 'AT', tokens: ['policy:at', 'policy_at', 'at_awareness', 'awareness_training', 'security awareness'] },
  { id: 'policy:AU', title: 'Audit & Accountability Policy', kind: 'policy', family: 'AU', tokens: ['policy:au', 'policy_au', 'au_audit', 'audit_accountability', 'audit & accountability', 'audit and accountability'] },
  { id: 'policy:CM', title: 'Configuration Management Policy', kind: 'policy', family: 'CM', tokens: ['policy:cm', 'policy_cm', 'cm_configuration', 'configuration management', 'configuration_mgmt'] },
  { id: 'policy:IA', title: 'Identification & Authentication Policy', kind: 'policy', family: 'IA', tokens: ['policy:ia', 'policy_ia', 'ia_identification', 'identification_auth', 'identification & authentication', 'identification and authentication'] },
  { id: 'policy:IR', title: 'Incident Response Policy', kind: 'policy', family: 'IR', tokens: ['policy:ir', 'policy_ir', 'ir_incident_response', 'incident response policy', 'incident_response_policy'] },
  { id: 'policy:MA', title: 'Maintenance Policy', kind: 'policy', family: 'MA', tokens: ['policy:ma', 'policy_ma', 'ma_maintenance', 'maintenance policy', 'maintenance_policy'] },
  { id: 'policy:MP', title: 'Media Protection Policy', kind: 'policy', family: 'MP', tokens: ['policy:mp', 'policy_mp', 'mp_media', 'media protection', 'media_protection'] },
  { id: 'policy:PS', title: 'Personnel Security Policy', kind: 'policy', family: 'PS', tokens: ['policy:ps', 'policy_ps', 'ps_personnel', 'personnel security', 'personnel_security'] },
  { id: 'policy:PE', title: 'Physical Protection Policy', kind: 'policy', family: 'PE', tokens: ['policy:pe', 'policy_pe', 'pe_physical_protection', 'physical protection policy'] },
  { id: 'policy:RA', title: 'Risk Assessment Policy', kind: 'policy', family: 'RA', tokens: ['policy:ra', 'policy_ra', 'ra_risk', 'risk assessment', 'risk_assessment'] },
  { id: 'policy:CA', title: 'Security Assessment Policy', kind: 'policy', family: 'CA', tokens: ['policy:ca', 'policy_ca', 'ca_security_assessment', 'security assessment policy', 'security_assessment'] },
  { id: 'policy:SC', title: 'System & Communications Protection Policy', kind: 'policy', family: 'SC', tokens: ['policy:sc', 'policy_sc', 'sc_system_comms', 'system & communications', 'system_comms', 'communications protection'] },
  { id: 'policy:SI', title: 'System & Information Integrity Policy', kind: 'policy', family: 'SI', tokens: ['policy:si', 'policy_si', 'si_system_info', 'system & information integrity', 'system_info', 'information integrity'] },
];

// Supporting documents that evidence a specific control set.
const SUPPORTING_DOCS: PolicyDoc[] = [
  { id: 'doc:ir-runbook', title: 'Incident Response Runbook', kind: 'procedure', controlIds: ['IR.L2-3.6.1', 'IR.L2-3.6.2', 'IR.L2-3.6.3'], tokens: ['doc:ir-runbook', 'ir_runbook', 'ir-runbook', 'incident response runbook', 'runbook'] },
  { id: 'doc:access-agreement', title: 'CUI Access Agreement / Acknowledgment', kind: 'record', controlIds: ['PS.L2-3.9.2'], tokens: ['doc:access-agreement', 'access_agreement', 'access-agreement', 'access agreement', 'acknowledgment and agreement'] },
  { id: 'doc:physical-access', title: 'Physical Access Authorization Record', kind: 'record', controlIds: ['PE.L2-3.10.1', 'PE.L2-3.10.2', 'PE.L2-3.10.3'], tokens: ['doc:physical-access', 'physical_access_record', 'physical access authorization', 'physical-access'] },
  { id: 'doc:visitor-log', title: 'Visitor & Physical Access Log', kind: 'record', controlIds: ['PE.L2-3.10.4', 'PE.L2-3.10.5'], tokens: ['doc:visitor-log', 'visitor_log', 'visitor-log', 'visitor log', 'visitor & physical access'] },
];

export const POLICY_DOCS: PolicyDoc[] = [...FAMILY_POLICIES, ...SUPPORTING_DOCS];

const BY_ID = new Map(POLICY_DOCS.map((d) => [d.id, d]));

/** Numeric control tail, e.g. `PE.L2-3.10.1` → `3.10.1`; used for format-tolerant matching. */
function tail(id: string): string {
  const m = String(id ?? '').match(/\d+\.\d+\.\d+/);
  return m ? m[0] : String(id ?? '').toLowerCase();
}

function isRealEvidence(uri: unknown): uri is string {
  const s = String(uri ?? '').trim();
  return s.length > 0 && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined';
}

/** Classify one evidence_uri string to a catalog policy document, or null. */
export function classifyPolicyEvidence(uri: string): PolicyDoc | null {
  if (!isRealEvidence(uri)) return null;
  const s = uri.toLowerCase();

  // Preferred explicit schemes.
  const fam = s.match(/^policy:([a-z]{2})\b/);
  if (fam) {
    const doc = FAMILY_POLICIES.find((d) => d.family?.toLowerCase() === fam[1]);
    if (doc) return doc;
  }
  const kind = s.match(/^doc:([a-z-]+)/);
  if (kind) {
    const doc = SUPPORTING_DOCS.find((d) => d.id === `doc:${kind[1]}`);
    if (doc) return doc;
  }

  // Fallback: token substring match. Supporting docs first so their more
  // specific filenames win over a broad family token (e.g. a physical-access
  // record is not the PE family policy).
  for (const d of [...SUPPORTING_DOCS, ...FAMILY_POLICIES]) {
    if (d.tokens.some((t) => s.includes(t))) return d;
  }
  return null;
}

/** Does this document actually cover this control (guards mis-attribution)? */
function coversControl(doc: PolicyDoc, control: EvidenceControl): boolean {
  if (doc.family) return String(control.family ?? '').toUpperCase() === doc.family;
  if (doc.controlIds) {
    const t = tail(control.id);
    return doc.controlIds.some((c) => tail(c) === t);
  }
  return false;
}

/** The distinct policy documents on file that evidence a given control. */
export function policyEvidenceForControl(control: EvidenceControl): PolicyDoc[] {
  const seen = new Set<string>();
  const out: PolicyDoc[] = [];
  for (const uri of control.evidence ?? []) {
    const doc = classifyPolicyEvidence(String(uri));
    if (doc && coversControl(doc, control) && !seen.has(doc.id)) {
      seen.add(doc.id);
      out.push(doc);
    }
  }
  return out;
}

export interface FiledPolicy {
  doc: PolicyDoc;
  /** Control ids (as given) that carry this document as evidence. */
  controlIds: string[];
}

/** Roll up, across the control set, which policy documents are on file and where. */
export function collectFiledPolicies(controls: EvidenceControl[]): FiledPolicy[] {
  const map = new Map<string, Set<string>>();
  for (const c of controls) {
    for (const doc of policyEvidenceForControl(c)) {
      if (!map.has(doc.id)) map.set(doc.id, new Set());
      map.get(doc.id)!.add(c.id);
    }
  }
  return [...map.entries()]
    .map(([id, ids]) => ({ doc: BY_ID.get(id)!, controlIds: [...ids].sort() }))
    .filter((f) => f.doc)
    .sort((a, b) => a.doc.title.localeCompare(b.doc.title));
}
