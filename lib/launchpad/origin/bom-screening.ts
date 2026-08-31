/**
 * Origin Graph — BOM line screening + domestic-content-by-cost summary.
 *
 * Screens BOM lines against the PUBLIC prohibited-source reference
 * (lib/security/reference/prohibited-sources.ts, whose source of truth is
 * supply-chain-prohibitions.json): Section 889 names, DoD §1260H entities,
 * FCC Covered List vendors, and the §848/817 covered-foreign-country list.
 *
 * A match is a REVIEW FLAG for the customer, never an automated legal
 * conclusion. The official lists (SAM.gov exclusions, FAR 52.204-25, the DoD
 * §1260H publication) are the only authority — every flag says so.
 *
 * Customer-authored substitution notes ride in the same `flags` jsonb column
 * (the launchpad_bom_parts table has no notes column, and we never invent
 * one): screening entries are recomputed on every write, while entries with
 * code 'substitution_note' are customer-owned and preserved.
 */

import {
  PROHIBITED_ENTITIES,
  COVERED_FOREIGN_COUNTRIES,
  COVERED_COMPONENT_KEYWORDS,
} from '@/lib/security/reference/prohibited-sources';

export type BomFlagCode =
  | 'prohibited_entity'
  | 'covered_country_origin'
  | 'covered_component_review'
  | 'unknown_origin'
  | 'substitution_note';

export interface BomFlag {
  code: BomFlagCode;
  /** The matched instrument/authority ('customer' for substitution notes). */
  rule: string;
  /** What matched (entity name, country, component keyword); '' for notes. */
  matched: string;
  message: string;
}

/** Codes that make a line "flagged" (red) in counts and the UI. */
export const RED_FLAG_CODES: BomFlagCode[] = ['prohibited_entity', 'covered_country_origin'];

export const SUBSTITUTION_NOTE_CODE: BomFlagCode = 'substitution_note';

export interface BomLineInput {
  description?: string | null;
  partNumber?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
  countryOfOrigin?: string | null;
}

const VERIFY_NOTE =
  'Possible match against a public reference list — verify against the official list (SAM.gov, FAR 52.204-25, DoD §1260H publication). This is a review flag, not a legal determination.';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchesKeyword(text: string, keyword: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(keyword)}([^a-z0-9]|$)`, 'i').test(text);
}

const US_ALIASES = ['us', 'usa', 'u.s.', 'u.s.a.', 'united states', 'united states of america', 'america'];

export function isUsOrigin(countryOfOrigin: string | null | undefined): boolean {
  const origin = (countryOfOrigin ?? '').trim().toLowerCase();
  if (!origin) return false;
  return US_ALIASES.some((a) => origin === a || matchesKeyword(origin, a));
}

/** Recompute the screening flags for one BOM line. Deterministic; no network. */
export function screenBomLine(line: BomLineInput): BomFlag[] {
  const flags: BomFlag[] = [];
  const haystack = [line.manufacturer, line.supplier, line.description, line.partNumber]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' ')
    .toLowerCase();

  for (const entity of PROHIBITED_ENTITIES) {
    if (entity.keywords.some((kw) => matchesKeyword(haystack, kw))) {
      flags.push({
        code: 'prohibited_entity',
        rule: entity.authorities.join(' · '),
        matched: entity.name,
        message: `${entity.note} ${VERIFY_NOTE}`,
      });
    }
  }

  const origin = (line.countryOfOrigin ?? '').trim().toLowerCase();
  if (!origin) {
    flags.push({
      code: 'unknown_origin',
      rule: 'domestic-content input',
      matched: '',
      message:
        'No country of origin recorded — this line cannot be scored for domestic content until you add one. Ask your supplier where the part is actually made.',
    });
  } else {
    // Taiwan ("Republic of China") is NOT a covered foreign country — do not
    // let the 'china' substring flag it.
    const isTaiwan = origin.includes('taiwan');
    const coveredMatch = isTaiwan
      ? undefined
      : COVERED_FOREIGN_COUNTRIES.find((c) => origin === c || matchesKeyword(origin, c));
    if (coveredMatch) {
      flags.push({
        code: 'covered_country_origin',
        rule: 'Covered foreign country (NDAA §848/§817 review; Section 889 catch-all for PRC)',
        matched: line.countryOfOrigin!.trim(),
        message: `Country of origin is recorded as a covered foreign country. Components from this origin can block a federal award — plan a substitute. ${VERIFY_NOTE}`,
      });
      const component = COVERED_COMPONENT_KEYWORDS.find((kw) => matchesKeyword(haystack, kw));
      if (component) {
        flags.push({
          code: 'covered_component_review',
          rule: 'NDAA §848/§817 covered-component categories',
          matched: component,
          message: `This line looks like a covered component category ("${component}") from a covered country — the exact category the drone/UAS component bans call out. ${VERIFY_NOTE}`,
        });
      }
    }
  }

  return flags;
}

/** Build the stored flags array: fresh screening + the customer's note (if any). */
export function buildStoredFlags(line: BomLineInput, substitutionNote: string | null): BomFlag[] {
  const flags = screenBomLine(line);
  if (substitutionNote && substitutionNote.trim()) {
    flags.push({
      code: SUBSTITUTION_NOTE_CODE,
      rule: 'customer',
      matched: '',
      message: substitutionNote.trim(),
    });
  }
  return flags;
}

/** Pull the customer's substitution note back out of a stored flags array. */
export function substitutionNoteFrom(flags: unknown): string | null {
  if (!Array.isArray(flags)) return null;
  const note = flags.find(
    (f) => f && typeof f === 'object' && (f as BomFlag).code === SUBSTITUTION_NOTE_CODE,
  ) as BomFlag | undefined;
  return note ? note.message : null;
}

/** True when a stored flags array contains a red (prohibited/covered) flag. */
export function isRedFlagged(flags: unknown): boolean {
  if (!Array.isArray(flags)) return false;
  return flags.some(
    (f) =>
      f &&
      typeof f === 'object' &&
      RED_FLAG_CODES.includes((f as BomFlag).code),
  );
}

export interface DomesticContentSummary {
  /** US-origin extended cost ÷ total extended cost, 0–100 (1 decimal), or null when no line is costable. */
  domesticPct: number | null;
  costedLines: number;
  uncostedLines: number;
  usCost: number;
  totalCost: number;
}

/**
 * Domestic content BY COST: US-origin extended cost ÷ total extended cost,
 * where extended cost = quantity × unit cost (missing quantity counts as 1).
 * Lines missing unit cost or country of origin are EXCLUDED and counted, never
 * guessed. This is a planning estimate, not a BAA/TAA determination.
 */
export function domesticContentByCost(
  parts: Array<{ country_of_origin?: string | null; quantity?: number | null; unit_cost?: number | null }>,
): DomesticContentSummary {
  let usCost = 0;
  let totalCost = 0;
  let costedLines = 0;
  let uncostedLines = 0;
  for (const p of parts) {
    const origin = (p.country_of_origin ?? '').trim();
    const unitCost = typeof p.unit_cost === 'number' && Number.isFinite(p.unit_cost) ? p.unit_cost : null;
    if (!origin || unitCost === null) {
      uncostedLines += 1;
      continue;
    }
    const qty = typeof p.quantity === 'number' && Number.isFinite(p.quantity) && p.quantity > 0 ? p.quantity : 1;
    const ext = qty * unitCost;
    costedLines += 1;
    totalCost += ext;
    if (isUsOrigin(origin)) usCost += ext;
  }
  return {
    domesticPct: totalCost > 0 ? Math.round((usCost / totalCost) * 1000) / 10 : null,
    costedLines,
    uncostedLines,
    usCost,
    totalCost,
  };
}
