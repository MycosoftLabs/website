import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  return NextResponse.json({
    workspace: 'COMMERCIAL // NON-CUI',
    sf86: false,
    scannersInCloud: false,
    localAgentTelemetry: 'sanitized structured results only',
    byoKeys: 'envelope-encrypted; never returned; available on every tier',
    launchpadEnabled: process.env.LAUNCHPAD_ENABLED === '1',
    note: 'LAUNCHPAD_ENABLED stays 0 in sandbox/prod until Morgan says otherwise.',
  });
}
