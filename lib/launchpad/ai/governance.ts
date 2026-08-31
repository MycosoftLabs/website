/**
 * Model-governance records per task type (spec §11.6).
 * BYO keys do not loosen these rules — the prompt firewall still applies.
 */

export type AiTaskType =
  | 'policy_draft'
  | 'ssp_draft'
  | 'report_draft'
  | 'radar_enrichment'
  | 'digest'
  | 'general';

export interface ModelGovernance {
  taskType: AiTaskType;
  purpose: string;
  allowedDataClasses: string[];
  permittedProviders: string[];
  maxContextTokens: number;
  maxCostCredits: number;
  outputSchema: string;
  prohibitedClaims: string[];
  humanReviewRequired: boolean;
  retention: string;
  fallback: string;
  version: string;
}

export const GOVERNANCE: Record<AiTaskType, ModelGovernance> = {
  policy_draft: {
    taskType: 'policy_draft',
    purpose: 'Draft family policy from customer facts + published control catalog.',
    allowedDataClasses: ['commercial_non_cui', 'customer_profile_facts'],
    permittedProviders: ['anthropic', 'openai', 'perplexity', 'xai'],
    maxContextTokens: 8000,
    maxCostCredits: 8,
    outputSchema: 'html_draft',
    prohibitedClaims: ['certified', 'cmmc compliant', 'government approved'],
    humanReviewRequired: true,
    retention: 'draft document row; prompts not stored',
    fallback: 'deterministic template with [CUSTOMER INPUT REQUIRED]',
    version: 'gov-v1',
  },
  ssp_draft: {
    taskType: 'ssp_draft',
    purpose: 'Draft SSP outline from TenantProfile. Never marks controls MET.',
    allowedDataClasses: ['commercial_non_cui', 'customer_profile_facts', 'control_states_metadata'],
    permittedProviders: ['anthropic', 'openai', 'perplexity', 'xai'],
    maxContextTokens: 12000,
    maxCostCredits: 20,
    outputSchema: 'html_draft',
    prohibitedClaims: ['certified', 'cmmc compliant', 'government approved'],
    humanReviewRequired: true,
    retention: 'draft document row; prompts not stored',
    fallback: 'deterministic SSP outline',
    version: 'gov-v1',
  },
  report_draft: {
    taskType: 'report_draft',
    purpose: 'Tenant-scoped reports (remediation, self-assessment, SPRS, POA&M, supply-chain).',
    allowedDataClasses: ['commercial_non_cui', 'score_snapshots', 'poam_metadata'],
    permittedProviders: ['anthropic', 'openai', 'perplexity', 'xai'],
    maxContextTokens: 10000,
    maxCostCredits: 15,
    outputSchema: 'html_draft',
    prohibitedClaims: ['certified', 'cmmc compliant', 'government approved'],
    humanReviewRequired: true,
    retention: 'draft document row; prompts not stored',
    fallback: 'deterministic data-only report',
    version: 'gov-v1',
  },
  radar_enrichment: {
    taskType: 'radar_enrichment',
    purpose: 'Central enrichment of a public solicitation. Cached across tenants.',
    allowedDataClasses: ['public_federal_opportunity'],
    permittedProviders: ['anthropic', 'openai', 'perplexity', 'xai'],
    maxContextTokens: 6000,
    maxCostCredits: 12,
    outputSchema: 'json_enrichment',
    prohibitedClaims: ['award guaranteed', 'you will win'],
    humanReviewRequired: false,
    retention: 'shared enrichment cache; no tenant prompts',
    fallback: 'skip enrichment',
    version: 'gov-v1',
  },
  digest: {
    taskType: 'digest',
    purpose: 'Batch digest of tenant-visible radar matches.',
    allowedDataClasses: ['commercial_non_cui', 'opportunity_metadata'],
    permittedProviders: ['anthropic', 'openai', 'perplexity', 'xai'],
    maxContextTokens: 4000,
    maxCostCredits: 5,
    outputSchema: 'markdown_digest',
    prohibitedClaims: ['certified', 'cmmc compliant'],
    humanReviewRequired: false,
    retention: 'not stored beyond the digest artifact',
    fallback: 'skip digest',
    version: 'gov-v1',
  },
  general: {
    taskType: 'general',
    purpose: 'Operator-initiated completion through the dual-meter router.',
    allowedDataClasses: ['commercial_non_cui'],
    permittedProviders: ['anthropic', 'openai', 'perplexity', 'xai'],
    maxContextTokens: 4000,
    maxCostCredits: 5,
    outputSchema: 'text',
    prohibitedClaims: ['certified', 'cmmc compliant', 'government approved'],
    humanReviewRequired: true,
    retention: 'cost ledger only',
    fallback: 'refuse',
    version: 'gov-v1',
  },
};

export function governanceFor(taskType: string): ModelGovernance {
  return GOVERNANCE[(taskType as AiTaskType)] ?? GOVERNANCE.general;
}

/** Conservative chars-per-token for server-side prompt caps (reject, never under-charge). */
export const PROMPT_CHARS_PER_TOKEN = 4;

export function maxPromptChars(taskType: string): number {
  return governanceFor(taskType).maxContextTokens * PROMPT_CHARS_PER_TOKEN;
}
