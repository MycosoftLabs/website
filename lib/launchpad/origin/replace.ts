/**
 * Origin Graph — PRC / covered-source flags plus customer-authored replacements.
 * Launchpad never invents a substitute part number.
 */

import { screenBomPart, type BomPartInput, type OriginFlag } from '@/lib/launchpad/origin/screen';

export function originNeedsReplacement(part: BomPartInput): {
  flags: OriginFlag[];
  needsReplacementReview: boolean;
} {
  // PRC detection is delegated entirely to screenBomPart — it already emits a
  // word-boundary-matched prc_origin flag. Re-detecting here produced two
  // prc_origin flags per China-origin part, and its 'cn' substring test
  // false-flagged origins like "CNMI" (a US commonwealth).
  const flags = screenBomPart(part);
  const needsReplacementReview = flags.some(
    (f) => f.code === 'section_889' || f.code === 'covered_telecom' || f.code === 'prc_origin',
  );
  return { flags, needsReplacementReview };
}
