/**
 * Contract Radar — cheap tenant matching. No mock awards.
 * Fit is overlap of customer-recorded NAICS/PSC vs ingested opportunity fields.
 */

export interface RankableOpportunity {
  id: string;
  title: string;
  agency: string | null;
  naics: string[] | null;
  psc: string[] | null;
  set_asides: string[] | null;
  due_at: string | null;
  official_url: string;
}

export interface CapabilityMatchInput {
  naics?: string[];
  psc?: string[];
  setAsides?: string[];
}

export interface RankedFit {
  opportunityId: string;
  title: string;
  agency: string | null;
  officialUrl: string;
  dueAt: string | null;
  fitScore: number;
  overlapNaics: string[];
  overlapPsc: string[];
  note: string;
}

function normList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function rankOpportunities(
  opportunities: RankableOpportunity[],
  caps: CapabilityMatchInput,
): RankedFit[] {
  const wantNaics = new Set(normList(caps.naics).map((s) => s.replace(/-/g, '')));
  const wantPsc = new Set(normList(caps.psc).map((s) => s.toUpperCase()));
  const ranked: RankedFit[] = [];
  for (const opp of opportunities) {
    const naics = normList(opp.naics).map((s) => s.replace(/-/g, ''));
    const psc = normList(opp.psc).map((s) => s.toUpperCase());
    const overlapNaics = naics.filter((n) => wantNaics.has(n));
    const overlapPsc = psc.filter((p) => wantPsc.has(p));
    const denom = Math.max(1, wantNaics.size + wantPsc.size);
    const fitScore =
      wantNaics.size + wantPsc.size === 0
        ? 0
        : Math.round(((overlapNaics.length + overlapPsc.length) / denom) * 100) / 100;
    ranked.push({
      opportunityId: opp.id,
      title: opp.title,
      agency: opp.agency,
      officialUrl: opp.official_url,
      dueAt: opp.due_at,
      fitScore,
      overlapNaics,
      overlapPsc,
      note:
        wantNaics.size + wantPsc.size === 0
          ? 'No customer NAICS/PSC recorded yet — fit stays 0 rather than inventing a match.'
          : 'Fit is NAICS/PSC overlap only. Not a bid recommendation.',
    });
  }
  ranked.sort((a, b) => b.fitScore - a.fitScore || (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
  return ranked;
}
