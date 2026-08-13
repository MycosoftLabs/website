/**
 * Canonical vs alias Launchpad BFF routes (gap plan §3.2).
 *
 * Deliberate aliases (keep):
 *   /tier1            → same table as /readiness/tier1 (operator facts)
 *   /registrations    → newer shape-guard; /company/registrations is legacy shape
 *
 * Different products — do not merge:
 *   /export           Claude deletion-request audit
 *   /settings/export  workspace dump with {confirm: tenantName}
 *   /closure          mutating statements + invalidate
 *   /readiness/closure read-only wave board
 *   /reports          vs /readiness/reports
 *   /origin-graph     vs /origin/bom
 */
export const LAUNCHPAD_ROUTE_ALIASES = {
  tier1Canonical: '/api/fusarium/launchpad/readiness/tier1',
  tier1Alias: '/api/fusarium/launchpad/tier1',
  registrationsCanonical: '/api/fusarium/launchpad/registrations',
  registrationsLegacy: '/api/fusarium/launchpad/company/registrations',
} as const;
