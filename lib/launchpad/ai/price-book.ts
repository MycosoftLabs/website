/**
 * Launchpad AI price book — published list rates + platform markup.
 * Customer credits = ceil(actual_usd * MARKUP / CREDIT_USD).
 * CREDIT_USD matches the 100-pack ($20 / 100 = $0.20).
 * Refuse inference when the model has no row.
 */

export const PRICE_BOOK_VERSION = 'lp-pricebook-v1-20260831';
export const CREDIT_USD = 0.2;
export const MARKUP_THIRD_PARTY = 4;
export const MARKUP_FIRST_PARTY = 5;

export type PriceUnit = 'input' | 'output' | 'cache_read' | 'cache_write' | 'reasoning' | 'search';

export interface PriceRow {
  provider: string;
  model: string;
  unit: PriceUnit;
  /** USD micros per token (or per search request). $3 / 1M tokens = 3 micros. */
  usdMicrosPerUnit: number;
  markup: typeof MARKUP_THIRD_PARTY | typeof MARKUP_FIRST_PARTY;
}

const T = MARKUP_THIRD_PARTY;
const F = MARKUP_FIRST_PARTY;

/** Public list rates (USD / million tokens as micros-per-token). */
export const PRICE_BOOK: readonly PriceRow[] = [
  { provider: 'anthropic', model: 'claude-sonnet-4-5', unit: 'input', usdMicrosPerUnit: 3, markup: T },
  { provider: 'anthropic', model: 'claude-sonnet-4-5', unit: 'output', usdMicrosPerUnit: 15, markup: T },
  { provider: 'anthropic', model: '*', unit: 'input', usdMicrosPerUnit: 3, markup: T },
  { provider: 'anthropic', model: '*', unit: 'output', usdMicrosPerUnit: 15, markup: T },
  { provider: 'openai', model: 'gpt-4o', unit: 'input', usdMicrosPerUnit: 2.5, markup: T },
  { provider: 'openai', model: 'gpt-4o', unit: 'output', usdMicrosPerUnit: 10, markup: T },
  { provider: 'openai', model: '*', unit: 'input', usdMicrosPerUnit: 2.5, markup: T },
  { provider: 'openai', model: '*', unit: 'output', usdMicrosPerUnit: 10, markup: T },
  { provider: 'perplexity', model: 'sonar-pro', unit: 'input', usdMicrosPerUnit: 3, markup: T },
  { provider: 'perplexity', model: 'sonar-pro', unit: 'output', usdMicrosPerUnit: 15, markup: T },
  { provider: 'perplexity', model: 'sonar', unit: 'input', usdMicrosPerUnit: 1, markup: T },
  { provider: 'perplexity', model: 'sonar', unit: 'output', usdMicrosPerUnit: 1, markup: T },
  { provider: 'perplexity', model: '*', unit: 'input', usdMicrosPerUnit: 3, markup: T },
  { provider: 'perplexity', model: '*', unit: 'output', usdMicrosPerUnit: 15, markup: T },
  { provider: 'xai', model: 'grok-2-latest', unit: 'input', usdMicrosPerUnit: 2, markup: T },
  { provider: 'xai', model: 'grok-2-latest', unit: 'output', usdMicrosPerUnit: 10, markup: T },
  { provider: 'xai', model: '*', unit: 'input', usdMicrosPerUnit: 2, markup: T },
  { provider: 'xai', model: '*', unit: 'output', usdMicrosPerUnit: 10, markup: T },
  { provider: 'nemotron', model: '*', unit: 'input', usdMicrosPerUnit: 0.4, markup: F },
  { provider: 'nemotron', model: '*', unit: 'output', usdMicrosPerUnit: 0.8, markup: F },
  { provider: 'myca', model: '*', unit: 'input', usdMicrosPerUnit: 0.4, markup: F },
  { provider: 'myca', model: '*', unit: 'output', usdMicrosPerUnit: 0.8, markup: F },
];

export interface QuoteInput {
  provider: string;
  model: string;
  inputUnits: number;
  outputUnits: number;
  searchRequests?: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoningUnits?: number;
}

export interface QuoteOk {
  ok: true;
  credits: number;
  actualUsd: number;
  actualCents: number;
  markup: number;
  version: string;
}

export interface QuoteFail {
  ok: false;
  error: string;
  code: 'no_price_row' | 'over_budget';
}

function row(provider: string, model: string, unit: PriceUnit): PriceRow | null {
  const p = provider.toLowerCase();
  const m = model.toLowerCase();
  return (
    PRICE_BOOK.find((r) => r.provider === p && r.model.toLowerCase() === m && r.unit === unit) ??
    PRICE_BOOK.find((r) => r.provider === p && r.model === '*' && r.unit === unit) ??
    null
  );
}

function micros(units: number, found: PriceRow | null): number {
  if (!found || units <= 0) return 0;
  return units * found.usdMicrosPerUnit;
}

export function quoteCredits(input: QuoteInput): QuoteOk | QuoteFail {
  const provider = input.provider.trim();
  const model = input.model.trim() || '*';
  const inputRow = row(provider, model, 'input');
  const outputRow = row(provider, model, 'output');
  if (!inputRow || !outputRow) {
    return {
      ok: false,
      code: 'no_price_row',
      error: `No Launchpad price row for ${provider}/${model}. Inference refused.`,
    };
  }
  let totalMicros = micros(input.inputUnits, inputRow) + micros(input.outputUnits, outputRow);
  const cacheRead = row(provider, model, 'cache_read');
  const cacheWrite = row(provider, model, 'cache_write');
  const reasoning = row(provider, model, 'reasoning');
  const search = row(provider, model, 'search');
  totalMicros += micros(input.cacheRead ?? 0, cacheRead);
  totalMicros += micros(input.cacheWrite ?? 0, cacheWrite);
  totalMicros += micros(input.reasoningUnits ?? 0, reasoning);
  totalMicros += micros(input.searchRequests ?? 0, search);
  const actualUsd = totalMicros / 1_000_000;
  const markup = inputRow.markup;
  const credits = Math.max(1, Math.ceil((actualUsd * markup) / CREDIT_USD));
  return {
    ok: true,
    credits,
    actualUsd,
    actualCents: Math.round(actualUsd * 100),
    markup,
    version: PRICE_BOOK_VERSION,
  };
}

export function estimateReserveCredits(input: QuoteInput, governanceMax: number): QuoteOk | QuoteFail {
  const quoted = quoteCredits(input);
  if (!quoted.ok) return quoted;
  if (quoted.credits > governanceMax) {
    return {
      ok: false,
      code: 'over_budget',
      error: `Estimated ${quoted.credits} credits exceeds governance cap ${governanceMax}.`,
    };
  }
  return {
    ...quoted,
    credits: Math.max(quoted.credits, governanceMax),
  };
}
