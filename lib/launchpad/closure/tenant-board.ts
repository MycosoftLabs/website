/**
 * Tenant Closure Board — derived from the tenant control register, not Mycosoft MAS.
 * Wave labels are generic product waves. No Mycosoft evidence hashes.
 */

import { CMMC_L2_CONTROLS, isPoamExcluded } from '@/lib/security/reference/cmmc-l2-reference';
import type { AssessmentState } from '@/lib/launchpad/scoring/engine';

export const TENANT_CLOSURE_WAVES = [
  { wave: 1, key: 'scope', label: 'Scope and signed determinations', blurb: 'Boundary, applicability, and customer-signed determinations.' },
  { wave: 2, key: 'evidence', label: 'Re-point to indexed evidence', blurb: 'Map existing hash/ref evidence to requirements.' },
  { wave: 3, key: 'technical', label: 'Technical work + local capture', blurb: 'Configuration changes captured on-prem; sanitized results only in cloud.' },
  { wave: 4, key: 'programme', label: 'Programme and external', blurb: 'Provider settings, counsel, screening, export — customer-owned.' },
  { wave: 5, key: 'operating', label: 'Operating history', blurb: 'Dated performed reviews. Never a fabricated series.' },
] as const;

const FAMILY_WAVE: Record<string, 1 | 2 | 3 | 4 | 5> = {
  CA: 1,
  RA: 1,
  AC: 2,
  IA: 2,
  MP: 2,
  AU: 3,
  AT: 3,
  IR: 3,
  PS: 3,
  CM: 4,
  SI: 4,
  SC: 4,
  MA: 4,
  PE: 4,
  SA: 5,
  PM: 5,
};

export interface TenantClosureRow {
  controlId: string;
  family: string;
  title: string;
  weight: number;
  poamEligible: boolean;
  wave: 1 | 2 | 3 | 4 | 5;
  state: AssessmentState | null;
  open: boolean;
}

export function tenantClosureBoard(
  states: Record<string, AssessmentState | undefined>,
): TenantClosureRow[] {
  return CMMC_L2_CONTROLS.map((c) => {
    const state = states[c.controlId] ?? null;
    const open = state !== 'implemented' && state !== 'not_applicable';
    const familyCode = /^[A-Z]{2}$/.test(c.family) ? c.family : c.controlId.slice(0, 2);
    return {
      controlId: c.controlId,
      family: familyCode,
      title: c.title,
      weight: c.weightMax ?? 0,
      poamEligible: (c.poamEligibility === 'yes' || c.poamEligibility === 'carveout') && !isPoamExcluded(c.controlId),
      wave: FAMILY_WAVE[familyCode] ?? 5,
      state,
      open,
    };
  });
}
