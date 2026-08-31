import { redirect } from 'next/navigation';

/**
 * Legacy route. API-key management briefly lived at /settings/api while the
 * backend was still being designed; the shipped contract, the BFF path
 * (/api/fusarium/launchpad/keys) and Cursor's provisioning scripts all say
 * "keys", so that is the canonical screen. Kept as a redirect rather than
 * deleted so existing links and bookmarks still land somewhere correct.
 */
export default function LegacyApiKeysRedirect() {
  redirect('/app/launchpad/settings/keys');
}
