/** Canonical Launchpad URLs — marketing vs the signed-in workspace. */
export const LAUNCHPAD_MARKETING_PATH = '/fusarium/launchpad';
export const LAUNCHPAD_WORKSPACE_PATH = '/app/launchpad/dashboard';
export const LAUNCHPAD_ONBOARDING_PATH = '/app/launchpad/onboarding';
export const LAUNCHPAD_OPERATOR_PATH = '/app/launchpad/admin';

export function launchpadLoginPath(next = LAUNCHPAD_WORKSPACE_PATH): string {
  return `/login?redirectTo=${encodeURIComponent(next)}`;
}
