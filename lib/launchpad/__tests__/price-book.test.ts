import {
  CREDIT_USD,
  MARKUP_FIRST_PARTY,
  MARKUP_THIRD_PARTY,
  estimateReserveCredits,
  quoteCredits,
} from '../ai/price-book';

describe('Launchpad price book', () => {
  test('refuses a model with no row', () => {
    const q = quoteCredits({
      provider: 'unknown-vendor',
      model: 'mystery',
      inputUnits: 100,
      outputUnits: 50,
    });
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.code).toBe('no_price_row');
  });

  test('third-party markup is 4x and first-party is 5x', () => {
    expect(MARKUP_THIRD_PARTY).toBe(4);
    expect(MARKUP_FIRST_PARTY).toBe(5);
    expect(CREDIT_USD).toBe(0.2);
    const anthropic = quoteCredits({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      inputUnits: 1_000_000,
      outputUnits: 0,
    });
    expect(anthropic.ok).toBe(true);
    if (anthropic.ok) {
      expect(anthropic.markup).toBe(4);
      expect(anthropic.credits).toBeGreaterThan(0);
    }
    const myca = quoteCredits({
      provider: 'myca',
      model: 'nemotron',
      inputUnits: 1_000_000,
      outputUnits: 0,
    });
    expect(myca.ok).toBe(true);
    if (myca.ok) expect(myca.markup).toBe(5);
  });

  test('reserve uses max(quoted, governance) and refuses over budget', () => {
    const reserved = estimateReserveCredits(
      { provider: 'openai', model: 'gpt-4o', inputUnits: 10, outputUnits: 10 },
      25,
    );
    expect(reserved.ok).toBe(true);
    if (reserved.ok) expect(reserved.credits).toBe(25);
    const over = estimateReserveCredits(
      { provider: 'openai', model: 'gpt-4o', inputUnits: 50_000_000, outputUnits: 50_000_000 },
      2,
    );
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe('over_budget');
  });
});
