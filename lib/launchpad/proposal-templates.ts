/**
 * FUSARIUM Launchpad — portal-specific proposal checklist templates.
 *
 * Factual, neutral workbook content for founders who have never submitted to a
 * government portal. Every template states registration prerequisites, typical
 * volumes, formatting reminders, and deadline discipline — and where a rule
 * varies by solicitation it says "check the solicitation" rather than invent
 * an agency rule. Nothing here is legal advice and nothing here submits
 * anything: THE CUSTOMER SUBMITS ON THE GOVERNMENT PORTAL THEMSELVES.
 *
 * The checklist arrays seed a new proposal workspace's task list (stored in
 * the workspace row's jsonb). They are template to-dos — not records, not
 * statuses, not mock data.
 */

export const PORTAL_KEYS = ['sam', 'dsip', 'grants_gov', 'nspires', 'research_gov', 'diu', 'other'] as const;
export type PortalKey = (typeof PORTAL_KEYS)[number];

/** One checkable item in a workspace's submission checklist (persisted in jsonb). */
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  done_at?: string | null;
}

/** One row of the compliance-matrix skeleton (persisted in jsonb). */
export interface MatrixRow {
  id: string;
  /** The requirement text ("shall" statement) lifted from the solicitation. */
  requirement: string;
  /** Where in your proposal it is addressed (volume/section/page). */
  section: string;
  status: 'open' | 'addressed';
}

export interface PortalTemplate {
  portal: PortalKey;
  label: string;
  officialUrl: string;
  /** One-paragraph plain-language explanation of what this portal is. */
  summary: string;
  registration: string[];
  volumes: string[];
  formatting: string[];
  deadlines: string[];
  checklist: string[];
}

/** The boundary sentence rendered on every proposals screen. */
export const PROPOSAL_BOUNDARY_NOTE =
  'You certify and submit on the government portal yourself. Launchpad organizes ' +
  'the work — it never submits, signs, or certifies anything on your behalf.';

const COMMON_TAIL: string[] = [
  'Read the FULL solicitation, including every attachment and amendment, before writing',
  'Build the compliance matrix: one row per requirement ("shall") in the instructions',
  'Confirm the exact due date, time, AND timezone on the official posting',
  'Plan an internal deadline 24–48 hours before the real one',
  'You certify and submit on the government portal yourself — Launchpad never submits; record the confirmation number after you do',
];

export const PORTAL_TEMPLATES: Record<PortalKey, PortalTemplate> = {
  sam: {
    portal: 'sam',
    label: 'SAM.gov',
    officialUrl: 'https://sam.gov',
    summary:
      'SAM.gov is the federal System for Award Management — where entities register to do ' +
      'business with the government and where contract opportunities are posted. Registration is free.',
    registration: [
      'Active SAM.gov entity registration (free) — this issues your Unique Entity ID (UEI)',
      'A CAGE code — assigned automatically during SAM registration for U.S. entities',
      'Representations & certifications completed inside your SAM registration',
      'Renew the registration annually — an expired registration can make you ineligible for award',
    ],
    volumes: [
      'FAR-based solicitations typically define proposal structure in Section L (instructions) and evaluate per Section M (criteria) — mirror both exactly',
      'Common volumes are technical, past performance, and price/cost — but the solicitation controls; check the solicitation',
      'The submission method varies (portal, email, PIEE, or another system) — check the solicitation',
    ],
    formatting: [
      'Follow page limits, fonts, and margins exactly as instructed — non-conforming proposals can be rejected without evaluation',
      'Answer in the order the instructions ask, so evaluators can verify compliance quickly',
      'Where a rule is not stated, check the solicitation or ask during the Q&A window',
    ],
    deadlines: [
      'The stated due date/time with its timezone is a hard cutoff — late offers are generally not accepted, with narrow exceptions',
      'Track the question-submission deadline separately — it closes earlier than the proposal deadline',
      'Submit early: transmission problems on the last day are on you, not the government',
    ],
    checklist: [
      'Verify SAM.gov entity registration is ACTIVE (not just submitted) and not near expiry',
      'Confirm your NAICS/size status makes you eligible for any set-aside on this notice',
      'Extract Section L (or equivalent instructions) into the compliance matrix',
      'Map Section M evaluation criteria to your proposal outline',
      'Submit questions before the Q&A cutoff',
      'Confirm the exact submission channel named in the solicitation (portal / email / PIEE)',
      ...COMMON_TAIL,
    ],
  },

  dsip: {
    portal: 'dsip',
    label: 'DSIP (DoD SBIR/STTR)',
    officialUrl: 'https://www.dodsbirsttr.mil',
    summary:
      'DSIP — the Defense SBIR/STTR Innovation Portal at dodsbirsttr.mil — is where Department of ' +
      'Defense SBIR/STTR proposals are prepared, certified, and submitted.',
    registration: [
      'Active SAM.gov registration (UEI)',
      'A DSIP account and firm registration on dodsbirsttr.mil',
      'SBA Company Registry registration (your SBC control ID)',
      'SBIR/STTR eligibility — small-business ownership and size rules apply; verify against the current BAA',
    ],
    volumes: [
      'A typical Phase I package: Vol I cover sheet, Vol II technical volume, Vol III cost volume, Vol IV company commercialization report, Vol V supporting documents, Vol VI fraud/waste/abuse training certification — components add or vary volumes; check the BAA',
      'Vol II page limits and required sections are set by each component’s BAA instructions — check the solicitation',
    ],
    formatting: [
      'Vol II uploads as a PDF — pages beyond the BAA’s limit may not be evaluated',
      'The online Vol III budget must reconcile with any budget narrative you attach',
      'Use the topic number exactly as published and answer the topic, not a nearby idea',
    ],
    deadlines: [
      'The package must be FULLY certified and submitted in DSIP before the BAA’s closing date/time',
      'Every volume must be complete before DSIP allows final submission — finish uploads early',
      'Topic Q&A closes before the proposal deadline — check the BAA schedule',
    ],
    checklist: [
      'Confirm SBIR/STTR eligibility against the current BAA (ownership, size, PI employment)',
      'Register the firm in DSIP and the SBA Company Registry',
      'Download the topic + BAA and note the component-specific volume list',
      'Draft Vol II against the BAA’s required outline and page limit',
      'Enter the Vol III budget online and reconcile it with the narrative',
      'Complete the fraud/waste/abuse training certification (Vol VI)',
      ...COMMON_TAIL,
    ],
  },

  grants_gov: {
    portal: 'grants_gov',
    label: 'Grants.gov',
    officialUrl: 'https://www.grants.gov',
    summary:
      'Grants.gov is the central portal for finding and applying to federal grant opportunities — ' +
      'assistance funding rather than procurement contracts.',
    registration: [
      'Active SAM.gov registration',
      'A Grants.gov account linked to your organization',
      'Your organization’s EBiz POC must authorize you as an Authorized Organization Representative (AOR) before you can submit',
    ],
    volumes: [
      'Applications are built from the SF-424 form family plus attachments defined by the specific Notice of Funding Opportunity (NOFO)',
      'Required forms, narratives, and budget formats vary per NOFO — check the solicitation',
    ],
    formatting: [
      'Follow the NOFO’s file-format, file-naming, page-limit, and font rules exactly',
      'Validate the Workspace forms before submitting — validation errors block submission',
    ],
    deadlines: [
      'Submit early enough to fix rejections — Grants.gov validation can bounce a package AFTER you submit, and the clock does not stop',
      'The Grants.gov receipt timestamp is normally what counts — but check the solicitation',
    ],
    checklist: [
      'Confirm AOR authorization is complete (EBiz POC approval) — this takes lead time',
      'Create the Workspace from the correct opportunity number',
      'Download the NOFO and list every required form and attachment',
      'Complete the SF-424 family forms and the NOFO-specific narratives',
      'Run Grants.gov validation and clear every error before the deadline window',
      ...COMMON_TAIL,
    ],
  },

  nspires: {
    portal: 'nspires',
    label: 'NSPIRES (NASA)',
    officialUrl: 'https://nspires.nasaprs.com',
    summary:
      'NSPIRES is NASA’s solicitation and proposal system, used for research announcements ' +
      '(such as ROSES program elements) and other NASA opportunities.',
    registration: [
      'An NSPIRES user account for each participant',
      'Your organization registered in NSPIRES, with your account affiliated to it',
      'Active SAM.gov registration for the organization',
    ],
    volumes: [
      'Typically a single proposal PDF (scientific/technical/management) plus budget details entered in NSPIRES',
      'Some solicitations accept submission via Grants.gov instead — check the solicitation',
      'Required sections and page limits come from the specific program element — check the solicitation',
    ],
    formatting: [
      'NASA’s proposer guidance plus the specific solicitation govern formatting — where they differ, the solicitation wins',
      'Many NASA calls use a two-step process (Notice of Intent or Step-1 proposal first) — check the solicitation',
    ],
    deadlines: [
      'An authorized organizational representative must RELEASE the proposal in NSPIRES — a PI submit alone is not enough; budget internal routing time',
      'NOI/Step-1 deadlines arrive weeks before the full proposal — check the solicitation schedule',
    ],
    checklist: [
      'Create/confirm NSPIRES accounts and organization affiliation for every participant',
      'Check whether this call requires an NOI or Step-1 proposal first',
      'Draft the proposal PDF against the program element’s required sections',
      'Enter the budget in NSPIRES and reconcile with the proposal',
      'Schedule the organizational release step with your authorized representative',
      ...COMMON_TAIL,
    ],
  },

  research_gov: {
    portal: 'research_gov',
    label: 'Research.gov (NSF)',
    officialUrl: 'https://www.research.gov',
    summary:
      'Research.gov is the National Science Foundation’s system for preparing and submitting ' +
      'proposals. The PAPPG (Proposal & Award Policies & Procedures Guide) is the baseline rulebook.',
    registration: [
      'Your organization registered in Research.gov',
      'Active SAM.gov registration',
      'Individual Research.gov accounts for the PI and staff, affiliated with the organization',
    ],
    volumes: [
      'Standard NSF proposals include: project summary, project description, references, biographical sketches, budget + justification, current & pending support, and facilities — specific programs adjust this; check the solicitation',
      'The current PAPPG defines the default rules; the solicitation can override them',
    ],
    formatting: [
      'Follow the current PAPPG for fonts, margins, and page limits — and check the solicitation for overrides',
      'Biographical sketches and current & pending support must use the approved format (e.g. SciENcv)',
    ],
    deadlines: [
      'NSF deadlines are typically 5 p.m. submitter’s local time — confirm in the solicitation',
      'An authorized organizational representative submits — budget internal routing time',
    ],
    checklist: [
      'Register the organization and affiliate PI/staff accounts in Research.gov',
      'Read the current PAPPG sections relevant to your proposal type',
      'Prepare biosketches and current & pending in the approved format',
      'Assemble project summary/description/references per PAPPG + solicitation',
      'Route to your authorized organizational representative for submission',
      ...COMMON_TAIL,
    ],
  },

  diu: {
    portal: 'diu',
    label: 'DIU (CSO)',
    officialUrl: 'https://www.diu.mil',
    summary:
      'The Defense Innovation Unit (DIU) buys commercial technology for DoD through Commercial ' +
      'Solutions Openings (CSOs) posted at diu.mil — a shorter, more commercial process than FAR-based RFPs, ' +
      'often ending in an Other Transaction (OT) agreement.',
    registration: [
      'Solution briefs are typically submitted through the form or channel named in the specific solicitation — check the solicitation',
      'SAM.gov registration is needed before any resulting agreement or award',
      'Awards are often Other Transactions (OTs) — different rules from FAR contracts',
    ],
    volumes: [
      'Phase 1 is usually a SHORT solution brief — the CSO states the exact format and length',
      'If selected you may be invited to pitch, then to submit a full proposal and negotiate an OT — each phase is defined by the CSO; check the solicitation',
    ],
    formatting: [
      'Lead with the commercial product and its maturity — DIU evaluates what exists, not what could be researched',
      'Follow the brief-format instructions exactly; keep content non-proprietary unless instructed otherwise',
    ],
    deadlines: [
      'Some CSO solicitations close on a rolling basis, others have hard deadlines — check the solicitation',
      'Down-select notifications and pitch scheduling move quickly — be ready to respond within days',
    ],
    checklist: [
      'Read the specific CSO/solicitation area of interest and confirm your product actually fits it',
      'Draft the solution brief in the exact format the CSO prescribes',
      'Prepare a pitch deck and demo in case of down-select',
      'Confirm SAM.gov registration is active ahead of any award discussion',
      ...COMMON_TAIL,
    ],
  },

  other: {
    portal: 'other',
    label: 'Other portal',
    officialUrl: '',
    summary:
      'A portal Launchpad has no specific template for. The universal rules still apply: the ' +
      'solicitation is the only authority, and you submit it yourself on the official system.',
    registration: [
      'Identify every registration the solicitation requires and how long each takes to activate',
      'Most federal opportunities require an active SAM.gov registration — check the solicitation',
    ],
    volumes: ['Volume structure is defined entirely by the solicitation — check the solicitation'],
    formatting: ['Follow the stated page limits, fonts, and file rules exactly; ask during Q&A where unclear'],
    deadlines: [
      'Confirm the due date, time, and timezone on the official posting',
      'Plan an internal deadline 24–48 hours early',
    ],
    checklist: [
      'Record the official solicitation URL and identifier in this workspace',
      'List every registration prerequisite and its activation lead time',
      ...COMMON_TAIL,
    ],
  },
};

export const PORTAL_OPTIONS: Array<{ value: PortalKey; label: string }> = PORTAL_KEYS.map((k) => ({
  value: k,
  label: PORTAL_TEMPLATES[k].label,
}));

/** Seed a fresh, un-checked checklist for a new workspace. */
export function seedChecklist(portal: PortalKey): ChecklistItem[] {
  const t = PORTAL_TEMPLATES[portal] ?? PORTAL_TEMPLATES.other;
  return t.checklist.map((label, i) => ({
    id: `${t.portal}-${String(i + 1).padStart(2, '0')}`,
    label,
    done: false,
    done_at: null,
  }));
}
