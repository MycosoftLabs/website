/**
 * FUSARIUM Launchpad — runtime feature flags.
 *
 * LAUNCHPAD_ENABLED is a SERVER env var read at request time, deliberately not
 * NEXT_PUBLIC_*: with `output: 'standalone'` and blue-green Docker images, a
 * NEXT_PUBLIC_ value bakes into the build and cannot act as a kill switch.
 * Flipping this env on the active slot enables/disables the entire
 * authenticated app and every BFF route on the next request — no rebuild.
 *
 * NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE only changes marketing CTA copy
 * (waitlist vs. buy) and is rebuild-acceptable.
 */

function envFlagOn(name: string): boolean {
  const v = process.env[name];
  return v === '1' || v === 'true';
}

/** Master switch for the authenticated app + BFF. Marketing pages are always public. */
export function isLaunchpadEnabled(): boolean {
  return envFlagOn('LAUNCHPAD_ENABLED');
}

/**
 * Storefront kill switch — independent of `LAUNCHPAD_ENABLED`.
 * Sales can open while the workspace stays closed; checkout can be killed
 * without taking the authenticated app down. Fail closed.
 */
export function isLaunchpadPublicCheckoutEnabled(): boolean {
  return envFlagOn('LAUNCHPAD_PUBLIC_CHECKOUT_ENABLED');
}

/** When true, marketing CTAs collect waitlist interest instead of starting checkout. */
export function isWaitlistMode(): boolean {
  const v = process.env.NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE;
  // Default to waitlist until Morgan flips it: the safe direction for a
  // product whose legal terms have not yet cleared counsel.
  return v !== '0' && v !== 'false';
}
