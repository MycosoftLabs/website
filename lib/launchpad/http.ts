/**
 * Shared BFF JSON helpers. Error bodies always include `code` so Claude's UI
 * can map them without scraping message text.
 */

import { NextRequest, NextResponse } from 'next/server';
import { CATALOG, PLAN_ENTITLEMENTS, type Entitlements, type PlanKey } from '@/lib/launchpad/catalog';

export {
  EMAIL_RE,
  SHA256_RE,
  UUID_RE,
  capText,
  parseIsoDate,
  looksLikeSecret,
} from '@/lib/launchpad/validate';

export function jsonError(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export async function readJson<T extends Record<string, unknown>>(
  request: NextRequest,
): Promise<{ ok: true; body: T } | { ok: false; response: NextResponse }> {
  try {
    const body = (await request.json()) as T;
    return { ok: true, body };
  } catch {
    return { ok: false, response: jsonError(400, 'invalid_json', 'Invalid JSON') };
  }
}

const PLAN_ORDER: PlanKey[] = [
  'launch_pass_30d',
  'core',
  'contractor_ops',
  'origin_graph',
  'partner_mesh_pro',
];

export function upgradePath(
  capability: keyof Entitlements,
  current: PlanKey | null,
): { planKey: PlanKey; lookupKeys: string[]; reason: string } | null {
  for (const plan of PLAN_ORDER) {
    if (current && PLAN_ORDER.indexOf(plan) <= PLAN_ORDER.indexOf(current)) continue;
    const ent = PLAN_ENTITLEMENTS[plan];
    const value = ent[capability];
    const qualifies = typeof value === 'boolean' ? value : typeof value === 'number' ? value > 0 : false;
    if (!qualifies) continue;
    return {
      planKey: plan,
      lookupKeys: CATALOG.filter((p) => p.planKey === plan).map((p) => p.lookupKey),
      reason: `Requires a plan that includes ${String(capability)}.`,
    };
  }
  return null;
}

export function entitlementDenied(
  capability: keyof Entitlements,
  planKey: PlanKey | null,
  message: string,
): NextResponse {
  return jsonError(403, 'entitlement_required', message, {
    capability,
    planKey,
    upgrade: upgradePath(capability, planKey),
  });
}

export function capExceeded(
  capability: keyof Entitlements,
  planKey: PlanKey | null,
  used: number,
  limit: number,
  message: string,
): NextResponse {
  return jsonError(403, 'cap_exceeded', message, {
    capability,
    planKey,
    used,
    limit,
    upgrade: upgradePath(capability, planKey),
  });
}
