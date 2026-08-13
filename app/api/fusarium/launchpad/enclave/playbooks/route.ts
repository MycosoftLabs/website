import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { ENCLAVE_PLAYBOOKS } from '@/lib/launchpad/enclave/playbooks';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  return NextResponse.json({
    playbooks: ENCLAVE_PLAYBOOKS,
    note:
      'Templates and local scripts only. Not CUI. Raw logs stay on-prem. Launchpad does not host Wazuh or PreVeil content.',
  });
}
