/**
 * Origin Graph — prohibited-source screening against PUBLIC Section 889 /
 * covered-telecom lists. This is regulatory reference data, not mock awards.
 * A match is a FLAG for customer review, never an automatic "you are compliant".
 */

export interface BomPartInput {
  partNumber?: string;
  description?: string;
  manufacturer?: string;
  supplier?: string;
  countryOfOrigin?: string;
}

export interface OriginFlag {
  code: 'section_889' | 'covered_telecom' | 'unknown_origin';
  message: string;
}

/** Public FAR 52.204-25 covered telecommunications / video surveillance names. */
const SECTION_889_NAMES = [
  'huawei',
  'zte',
  'hytera',
  'hikvision',
  'hangzhou hikvision',
  'dahua',
  'zhejiang dahua',
];

function haystack(part: BomPartInput): string {
  return [part.manufacturer, part.supplier, part.description, part.partNumber]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' ')
    .toLowerCase();
}

export function screenBomPart(part: BomPartInput): OriginFlag[] {
  const flags: OriginFlag[] = [];
  const text = haystack(part);
  for (const name of SECTION_889_NAMES) {
    if (text.includes(name)) {
      flags.push({
        code: 'section_889',
        message: `Possible covered-telecom / Section 889 name (${name}). Customer must verify; Launchpad does not certify.`,
      });
      break;
    }
  }
  const origin = (part.countryOfOrigin ?? '').trim();
  if (!origin) {
    flags.push({
      code: 'unknown_origin',
      message: 'Country of origin not provided — domestic-content calculation cannot run on this line.',
    });
  }
  return flags;
}

export function domesticContentEstimate(
  parts: Array<BomPartInput & { quantity?: number; unitCost?: number }>,
): { scoredLines: number; unscoredLines: number; note: string } {
  let scored = 0;
  let unscored = 0;
  for (const p of parts) {
    if ((p.countryOfOrigin ?? '').trim()) scored += 1;
    else unscored += 1;
  }
  return {
    scoredLines: scored,
    unscoredLines: unscored,
    note:
      'Domestic-content percentage is not computed until the customer supplies origin and cost for every scored line. Launchpad does not invent origin.',
  };
}
