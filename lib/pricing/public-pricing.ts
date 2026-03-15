/**
 * Public pricing — single source of truth for website copy and display.
 * Updated: March 14, 2026. Do not invent backend; display only.
 *
 * ASSUMPTIONS (editable):
 * - Blended cost per 1K tokens: approximate LLM + world-state cost in USD.
 *   If no cost constants exist in codebase, we use a conservative placeholder.
 * - Basic included tokens = (BASIC_PREPAID_BUNDLE_USD / blendedCostPer1k) * 1000
 *   with 10x markup: effective tokens = (10 * BASIC_PREPAID_BUNDLE_USD) / blendedCostPer1k * 1000.
 *   So: blendedCostPer1k = 0.001 → 10/0.001 * 1000 = 10M tokens (example).
 *   We use a simple display number; formula in comments for audit.
 */

// --- Agent access (mandatory, no free) ---
export const AGENT_CONNECTION_FEE_USD = 1

// --- Basic tier (not free: activation + prepaid bundle) ---
export const BASIC_ACTIVATION_USD = 1
export const BASIC_PREPAID_BUNDLE_USD = 10
/** Blended cost per 1K tokens (LLM + API) — placeholder if no cost constants in codebase */
const BLENDED_COST_PER_1K_TOKENS_USD = 0.002
/** Markup for Basic bundle: included usage = (PREPAID * markup) / cost. 10x = 10 */
const BASIC_MARKUP = 10
/** Included token amount for Basic $10 bundle: (10 * 10) / 0.002 * 1000 = 50M tokens (example). Kept readable. */
export const BASIC_INCLUDED_TOKENS_DISPLAY = Math.floor(
  (BASIC_PREPAID_BUNDLE_USD * BASIC_MARKUP) / BLENDED_COST_PER_1K_TOKENS_USD * 1000
)

// --- Pro (subscription) ---
export const PRO_MONTHLY_USD = 100
export const PRO_ANNUAL_SAVINGS_PERCENT = 30
export const PRO_ANNUAL_TOTAL_USD = 840 // 100 * 12 * 0.7
export const PRO_ANNUAL_MONTHLY_EQUIV_USD = 70 // 840 / 12

// --- Enterprise (subscription) ---
export const ENTERPRISE_MONTHLY_USD = 1000
export const ENTERPRISE_ANNUAL_SAVINGS_PERCENT = 30
export const ENTERPRISE_ANNUAL_TOTAL_USD = 8400
export const ENTERPRISE_ANNUAL_MONTHLY_EQUIV_USD = 700

// --- Payment methods (public copy only) ---
export const PAYMENT_METHODS_PUBLIC =
  'USDC, Solana, Bitcoin, Ethereum, USDT, Visa, Mastercard, American Express, PayPal'
