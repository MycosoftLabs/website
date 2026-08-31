/**
 * Public-checkout intake — commercial / non-CUI business facts only.
 * Extra fields persist on launchpad_pending_purchases and survive the webhook.
 */

export const COMPANY_SIZES = ['solo', '2-10', '11-50', '51-200', '201-1000', '1000+'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

const SIZE_SET = new Set<string>(COMPANY_SIZES);

export interface PublicCheckoutIntake {
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  companySize: CompanySize | '';
  companyWebsite: string;
  applyReason: string;
  intendedUse: string;
}

export interface IntakeParseError {
  error: string;
  code: string;
  status: number;
}

function clip(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, max);
}

function looksLikeCui(text: string): boolean {
  return /\bcui\s*\/\//i.test(text) || /\b(itar|ear\s*99|controlled technical information)\b/i.test(text);
}

export function parsePublicCheckoutIntake(
  body: Record<string, unknown>,
  opts?: { requireReason?: boolean },
): PublicCheckoutIntake | IntakeParseError {
  const name = clip(body.name, 200);
  const company = clip(body.company, 200);
  const jobTitle = clip(body.jobTitle, 120);
  const companyWebsite = clip(body.companyWebsite, 300);
  const applyReason = clip(body.applyReason, 2000);
  const intendedUse = clip(body.intendedUse, 500);
  const sizeRaw = clip(body.companySize, 32);
  const companySize = SIZE_SET.has(sizeRaw) ? (sizeRaw as CompanySize) : '';

  const requireReason = opts?.requireReason !== false;
  if (requireReason && applyReason.length < 12) {
    return {
      error: 'Tell us why you are applying or paying (at least 12 characters). No CUI.',
      code: 'apply_reason_required',
      status: 400,
    };
  }

  const combined = [name, company, jobTitle, applyReason, intendedUse].join(' ');
  if (looksLikeCui(combined)) {
    return {
      error: 'Do not submit CUI or export-controlled technical data in this form.',
      code: 'cui_refused',
      status: 400,
    };
  }

  return {
    name,
    email: '',
    company,
    jobTitle,
    companySize,
    companyWebsite,
    applyReason,
    intendedUse,
  };
}

export function intakeMetadata(intake: PublicCheckoutIntake): Record<string, string> {
  const out: Record<string, string> = {};
  if (intake.name) out.lp_contact_name = intake.name.slice(0, 400);
  if (intake.company) out.lp_company = intake.company.slice(0, 400);
  if (intake.jobTitle) out.lp_job_title = intake.jobTitle.slice(0, 400);
  if (intake.companySize) out.lp_company_size = intake.companySize;
  if (intake.applyReason) out.lp_apply_reason = intake.applyReason.slice(0, 450);
  return out;
}
