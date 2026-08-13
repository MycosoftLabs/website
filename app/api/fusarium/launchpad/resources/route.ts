import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError, entitlementDenied } from '@/lib/launchpad/http';
import { loadDerivedEntitlements } from '@/lib/launchpad/entitlement-guard';
import {
  RESOURCE_CATALOG,
  RESOURCE_CATEGORIES,
  INDEPENDENCE_DISCLOSURE,
  CATALOG_LAST_VERIFIED,
  type ResourceCatalogCard,
  type ResourceCategoryKey,
} from '@/lib/launchpad/resource-catalog';
import { LINKS_BY_SURFACE } from '@/lib/launchpad/official-links';

/**
 * Resource Graph — curated catalog only.
 *
 * The curated baseline is a typed const in lib/launchpad/resource-catalog.ts
 * (editorial content that versions with the code — NOT database seeds).
 * launchpad_resource_cards is a GLOBAL curated-catalog table (id, vendor,
 * offering, category, card jsonb, active, last_verified_at — no tenant_id;
 * RLS grants authenticated SELECT on active = true rows only, no INSERT
 * policy). It is read here through the SESSION client — never the service
 * client — and merged over the static baseline (dedupe by vendor+offering;
 * DB rows win).
 *
 * A tenant must never write the global catalog, so there is no write path.
 * Customer-added resources are coming — they will live in a tenant-scoped
 * table (Cursor: launchpad_tenant_resource_cards), not the shared catalog.
 * Until that table exists, POST returns 501.
 *
 * NON-CUI boundary: metadata and references only — a name, a category, a URL,
 * a short note. No uploads, no credentials, no raw logs.
 */

export const dynamic = 'force-dynamic';

const CUSTOM_COMING_NOTE =
  'Customer-added resources are coming — they will live in a workspace-scoped table, not the shared catalog.';

const CATEGORY_KEYS = new Set<string>(RESOURCE_CATEGORIES.map((c) => c.key));

interface CatalogRow {
  id: string;
  vendor: string;
  offering: string;
  category: string;
  card: Record<string, unknown> | null;
  last_verified_at: string | null;
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function mapCatalogRow(row: CatalogRow): ResourceCatalogCard {
  const card = row.card ?? {};
  return {
    id: row.id,
    category: row.category as ResourceCategoryKey,
    vendor: row.vendor,
    offering: row.offering,
    why_consider: str(card.why_consider) ?? '',
    when_required: str(card.when_required) ?? '',
    when_not_required: str(card.when_not_required) ?? '',
    data_allowed: strArray(card.data_allowed),
    data_not_allowed: strArray(card.data_not_allowed),
    relationship_type: 'none',
    disclosure: str(card.disclosure) ?? INDEPENDENCE_DISCLOSURE,
    alternatives: strArray(card.alternatives),
    last_verified:
      (row.last_verified_at ?? '').slice(0, 10) || str(card.last_verified) || CATALOG_LAST_VERIFIED,
    external_url: str(card.external_url),
    logo_src: str(card.logo_src),
    logo_license: str(card.logo_license),
    step: typeof card.step === 'number' ? card.step : undefined,
  };
}

const dedupeKey = (vendor: string, offering: string) =>
  `${vendor.trim().toLowerCase()}::${offering.trim().toLowerCase()}`;

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;

  const derived = await loadDerivedEntitlements(ctx.supabase, ctx.tenantId);
  if (!derived.entitlements?.resourceGraph) {
    return entitlementDenied('resourceGraph', derived.planKey, 'Resource Graph is not on this plan.');
  }

  // Static baseline first; live global rows (session client — RLS exposes
  // active = true rows only) overlay it, deduped by vendor+offering with DB
  // rows winning. A DB read failure degrades to the shipped baseline rather
  // than failing the page.
  const merged = new Map<string, ResourceCatalogCard>();
  for (const card of RESOURCE_CATALOG) merged.set(dedupeKey(card.vendor, card.offering), card);

  const { data, error } = await ctx.supabase
    .from('launchpad_resource_cards')
    .select('id, vendor, offering, category, card, last_verified_at')
    .eq('active', true);
  if (!error) {
    for (const row of (data ?? []) as CatalogRow[]) {
      // The page renders known categories only — skip rows it could never show.
      if (!CATEGORY_KEYS.has(row.category)) continue;
      merged.set(dedupeKey(row.vendor, row.offering), mapCatalogRow(row));
    }
  }

  return NextResponse.json({
    catalog: Array.from(merged.values()),
    custom: [],
    customAvailable: false,
    customNote: CUSTOM_COMING_NOTE,
    officialLinks: LINKS_BY_SURFACE.resources,
    note: 'Independent listings — Mycosoft receives no compensation for any listing. A listing is not a certification, and no tool or vendor makes a company CMMC compliant. Vendor logos render only when logo_license records a brand-kit basis; otherwise a monogram.',
  });
}

export async function POST() {
  const gate = await requireTenant({ write: true });
  if (gate.error) return gate.error;

  // launchpad_resource_cards is the GLOBAL shared catalog — a tenant must
  // never write it. No insert happened, so no audit event is appended.
  return jsonError(501, 'not_implemented', CUSTOM_COMING_NOTE);
}
