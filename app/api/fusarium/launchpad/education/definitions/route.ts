import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { EDUCATION_TOPICS } from '@/lib/launchpad/education/definitions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  return NextResponse.json({
    topics: EDUCATION_TOPICS,
    excluded: ['sf-86', 'e-QIP', 'NBIS'],
    note: 'Education only. CUI is not stored. Clearance details are overviews — Launchpad cannot obtain or guarantee a clearance.',
  });
}
