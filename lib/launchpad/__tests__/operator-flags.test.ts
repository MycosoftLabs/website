import { isLaunchpadOperatorEmail, normalizeOperatorEmail } from '../operator';
import { isWaitlistMode } from '../flags';

describe('launchpad operator allowlist', () => {
  test('accepts only Morgan and admin@mycosoft.org', () => {
    expect(isLaunchpadOperatorEmail('morgan@mycosoft.org')).toBe(true);
    expect(isLaunchpadOperatorEmail('  Admin@Mycosoft.org ')).toBe(true);
    expect(isLaunchpadOperatorEmail('rj@mycosoft.org')).toBe(false);
    expect(isLaunchpadOperatorEmail('buyer@example.com')).toBe(false);
    expect(normalizeOperatorEmail('  Morgan@Mycosoft.org ')).toBe('morgan@mycosoft.org');
  });
});

describe('waitlist mode defaults off', () => {
  const prev = process.env.NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE;

  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE;
    else process.env.NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE = prev;
  });

  test('unset is checkout, not waitlist', () => {
    delete process.env.NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE;
    expect(isWaitlistMode()).toBe(false);
  });

  test('explicit 1 keeps leftover waitlist copy available', () => {
    process.env.NEXT_PUBLIC_LAUNCHPAD_WAITLIST_MODE = '1';
    expect(isWaitlistMode()).toBe(true);
  });
});
