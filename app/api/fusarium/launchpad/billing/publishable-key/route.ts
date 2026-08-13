import { NextResponse } from 'next/server';

/**
 * Publishable keys are designed to be public. This lets Embedded Checkout
 * mount when NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY was empty at image build
 * but STRIPE_PUBLISHABLE_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set
 * on the running container. Never returns a secret key.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
    return NextResponse.json({ publishableKey: null });
  }
  return NextResponse.json({ publishableKey: key });
}
