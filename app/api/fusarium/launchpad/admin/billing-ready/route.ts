import { NextResponse } from 'next/server';
import { evaluateBillingReady } from '@/lib/launchpad/billing/ready';
import { requireLaunchpadOperator } from '@/lib/launchpad/operator';

export const dynamic = 'force-dynamic';

/** Boolean-only. Never returns secret values. */
export async function GET() {
  const gate = await requireLaunchpadOperator();
  if (gate.error) return gate.error;
  const ready = evaluateBillingReady();
  return NextResponse.json(ready, { status: ready.ready ? 200 : 503 });
}
