import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { LOCAL_DEV_ADMIN_COOKIE, isLocalDevAuthEnabled } from '@/lib/auth/local-dev-session';
import {
  screenSupplier, screenToStatus,
  type ScreenedSupplier, type SupplyChainLogEntry, type SupplierScreen,
} from '@/lib/security/supply-chain/mycoforge';

export const dynamic = 'force-dynamic';

// MycoForge supplier compliance — reads/writes the shared production Supabase
// (components, customer_vendors, supply_chain_logs) and screens every supplier
// against the defense prohibited-source lists on read and on add.

async function authorize(): Promise<{ ok: boolean; who: string }> {
  try {
    const jar = await cookies();
    if (isLocalDevAuthEnabled() && jar.get(LOCAL_DEV_ADMIN_COOKIE)?.value) {
      return { ok: true, who: 'morgan@mycosoft.org' };
    }
  } catch {
    /* ignore */
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { ok: true, who: data.user.email ?? 'user' };
  } catch {
    /* ignore */
  }
  return { ok: false, who: '' };
}

function configured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

interface VendorRow { id: string; name: string; type?: string | null; contact?: string | null; notes?: string | null }
interface ComponentRow { name: string | null; category: string | null; supplier_name: string | null }

async function buildSuppliers(db: any): Promise<{ suppliers: ScreenedSupplier[]; logs: SupplyChainLogEntry[] }> {
  const [{ data: vendors }, { data: components }, { data: logs }] = await Promise.all([
    db.from('customer_vendors').select('id,name,type,contact,notes'),
    db.from('components').select('name,category,supplier_name'),
    db.from('supply_chain_logs').select('id,component_name,from_status,to_status,changed_by,changed_at,note').order('changed_at', { ascending: false }).limit(20),
  ]);

  const byName = new Map<string, ScreenedSupplier>();

  // Suppliers derived from the components inventory (supplier_name).
  const compAgg = new Map<string, { count: number; categories: Set<string> }>();
  for (const c of (components as ComponentRow[]) ?? []) {
    const name = (c.supplier_name ?? '').trim();
    if (!name) continue;
    const agg = compAgg.get(name.toLowerCase()) ?? { count: 0, categories: new Set<string>() };
    agg.count++;
    if (c.category) agg.categories.add(c.category);
    compAgg.set(name.toLowerCase(), { count: agg.count, categories: agg.categories });
    if (!byName.has(name.toLowerCase())) {
      byName.set(name.toLowerCase(), {
        id: null, name, source: 'components', componentCount: 0, categories: [],
        screen: screenSupplier(name), removable: false,
      });
    }
  }
  for (const [k, agg] of compAgg) {
    const s = byName.get(k);
    if (s) { s.componentCount = agg.count; s.categories = [...agg.categories]; }
  }

  // Suppliers explicitly managed in customer_vendors (removable here).
  for (const v of (vendors as VendorRow[]) ?? []) {
    const name = (v.name ?? '').trim();
    if (!name) continue;
    const existing = byName.get(name.toLowerCase());
    const screen = screenSupplier(name);
    if (existing) {
      existing.id = v.id; existing.type = v.type; existing.contact = v.contact; existing.notes = v.notes;
      existing.source = 'customer_vendors'; existing.removable = true; existing.screen = screen;
    } else {
      byName.set(name.toLowerCase(), {
        id: v.id, name, type: v.type, contact: v.contact, notes: v.notes,
        source: 'customer_vendors', componentCount: 0, categories: [], screen, removable: true,
      });
    }
  }

  const suppliers = [...byName.values()].sort((a, b) => {
    const rank = (s: SupplierScreen) => (s.severity === 'prohibited' ? 0 : s.severity === 'review' ? 1 : 2);
    return rank(a.screen) - rank(b.screen) || a.name.localeCompare(b.name);
  });

  return { suppliers, logs: (logs as SupplyChainLogEntry[]) ?? [] };
}

// customer_vendors.type CHECK allows only these.
const VENDOR_TYPES = ['customer', 'vendor', 'partner'];
function vendorType(t: unknown): string {
  const v = String(t ?? '').toLowerCase();
  return VENDOR_TYPES.includes(v) ? v : 'vendor';
}

async function writeLog(db: any, entry: { component_name: string; from_status: string | null; to_status: string; changed_by: string; note: string }) {
  // supply_chain_logs requires reorder_id + component_name + to_status + changed_by
  // (no FK on reorder_id → a synthetic token is fine for compliance events).
  await db.from('supply_chain_logs').insert({
    id: crypto.randomUUID(),
    reorder_id: `compliance:${entry.component_name}`,
    component_name: entry.component_name,
    from_status: entry.from_status,
    to_status: entry.to_status,
    changed_by: entry.changed_by,
    changed_at: new Date().toISOString(),
    note: entry.note,
  });
}

export async function GET() {
  if (!configured()) {
    const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    return NextResponse.json({ configured: false, suppliers: [], logs: [], summary: null,
      guidance: hasUrl
        ? 'Connected to the Supabase project, but SUPABASE_SERVICE_ROLE_KEY is missing (needed for admin reads/writes). Locally: paste the service_role key into .env.local (Supabase dashboard → project → Settings → API → service_role) and restart the dev server. It is already set in production.'
        : 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (production project hnevnsxnhfibhbsipqvz).' });
  }
  const auth = await authorize();
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = await createAdminClient();
    const { suppliers, logs } = await buildSuppliers(db);
    const summary = {
      total: suppliers.length,
      prohibited: suppliers.filter((s) => s.screen.severity === 'prohibited').length,
      review: suppliers.filter((s) => s.screen.severity === 'review').length,
      ok: suppliers.filter((s) => s.screen.severity === 'ok').length,
    };
    return NextResponse.json({ configured: true, suppliers, logs, summary });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load suppliers', detail: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  const auth = await authorize();
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? '');
  const db = await createAdminClient();

  try {
    if (action === 'add') {
      const name = String(body.name ?? '').trim();
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
      const screen = screenSupplier(name, body.country);
      // Compliance enforcement: a prohibited-source match is NOT added — logged and blocked.
      if (screen.severity === 'prohibited') {
        await writeLog(db, { component_name: name, from_status: null, to_status: 'compliance_blocked', changed_by: auth.who, note: `Add blocked — ${screen.reason}` });
        return NextResponse.json({ added: false, blocked: true, screen });
      }
      const { data, error } = await db.from('customer_vendors').insert({
        name, type: vendorType(body.type), contact: body.contact ?? null, notes: body.notes ?? null,
        source_system: 'compliance-app', sync_status: 'active', updated_by_agent: 'supply-chain-compliance',
      }).select('id').single();
      if (error) return NextResponse.json({ error: 'insert failed', detail: error.message ?? String(error) }, { status: 500 });
      await writeLog(db, { component_name: name, from_status: null, to_status: screenToStatus(screen.severity), changed_by: auth.who, note: `Supplier added via compliance app — screen: ${screen.severity} (${screen.reason})` });
      return NextResponse.json({ added: true, id: data?.id, screen });
    }

    if (action === 'remove') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '').trim();
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { error } = await db.from('customer_vendors').delete().eq('id', id);
      if (error) return NextResponse.json({ error: 'delete failed', detail: error.message ?? String(error) }, { status: 500 });
      await writeLog(db, { component_name: name || id, from_status: 'active', to_status: 'removed', changed_by: auth.who, note: 'Supplier removed via compliance app' });
      return NextResponse.json({ removed: true });
    }

    if (action === 'rescreen') {
      const { suppliers } = await buildSuppliers(db);
      const flagged = suppliers.filter((s) => s.screen.severity !== 'ok');
      for (const s of flagged) {
        await writeLog(db, { component_name: s.name, from_status: null, to_status: screenToStatus(s.screen.severity), changed_by: auth.who, note: `Rescreen — ${s.screen.reason}` });
      }
      return NextResponse.json({ rescreened: suppliers.length, flagged: flagged.length });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'operation failed', detail: String(e) }, { status: 500 });
  }
}
