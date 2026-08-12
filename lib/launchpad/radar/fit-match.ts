/**
 * Tenant fit-matching for Contract Radar.
 * Emits reasons + disqualifiers — never "% chance of winning."
 * Empty capability profiles → no high-fit match (honest empty).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FitMatchResult {
  tenantId: string;
  opportunityId: string;
  fitScore: number | null;
  fitFactors: Record<string, unknown>;
  disqualifiers: string[];
}

type CapabilityRow = {
  tenant_id: string;
  data: Record<string, unknown> | null;
};

type OpportunityRow = {
  id: string;
  naics: string[] | null;
  set_asides: string[] | null;
  agency: string | null;
  title: string | null;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).filter(Boolean);
}

/**
 * Score an opportunity against a tenant capability profile (spec §15.4 weights, MVP).
 * Returns null fitScore when there is nothing meaningful to score.
 */
export function scoreOpportunityFit(
  opportunity: OpportunityRow,
  profileData: Record<string, unknown> | null | undefined,
): { fitScore: number | null; fitFactors: Record<string, unknown>; disqualifiers: string[] } {
  const disqualifiers: string[] = [];
  const fitFactors: Record<string, unknown> = {};

  if (!profileData || Object.keys(profileData).length === 0) {
    return {
      fitScore: null,
      fitFactors: { reason: 'No capability profile on file — connect profile before fit scores appear.' },
      disqualifiers: ['missing_capability_profile'],
    };
  }

  const profileNaics = asStringArray(profileData.naics ?? profileData.naics_codes);
  const profileAgencies = asStringArray(profileData.agencies ?? profileData.target_agencies);
  const profileSetAsides = asStringArray(profileData.set_asides ?? profileData.setAsides);
  const excludedAgencies = asStringArray(profileData.excluded_agencies);
  const requiredClearance = Boolean(profileData.requires_facility_clearance);

  if (requiredClearance && profileData.has_facility_clearance !== true) {
    disqualifiers.push('facility_clearance_required_by_profile_gate');
  }

  if (opportunity.agency && excludedAgencies.some((a) => a.toLowerCase() === opportunity.agency!.toLowerCase())) {
    disqualifiers.push('agency_excluded_by_profile');
  }

  let score = 0;
  let weightTotal = 0;

  if (profileNaics.length && opportunity.naics?.length) {
    weightTotal += 40;
    const overlap = opportunity.naics.filter((n) => profileNaics.includes(n));
    if (overlap.length) {
      score += 40 * (overlap.length / Math.max(opportunity.naics.length, 1));
      fitFactors.naics_overlap = overlap;
    } else {
      fitFactors.naics_overlap = [];
      disqualifiers.push('no_naics_overlap');
    }
  }

  if (profileAgencies.length && opportunity.agency) {
    weightTotal += 30;
    const hit = profileAgencies.some((a) => a.toLowerCase() === opportunity.agency!.toLowerCase());
    if (hit) {
      score += 30;
      fitFactors.agency_match = opportunity.agency;
    } else {
      fitFactors.agency_match = false;
    }
  }

  if (profileSetAsides.length && opportunity.set_asides?.length) {
    weightTotal += 20;
    const overlap = opportunity.set_asides.filter((s) =>
      profileSetAsides.some((p) => p.toLowerCase() === s.toLowerCase()),
    );
    if (overlap.length) {
      score += 20;
      fitFactors.set_aside_overlap = overlap;
    }
  }

  // Title keyword hints (low weight, never decisive alone)
  const keywords = asStringArray(profileData.keywords);
  if (keywords.length && opportunity.title) {
    weightTotal += 10;
    const title = opportunity.title.toLowerCase();
    const hits = keywords.filter((k) => title.includes(k.toLowerCase()));
    if (hits.length) {
      score += 10 * Math.min(1, hits.length / 3);
      fitFactors.keyword_hits = hits;
    }
  }

  if (disqualifiers.includes('agency_excluded_by_profile') || disqualifiers.includes('no_naics_overlap')) {
    // Hard disqualifiers prevent a high-fit label
    return {
      fitScore: weightTotal ? Math.min(score, 39) : null,
      fitFactors: { ...fitFactors, high_fit_blocked: true },
      disqualifiers,
    };
  }

  const fitScore = weightTotal ? Math.round((score / weightTotal) * 100) / 100 : null;
  return { fitScore, fitFactors, disqualifiers };
}

/**
 * Match recently ingested opportunities to tenants that have capability profiles.
 * Central matching — never per-tenant collection.
 */
export async function matchTenants(
  svc: SupabaseClient,
  opportunityIds: string[],
): Promise<FitMatchResult[]> {
  if (!opportunityIds.length) return [];

  const { data: opportunities, error: oErr } = await svc
    .from('launchpad_opportunities')
    .select('id, naics, set_asides, agency, title')
    .in('id', opportunityIds);
  if (oErr || !opportunities?.length) return [];

  const { data: profiles, error: pErr } = await svc
    .from('launchpad_capability_profiles')
    .select('tenant_id, data');
  if (pErr || !profiles?.length) return [];

  const results: FitMatchResult[] = [];
  for (const opp of opportunities as OpportunityRow[]) {
    for (const profile of profiles as CapabilityRow[]) {
      const scored = scoreOpportunityFit(opp, profile.data);
      const { error } = await svc.from('launchpad_opportunity_matches').upsert(
        {
          tenant_id: profile.tenant_id,
          opportunity_id: opp.id,
          fit_score: scored.fitScore,
          fit_factors: scored.fitFactors,
          disqualifiers: scored.disqualifiers,
          status: 'matched',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,opportunity_id' },
      );
      if (!error) {
        results.push({
          tenantId: profile.tenant_id,
          opportunityId: opp.id,
          fitScore: scored.fitScore,
          fitFactors: scored.fitFactors,
          disqualifiers: scored.disqualifiers,
        });
      }
    }
  }
  return results;
}
