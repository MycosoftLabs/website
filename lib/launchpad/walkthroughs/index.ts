/**
 * FUSARIUM Launchpad — walkthrough registry.
 *
 * Static, education-first workbook content. No tenant data, no compliance
 * assertions, no mock records — each walkthrough teaches a process and points
 * at the app pages and official sites where the customer does the real work.
 */

import type { WalkthroughDef } from './types';
import { BECOME_A_DEFENSE_CONTRACTOR } from './become-a-defense-contractor';
import { CMMC_L2_SELF_ASSESSMENT } from './cmmc-l2-self-assessment';
import { STAND_UP_YOUR_ENCLAVE } from './stand-up-your-enclave';

export type {
  WalkthroughDef,
  WalkthroughStep,
  WalkthroughAction,
  WalkthroughLink,
  WalkthroughTerm,
} from './types';

export const WALKTHROUGHS: WalkthroughDef[] = [
  BECOME_A_DEFENSE_CONTRACTOR,
  CMMC_L2_SELF_ASSESSMENT,
  STAND_UP_YOUR_ENCLAVE,
];

export function getWalkthrough(id: string): WalkthroughDef | null {
  return WALKTHROUGHS.find((w) => w.id === id) ?? null;
}
