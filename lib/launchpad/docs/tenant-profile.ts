/**
 * FUSARIUM Launchpad — TenantProfile: the multi-tenant replacement for the
 * internal generator's hardcoded organization context.
 *
 * Everything the document factory knows about a customer comes from this
 * object, built from launchpad_company_profiles.data. A missing fact becomes
 * the [CUSTOMER INPUT REQUIRED] placeholder in the draft — never an invented
 * value (master plan §11.7: the factory must not invent implementation facts,
 * dates, systems, or personnel).
 */

import { PLACEHOLDER } from '@/lib/launchpad/constants';

export interface TenantProfile {
  legalName: string;
  entityType?: string; // LLC, C-Corp…
  state?: string;
  site?: string;
  website?: string;
  uei?: string;
  cage?: string;
  headcount?: number;
  officials?: Array<{ name: string; title: string }>;
  boundaryDescription?: string; // customer's own words about their CUI/FCI boundary
  stackSummary?: string; // customer's own words about systems in scope
  capabilitySummary?: string;
}

export function profileFromCompanyData(data: Record<string, unknown>): TenantProfile {
  const s = (k: string) => (typeof data[k] === 'string' && (data[k] as string).trim() ? (data[k] as string).trim() : undefined);
  return {
    legalName: s('legal_name') ?? PLACEHOLDER,
    entityType: s('entity_type'),
    state: s('entity_state'),
    site: s('site'),
    website: s('website'),
    uei: s('uei'),
    cage: s('cage'),
    headcount: typeof data.headcount === 'number' ? (data.headcount as number) : undefined,
    officials: Array.isArray(data.officials) ? (data.officials as TenantProfile['officials']) : undefined,
    boundaryDescription: s('boundary_description'),
    stackSummary: s('stack_summary'),
    capabilitySummary: s('capability_summary'),
  };
}

/** Render the organization-context paragraph for prompts and fallbacks. */
export function tenantContext(p: TenantProfile): string {
  const officials =
    p.officials && p.officials.length > 0
      ? p.officials.map((o) => `${o.name} (${o.title})`).join('; ')
      : PLACEHOLDER;
  return [
    `${p.legalName} is a ${p.headcount ?? PLACEHOLDER}-person ${p.entityType ?? PLACEHOLDER} ` +
      `${p.state ? `(${p.state}) ` : ''}pursuing U.S. defense work.`,
    `UEI: ${p.uei ?? PLACEHOLDER} · CAGE: ${p.cage ?? PLACEHOLDER} · Site: ${p.site ?? PLACEHOLDER}.`,
    `Responsible officials: ${officials}.`,
    `Assessment boundary (customer-described): ${p.boundaryDescription ?? PLACEHOLDER}.`,
    `Systems in scope (customer-described): ${p.stackSummary ?? PLACEHOLDER}.`,
  ].join('\n');
}

/** Org block for report-doc.ts (already interface-driven — reuse as-is). */
export function reportOrg(p: TenantProfile) {
  return {
    legalName: p.legalName,
    uei: p.uei ?? PLACEHOLDER,
    cage: p.cage ?? PLACEHOLDER,
    sao: p.officials?.[0]?.name ?? PLACEHOLDER,
    site: p.site ?? PLACEHOLDER,
  };
}
