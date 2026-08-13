/**
 * FUSARIUM Launchpad — data classification policy content (v1.0).
 *
 * The teaching copy behind /app/launchpad/settings/data-boundary. This is a
 * CONTENT module: it renders the policy for founders who have never done
 * government work, and it must stay honest — enforcement statuses below say
 * what is actually built today, not what is planned to exist.
 *
 * The policy itself: FUSARIUM Launchpad is a COMMERCIAL // NON-CUI workspace.
 * Six data classes, two always-blocked special categories, a verbatim-in-spirit
 * prohibited list, and per-control enforcement status.
 */

import type { Tone } from '@/components/launchpad/ui';
import { COMMERCIAL_NON_CUI_BANNER } from '@/lib/launchpad/constants';

// ---------------------------------------------------------------------------
// Policy metadata
// ---------------------------------------------------------------------------

export const DATA_BOUNDARY_POLICY = {
  version: '1.0',
  effectiveDate: '2026-08-10',
  banner: COMMERCIAL_NON_CUI_BANNER,
} as const;

// ---------------------------------------------------------------------------
// Data classes — six classes plus two special categories that are always
// blocked regardless of class.
// ---------------------------------------------------------------------------

export type AllowedLevel = 'yes' | 'references_only' | 'never';

export interface DataClassCard {
  key: string;
  /** Human name shown on the card. */
  name: string;
  /** 'class' = one of the six policy classes; 'special' = always-blocked category. */
  kind: 'class' | 'special';
  tone: Tone;
  allowed: AllowedLevel;
  /** Plain-English definition — jargon spelled out for first-time readers. */
  definition: string;
  /** "Allowed in Launchpad?" row. */
  allowedDetail: string;
  /** "Can AI features use it?" row. */
  aiUse: string;
  /** "What you do" row. */
  action: string;
  examples: string[];
}

export const DATA_CLASSES: DataClassCard[] = [
  {
    key: 'public',
    name: 'Public',
    kind: 'class',
    tone: 'emerald',
    allowed: 'yes',
    definition:
      'Information that is already public or that you would happily publish: your website copy, published capability statements, public government listings.',
    allowedDetail: 'Yes — store and work with it freely.',
    aiUse: 'Yes — AI drafting and analysis can use it without restriction.',
    action: 'Use it anywhere in the workspace.',
    examples: [
      'Your public capability statement',
      'Your SAM.gov public registration listing',
      'Press releases and published product pages',
    ],
  },
  {
    key: 'customer_non_cui',
    name: 'Customer non-CUI business data',
    kind: 'class',
    tone: 'emerald',
    allowed: 'yes',
    definition:
      'Your ordinary internal business data with no government-imposed safeguarding requirement. This is the home class of the workspace — what Launchpad is built to hold.',
    allowedDetail: 'Yes — this is what the workspace is for.',
    aiUse: 'Yes, under the AI settings you choose (managed credits or your own key).',
    action: 'Store it here; every row stays scoped to your workspace.',
    examples: [
      'Requirement narratives and readiness notes',
      'POA&M milestones and task lists',
      'Training rosters and bill-of-materials part metadata',
    ],
  },
  {
    key: 'customer_restricted',
    name: 'Customer-restricted',
    kind: 'class',
    tone: 'amber',
    allowed: 'references_only',
    definition:
      'Your own sensitive business content — material you restrict internally even though the government does not regulate it. Launchpad holds a pointer to it, never the content.',
    allowedDetail: 'References and metadata only — a title, where it lives, and a content hash (a fingerprint computed from the file, not the file itself).',
    aiUse: 'No — AI features see the metadata you typed, never the underlying content.',
    action: 'Keep the content in your own systems; index a reference here if it serves as evidence.',
    examples: [
      'Unreleased financials or contract pricing',
      'Personnel and HR matters',
      'Board materials and unsigned agreements',
    ],
  },
  {
    key: 'cui',
    name: 'CUI — Controlled Unclassified Information',
    kind: 'class',
    tone: 'red',
    allowed: 'never',
    definition:
      'CUI (Controlled Unclassified Information) is government-created or government-required information that federal rules say must be safeguarded — for example technical data delivered under a defense contract. It is not classified, but it is regulated.',
    allowedDetail: 'Never — not marked CUI, not suspected CUI, not "just this once."',
    aiUse: 'Never. No AI feature in this workspace may receive CUI.',
    action: 'Keep it in your authorized enclave (a government-suitable environment such as PreVeil or Microsoft GCC High). Launchpad can hold a reference to where it lives — nothing more.',
    examples: [
      'Documents marked CUI// or bearing a CUI banner',
      'Contract deliverables from a DoD program office',
      'Controlled technical drawings and specifications',
    ],
  },
  {
    key: 'classified',
    name: 'Classified',
    kind: 'class',
    tone: 'red',
    allowed: 'never',
    definition:
      'National-security information bearing CONFIDENTIAL, SECRET, or TOP SECRET markings. Handling it outside accredited government systems is a serious violation — no commercial SaaS is ever the place for it.',
    allowedDetail: 'Never, under any circumstances.',
    aiUse: 'Never.',
    action: 'Only accredited government systems and cleared facilities. If you believe you have encountered classified material outside one, stop and report through your facility security officer.',
    examples: [
      'Anything with a classification banner or portion markings',
      'Material from a classified network or SCIF',
    ],
  },
  {
    key: 'export_controlled',
    name: 'Export-controlled',
    kind: 'class',
    tone: 'red',
    allowed: 'never',
    definition:
      'Technical data restricted by export-control law — ITAR (the International Traffic in Arms Regulations, covering defense articles) or EAR (the Export Administration Regulations, covering dual-use technology). Sharing it with the wrong system or person can itself be an unlawful export.',
    allowedDetail: 'Never — Launchpad is not an authorized export-controlled environment.',
    aiUse: 'Never. AI features also never classify data as ITAR/EAR for you — that determination belongs with export counsel.',
    action: 'Keep it in an authorized environment and involve export-control counsel. Launchpad can track that a determination is pending — not the data itself.',
    examples: [
      'ITAR-controlled design files or source code',
      'EAR-controlled technology subject to a license requirement',
    ],
  },
  {
    key: 'credentials',
    name: 'Credentials & secrets',
    kind: 'special',
    tone: 'red',
    allowed: 'never',
    definition:
      'Anything that grants access: passwords, API secrets (machine-to-machine access keys), private keys, tokens, recovery codes. Always blocked as stored content, regardless of what data class the system they unlock belongs to.',
    allowedDetail: 'Never stored as content. Launchpad-issued API keys exist only as hashes — a one-way fingerprint we can verify but never reverse.',
    aiUse: 'Never. A pasted secret is a spilled secret — rotate it.',
    action: 'Keep secrets in a password manager or secrets vault. The one planned exception — optional bring-your-own AI provider keys under KMS envelope encryption (an encrypt-at-rest design where a cloud key service wraps a per-workspace key) — requires policy v1.1 and a live KMS backend before it accepts real keys.',
    examples: [
      'Portal passwords (SAM.gov, PIEE, DSIP)',
      'Cloud provider access keys and tokens',
      'Private signing keys and recovery codes',
    ],
  },
  {
    key: 'raw_telemetry',
    name: 'Raw telemetry & logs',
    kind: 'special',
    tone: 'red',
    allowed: 'never',
    definition:
      'Unprocessed machine output: packet captures, full endpoint logs, unredacted SIEM exports (a SIEM is the security information and event management system that collects your logs). Raw telemetry routinely embeds credentials, personal data, and network internals — so it is blocked wholesale.',
    allowedDetail: 'Never as raw data. Only sanitized, structured pass/fail results (for example from the Local Assurance Agent running on your own machines) are accepted.',
    aiUse: 'Never on raw data. AI features may discuss the sanitized results.',
    action: 'Keep raw logs in your own logging stack. Record here only what a result was, not the log lines that produced it.',
    examples: [
      'Packet captures (.pcap files)',
      'Unredacted SIEM or EDR log exports',
      'Full syslog / firewall log dumps',
    ],
  },
];

// ---------------------------------------------------------------------------
// Prohibited examples — the concrete "never paste these" list.
// ---------------------------------------------------------------------------

export const PROHIBITED_EXAMPLES: string[] = [
  'Passwords, passphrases, or recovery codes — yours or anyone else’s',
  'API secrets, access tokens, or private keys',
  'Social Security numbers or other government-issued personal identifiers',
  'SF-86 material (the federal background-investigation questionnaire) or any background-investigation content',
  'Raw packet captures',
  'Unredacted SIEM or endpoint logs',
  'CUI documents — or screenshots, photos, or excerpts of them',
];

// ---------------------------------------------------------------------------
// Enforcement controls — HONEST per-control status. "Pending" means the
// backend piece does not exist yet; we say so rather than implying coverage.
// ---------------------------------------------------------------------------

export type EnforcementStatus = 'live' | 'partial' | 'pending';

export interface EnforcementControl {
  control: string;
  status: EnforcementStatus;
  detail: string;
  href?: string;
  hrefLabel?: string;
}

export const ENFORCEMENT_CONTROLS: EnforcementControl[] = [
  {
    control: 'Persistent workspace banner',
    status: 'live',
    detail: `Every authenticated screen carries the ${COMMERCIAL_NON_CUI_BANNER} banner so the boundary is never out of sight.`,
  },
  {
    control: 'Onboarding acknowledgment',
    status: 'live',
    detail: 'Creating a workspace requires acknowledging this boundary — no one lands here without having seen it.',
  },
  {
    control: 'Prompt firewall',
    status: 'live',
    detail: 'AI requests are screened before any model call: prohibited-claim vocabulary and boundary patterns are refused, not forwarded.',
  },
  {
    control: 'Per-object classification labels',
    status: 'partial',
    detail: 'The evidence index carries evidence types today; a classification label on every record type across the workspace is not built yet.',
  },
  {
    control: 'Upload interceptor + DLP scan',
    status: 'pending',
    detail: 'DLP (data-loss prevention — automated scanning that blocks prohibited content before it is stored) is a pending backend piece. Today’s honest control is architectural: there is no file-upload path at all, so evidence is metadata and hashes only.',
  },
  {
    control: 'Quarantine queue',
    status: 'pending',
    detail: 'The review queue for blocked items is not built yet. Until it exists, blocked means refused outright — nothing is held in between.',
  },
  {
    control: 'Immutable blocked-event audit',
    status: 'partial',
    detail: 'The append-only, hash-chained audit ledger is live; automatic capture of blocked events into it is pending the DLP backend.',
  },
  {
    control: 'Customer export',
    status: 'live',
    detail: 'A complete JSON export of your workspace data, on demand, any time — including in read/export mode.',
    href: '/app/launchpad/settings/export',
    hrefLabel: 'Open data export',
  },
];

// ---------------------------------------------------------------------------
// Incident guidance — what to do when CUI shows up where it should not be.
// ---------------------------------------------------------------------------

export const INCIDENT_GUIDANCE = {
  title: 'Found CUI where it should not be?',
  intro:
    'If you see CUI — marked or suspected — inside this workspace or any other unauthorized system, treat it as a spill. Speed and containment matter more than blame.',
  steps: [
    'Stop. Do not keep working with the material — no summarizing, no editing, no AI actions on it.',
    'Do not forward, copy, download, or screenshot it. Every copy widens the spill.',
    'Contact your workspace owner immediately and tell them exactly where the material is.',
    'Move the work to your authorized enclave (your government-suitable environment, such as PreVeil or GCC High). That is where the material — and the conversation about it — belongs.',
    'Report it to Launchpad support through your workspace owner so the record can be removed and the event logged. Describe where it is — never paste the content itself into a support message.',
  ],
  closing:
    'Your contracts may carry their own reporting duties (for defense contracts, DFARS 252.204-7012 cyber-incident reporting runs on a 72-hour clock). Launchpad support handles the workspace side; your own reporting obligations remain yours.',
} as const;
