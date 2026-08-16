/**
 * @jest-environment node
 *
 * Activate must not redeem a magic link (or set cookies) when the email
 * already belonged to someone. New buyers still auto-login.
 */

const cookieSet = jest.fn();
const verifyOtp = jest.fn();
const generateLink = jest.fn();
const signInWithOtp = jest.fn();
const provisionPaidPublicPurchase = jest.fn();

jest.mock('next/headers', () => ({
  cookies: async () => ({ set: cookieSet }),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp } }),
}));

jest.mock('@/lib/launchpad/service-client', () => ({
  createLaunchpadServiceClient: () => ({
    auth: { admin: { generateLink }, signInWithOtp },
  }),
}));

jest.mock('@/lib/launchpad/billing/provision', () => ({
  provisionPaidPublicPurchase: (...args: unknown[]) => provisionPaidPublicPurchase(...args),
  shouldAutoLoginAfterPurchase: ({ userWasCreated }: { userWasCreated?: boolean }) =>
    userWasCreated === true,
}));

const retrieve = jest.fn();
jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { retrieve } },
  })),
);

import { NextRequest } from 'next/server';
import { POST } from '../route';

const SESSION_ID = 'cs_test_activateauthgate123456';

function paidSession(email: string) {
  return {
    id: SESSION_ID,
    payment_status: 'paid',
    status: 'complete',
    customer_details: { email },
    customer_email: email,
    metadata: { lp_source: 'public_pricing', lp_lookup_key: 'fus_launchpad_core_monthly' },
    customer: null,
    subscription: null,
  };
}

function request() {
  return new NextRequest('http://localhost:3010/api/fusarium/launchpad/billing/activate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: SESSION_ID }),
  });
}

describe('POST /billing/activate auth gate', () => {
  const prevKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
    cookieSet.mockReset();
    verifyOtp.mockReset();
    generateLink.mockReset();
    signInWithOtp.mockReset();
    provisionPaidPublicPurchase.mockReset();
    retrieve.mockReset();
    retrieve.mockResolvedValue(paidSession('buyer@example.com'));
  });

  afterAll(() => {
    if (prevKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevKey;
  });

  test('existing email → loggedIn false, no cookies, no server-side OTP redeem', async () => {
    retrieve.mockResolvedValue(paidSession('morgan@mycosoft.org'));
    provisionPaidPublicPurchase.mockResolvedValue({
      ok: true,
      email: 'morgan@mycosoft.org',
      tenantId: 'tenant-victim',
      userWasCreated: false,
      alreadyClaimed: false,
    });
    signInWithOtp.mockResolvedValue({ data: {}, error: null });

    const res = await POST(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.loggedIn).toBe(false);
    expect(body.created).toBe(false);
    expect(body.actionLink).toBeUndefined();
    expect(body.redirectTo).toContain('/login?redirectTo=');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(generateLink).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'morgan@mycosoft.org',
        options: expect.objectContaining({ shouldCreateUser: false }),
      }),
    );
  });

  test('new email → auto-login cookies allowed', async () => {
    provisionPaidPublicPurchase.mockResolvedValue({
      ok: true,
      email: 'buyer@example.com',
      tenantId: 'tenant-new',
      userWasCreated: true,
      alreadyClaimed: false,
    });
    generateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'hash-new-user' } },
      error: null,
    });
    verifyOtp.mockResolvedValue({ error: null });

    const res = await POST(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.loggedIn).toBe(true);
    expect(body.created).toBe(true);
    expect(body.actionLink).toBeUndefined();
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'hash-new-user' });
    expect(cookieSet).toHaveBeenCalledWith(
      'lp_tenant',
      'tenant-new',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
});
