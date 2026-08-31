/**
 * Synthetic incident generator — DISABLED in production.
 *
 * This route used to fabricate up to 100 fake incidents (with chain entries and
 * simulated agent resolutions) into the incident store. That is exactly the
 * mock/synthetic operational data an honest SOC must not carry: a generated
 * incident is indistinguishable from a real one once stored, and it pollutes the
 * MAS/MINDEX source of record and any CMMC evidence drawn from it.
 *
 * It is now hard-disabled. Test fixtures belong in isolated tests, never in a
 * route reachable from the operator UI or a production build. The generator has
 * been removed from the Incidents page.
 *
 * @date July 22, 2026
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DISABLED = NextResponse.json(
  {
    error: 'Synthetic incident generation is disabled.',
    reason:
      'Fabricated incidents must never enter the incident store or CMMC evidence. Use isolated test fixtures instead.',
  },
  { status: 410 }, // Gone
);

export async function POST() {
  return DISABLED;
}

export async function GET() {
  return DISABLED;
}
