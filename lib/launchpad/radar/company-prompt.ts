/**
 * Build a SAM / radar search prompt from the active workspace company +
 * capability profile. Never invents NAICS or keywords — empty profile → empty
 * prompt (caller keeps a broad recent-postings pull and relies on fit-match).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TenantRadarPrompt {
  tenantId: string;
  companyName: string | null;
  keyword: string | null;
  naics: string[];
  keywords: string[];
  summary: string;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Load company profile + capability data and produce a human-readable prompt
 * plus the keyword string passed to SAM `title=`.
 */
export async function buildTenantRadarPrompt(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<TenantRadarPrompt> {
  const [{ data: companyRow }, { data: capabilityRow }, { data: tenant }] = await Promise.all([
    supabase
      .from('launchpad_company_profiles')
      .select('data')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase
      .from('launchpad_capability_profiles')
      .select('data')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase.from('launchpad_tenants').select('name').eq('id', tenantId).maybeSingle(),
  ]);

  const company = asRecord(companyRow?.data);
  const capability = asRecord(capabilityRow?.data);

  const companyName =
    (typeof company.legal_name === 'string' && company.legal_name.trim()) ||
    (typeof company.dba_name === 'string' && company.dba_name.trim()) ||
    (typeof tenant?.name === 'string' && tenant.name.trim()) ||
    null;

  const naics = [
    ...asStringArray(company.naics),
    ...asStringArray(capability.naics),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const keywords = [
    ...asStringArray(capability.keywords),
    ...asStringArray(company.target_agencies),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const focus =
    (typeof capability.focus === 'string' && capability.focus.trim()) ||
    (typeof capability.summary === 'string' && capability.summary.trim()) ||
    (typeof company.capability_summary === 'string' && company.capability_summary.trim()) ||
    (typeof company.boundary_description === 'string' && company.boundary_description.trim()) ||
    '';

  const keyword =
    keywords[0] ||
    (focus ? focus.split(/[\s,;/]+/).filter((w) => w.length > 3)[0] : null) ||
    null;

  const summaryParts = [
    companyName ? `Company: ${companyName}` : null,
    focus ? `Working on: ${focus.slice(0, 280)}` : null,
    keywords.length ? `Keywords: ${keywords.slice(0, 8).join(', ')}` : null,
    naics.length ? `NAICS: ${naics.slice(0, 6).join(', ')}` : null,
  ].filter(Boolean);

  return {
    tenantId,
    companyName,
    keyword,
    naics,
    keywords,
    summary:
      summaryParts.length > 0
        ? summaryParts.join(' · ')
        : 'No company/capability profile yet — broad recent SAM pull; fit scores stay empty until the company profile is filled.',
  };
}
