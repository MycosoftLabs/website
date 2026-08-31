/**
 * Standing record — the narrative half of the closure board.
 *
 * The problem this file solves: a written statement about posture ("X is closed",
 * "Y stays Partial by design") is true when written and quietly wrong later. A
 * static block of prose on a live page is a honesty-gate hazard, because a reader
 * cannot tell whether it still holds.
 *
 * So every statement declares the live MAS conditions it depends on. The route
 * evaluates those conditions on each request:
 *   - all hold      → the statement is shown, marked verified, with the timestamp
 *   - any fails     → the statement is shown FLAGGED, naming the condition that
 *                     broke, so nobody reads a superseded claim as current
 *
 * Statements with no conditions are standing facts (methodology, scope rules)
 * that do not depend on posture and cannot go stale.
 */

export type Expectation =
  /** a requirement must currently be in one of these MAS states */
  | { kind: 'state'; id: string; anyOf: string[]; because: string }
  /** the CMMC_L2 and NIST_800_171 twin rows must agree across the board */
  | { kind: 'twins-clean'; because: string };

export interface Statement {
  id: string;
  /** headline — short, factual */
  title: string;
  /** 'action' = something still to do · 'record' = settled · 'standing' = always-true rule */
  kind: 'action' | 'record' | 'standing';
  owner?: string;
  /** paragraphs of prose */
  body: string[];
  expects: Expectation[];
}

export const STANDING_RECORD: Statement[] = [
  {
    id: 'ST-CA-3121-ERRATUM',
    kind: 'action',
    owner: 'SAO — erratum annotation, do not re-sign',
    title: 'Arithmetic defect in a signed evidence artifact — needs an erratum, not a re-signature',
    body: [
      'The signed <code>EV-CA-3.12.1-ASSESSMENT-FREQUENCY-JUL30</code> prints, in one table: Met 91 · Partial 17 · N/A 2 · NC 0, the method “110 minus the verified Annex A weight of every Partial”, and a projected SPRS of <b>+67</b>.',
      'Those 17 Partials weigh 47. 110 − 47 = <b>+63</b>. +67 would require a deduction of 43 — four points less than the requirements listed on the same page actually weigh. The figure does not follow from the document’s own counts or its own stated method. +63 and <code>05:06:53Z</code> were filled before conversion; the signed page shows +67 and <code>05:30Z</code>, so it was altered after that fill.',
      'This does not invalidate the Met. CA.L2-3.12.1 is evidenced by objective [a] — quarterly frequency defined — and [b] — one assessment performed 07-28 to 07-30. The SPRS cell is contextual, not the evidence. But it is a wrong number inside a signed record, and an assessor who recomputes from the printed counts will land on 63. File a one-line erratum annotation citing the corrected figure. <b>Do not re-sign; do not silently leave it.</b>',
    ],
    expects: [
      { kind: 'state', id: 'CA.L2-3.12.1', anyOf: ['implemented'],
        because: 'The erratum is written on the premise that CA.L2-3.12.1 is Met and only the contextual SPRS cell is wrong.' },
    ],
  },
  {
    id: 'ST-SPRS-NOT-A-COUNT',
    kind: 'standing',
    title: 'A Met count is not an SPRS score',
    body: [
      'The §170.21 threshold of 88 is a <b>weighted score</b>. It is not the number of requirements marked Met, and the two move independently — a board can read 95 Met and still score below 88 if the open items are heavy.',
      'Only the score is tested. Every figure on this page is recomputed from live MAS at load; none of it is a stored total.',
    ],
    expects: [],
  },
  {
    id: 'ST-REMOTE-ACCESS',
    kind: 'record',
    owner: 'Cursor — session evidence',
    title: 'Remote access: the scan is done; the gates are elsewhere',
    body: [
      '<code>EV-RA-OFFLAN-WAN-SCAN-JUL29</code> ran from a temporary Mycosoft AWS EC2 vantage — valid independent external ground truth, top-100 TCP plus 8006 filtered / no-response. Two earlier positions are <b>retracted</b>: that no independent external vantage existed, and that nothing older than 07-27 was retained.',
      'AC.L2-3.1.12 / .14 / .15 stay Partial on the gates the signed dual-ACP determination itself names: retained WireGuard session and event evidence with documented retention · individual phone-VPN authorization and key custody · a qualified dated session review · per-session correlation from SSH to authorized identity to sudo/Docker/LXD.',
      '<b>The scan answered exposure. It did not answer session monitoring.</b>',
    ],
    expects: [
      { kind: 'state', id: 'AC.L2-3.1.12', anyOf: ['partial'],
        because: 'This statement explains why AC.L2-3.1.12 is still Partial. If it has closed, the explanation is superseded.' },
    ],
  },
  {
    id: 'ST-IA-3153-APPS',
    kind: 'record',
    title: 'IA.L2-3.5.3 closed — and the apps@ disposition is recorded correctly',
    body: [
      'Workspace 2SV enforced (audit 2026-07-28), the 29 July user export shows every active account enrolled including apps@, and the GitHub org requires 2FA with security-key/passkey only. Banked as <code>EV-IA-3.5.3-WORKSPACE-2SV-JUL29</code>. The 27 July report is pre-enforcement lag, retained as stale, not a current gap.',
      '<code>apps@mycosoft.org</code> is a non-person entity with a <b>single password custodian — Morgan Rockcoons, SAO</b>. RJ Ricasata holds no credential for it; mail forwards to both company inboxes for operational awareness only. <b>This is not a shared interactive login and must never be described as dual control.</b> Sole custody with 2SV enrolled is the accurate and defensible characterisation.',
    ],
    expects: [
      { kind: 'state', id: 'IA.L2-3.5.3', anyOf: ['implemented'],
        because: 'Recorded as closed. A reopen would mean the 2SV evidence no longer carries the control.' },
    ],
  },
  {
    id: 'ST-RESOLVED',
    kind: 'record',
    title: 'Resolved and closed out',
    body: [
      '<b>Twin-row divergence</b> — reconciled twice; currently 0 mismatches, with <code>implementation_percent</code> equal to <code>met_percent</code>. Checked again on every load of this board.',
      '<b>Legacy HMAC-SHA1 SSH MACs</b> — removed, recorded in <code>EV-SSH-MACS-SHA2-AFTERSTATE-JUL29</code>, and the reason AC.L2-3.1.13 could close.',
      '<b>Evidence-register 404</b> — repaired, HTTP 200, ~120 entries. <b>The four integrity issues</b> raised against the 07-29 batch — each cleared with an independently recomputed hash. <b>Credential exposure</b> — rotated, filed as <code>EV-IR-CREDENTIAL-ROTATION-HANDLED</code> against resolved incident <code>db0bc1a1</code>.',
    ],
    expects: [
      { kind: 'twins-clean',
        because: 'This statement asserts twin rows are reconciled. Live divergence would contradict it directly.' },
      { kind: 'state', id: 'AC.L2-3.1.13', anyOf: ['implemented'],
        because: 'The MAC removal is cited as the reason AC.L2-3.1.13 closed.' },
    ],
  },
  {
    id: 'ST-SAO-DISPOSITIONED',
    kind: 'record',
    title: 'SAO-dispositioned, not open findings',
    body: [
      'VPN reachability to <code>192.168.0.0/24</code> where the three in-scope VMs sit; the Cloudflare Tunnel’s second hop to <code>192.168.0.172:18003</code>; and <code>mycosoft</code> holding root-equivalent access through <code>docker</code> and <code>lxd</code> — all raised, reviewed, and <b>accepted by the SAO as intended architecture</b>.',
      'The privilege paths are enumerated in <code>EV-AC-PRIVILEGE-PATHS-SUDO-DOCKER-LXD-JUL29</code>, which AC.L2-3.1.5 and AC.L2-3.1.7 are now bound to.',
    ],
    expects: [
      { kind: 'state', id: 'AC.L2-3.1.5', anyOf: ['implemented'],
        because: 'Bound to the privilege-path enumeration. A reopen means that binding no longer carries the control.' },
      { kind: 'state', id: 'AC.L2-3.1.7', anyOf: ['implemented'],
        because: 'Bound to the same enumeration.' },
    ],
  },
  {
    id: 'ST-SUPERSEDED-V1',
    kind: 'record',
    title: 'Two documents carry a superseded v1',
    body: [
      'PS.L2-3.9.1 and SC.L2-3.13.11 were first signed with their decision fields blank — a <b>document-design failure</b>: the fields sat in the body where a signature flow never forces them. Both were reissued as v2 with every decision inside the signature block. v1 PDFs retained, renamed <code>_SUPERSEDED_BY_V2_</code>.',
      'PS.L2-3.9.1 is now Met — RJ concurred and dated page 4. <b>SC.L2-3.13.11 remains Partial by design</b> on branch C as POA&amp;M item P1 — <b>do not transition it.</b>',
    ],
    expects: [
      { kind: 'state', id: 'PS.L2-3.9.1', anyOf: ['implemented'],
        because: 'Recorded as Met on the v2 signature with RJ’s concurrence.' },
      { kind: 'state', id: 'SC.L2-3.13.11', anyOf: ['partial'],
        because: 'Held Partial deliberately as POA&M item P1. If it has been transitioned, that was not authorised by this record.' },
    ],
  },
  {
    id: 'ST-DOCUSIGN-LIMIT',
    kind: 'standing',
    title: 'Standing verification limit — signature presence is provable, field completion is not',
    body: [
      'DocuSign flattens AcroForm fields on signing. Signature <b>presence</b> is provable from the raw bytes (<code>/ByteRange</code> plus <code>adbe.pkcs7</code>); field <b>completion</b> is not — flattening scrambles text extraction.',
      'That is exactly how the v1 blank-decision failure went undetected. <b>Confirm decision fields visually before any transition that depends on them.</b> Note also that <code>/FT /Sig</code> matches empty signature fields and produces false positives; it is not a signature test.',
    ],
    expects: [],
  },
  {
    id: 'ST-STATE-MODEL',
    kind: 'standing',
    title: 'How the state model works',
    body: [
      'Every status on this board is <b>read from live MAS and locked</b> — this page is not the system of record and never writes to it. There are no hand-tickable boxes and no local state: if a requirement shows Met here, MAS says Met.',
      '“Held by design” means a signed determination is filed and the control stays Partial deliberately. Point totals are <b>projections of what filed evidence supports</b>, never claims of achieved status.',
      'The guidance text under each requirement is the standing action that closes it. The <b>status</b> beside it is live, so a closed item is visibly closed the moment MAS says so.',
    ],
    expects: [],
  },
];
