/**
 * Official collectors — DSIP has no public REST API.
 * SBIR.gov public API is the DSIP-class source. Grants.gov Search2 is keyless.
 */

export { collectSbirOpportunitiesSafe as collectDsipOpportunities } from './sbir';
export { collectGrantsGovOpportunitiesSafe as collectGrantsGovOpportunities } from './grants-gov';
