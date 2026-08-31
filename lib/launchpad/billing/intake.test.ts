import { describe, expect, it } from 'vitest';
import { parsePublicCheckoutIntake } from './intake';

describe('parsePublicCheckoutIntake', () => {
  it('accepts commercial intake and clips fields', () => {
    const parsed = parsePublicCheckoutIntake({
      name: 'Jordan Lee',
      company: 'Example Defense LLC',
      jobTitle: 'COO',
      companySize: '11-50',
      companyWebsite: 'https://example.example',
      applyReason: 'We need a commercial CMMC readiness workspace for our team.',
      intendedUse: 'Internal readiness only.',
    });
    expect('error' in parsed).toBe(false);
    if ('error' in parsed) return;
    expect(parsed.companySize).toBe('11-50');
    expect(parsed.applyReason.startsWith('We need')).toBe(true);
  });

  it('refuses CUI-looking text', () => {
    const parsed = parsePublicCheckoutIntake({
      applyReason: 'This package contains CUI//SP-CTI drawings',
    });
    expect('error' in parsed).toBe(true);
    if (!('error' in parsed)) return;
    expect(parsed.code).toBe('cui_refused');
  });
});
