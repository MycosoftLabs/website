import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LOCAL_DEV_ADMIN_COOKIE, isLocalDevAuthEnabled, verifyLocalDevAdminSession } from '@/lib/auth/local-dev-session';

// CMMC L2 Tier-1 turnkey — multi-user, DB-backed tracking of the operator
// controls (AT training, PS screening/access-agreements, IR tabletop, incident
// log, DIBNet). All reads/writes go through the caller's Supabase session, so
// RLS (company-email) enforces access and every write is attributed. Real
// company users (Morgan, RJ) work from their own machines with their own login.
export const dynamic = 'force-dynamic';

const COMPANY = /@mycosoft\.(org|com)$/i;

const AT_TIER1_IDS = ['AT.L2-3.2.1', 'AT.L2-3.2.2', 'AT.L2-3.2.3'] as const;

type Ctx = { email: string; supabase: any; live: boolean };

type MasScore = {
  total_controls: number;
  implemented: number;
  partial: number;
  implementation_percent: number;
};

function masBase(): string {
  return (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
}

function masHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = process.env.MAS_API_KEY || process.env.MAS_INTERNAL_API_KEY;
  if (key) h['X-API-Key'] = key;
  return h;
}

async function fetchMasTier1Context(): Promise<{
  score: MasScore | null;
  atControls: Record<string, string>;
}> {
  const base = masBase();
  if (!base) return { score: null, atControls: {} };
  try {
    const [scoreRes, ctrlRes] = await Promise.all([
      fetch(`${base}/api/compliance/score`, { cache: 'no-store', headers: masHeaders() }),
      fetch(`${base}/api/compliance/controls`, { cache: 'no-store', headers: masHeaders() }),
    ]);
    const score = scoreRes.ok ? ((await scoreRes.json()) as MasScore) : null;
    const atControls: Record<string, string> = {};
    if (ctrlRes.ok) {
      const rows = ((await ctrlRes.json()) as { controls?: Array<{ control_id?: string; implementation_state?: string }> })
        .controls || [];
      for (const id of AT_TIER1_IDS) {
        const row = rows.find((r) => r.control_id === id);
        if (row?.implementation_state) atControls[id] = String(row.implementation_state);
      }
    }
    return { score, atControls };
  } catch {
    return { score: null, atControls: {} };
  }
}

async function ctx(): Promise<Ctx | null> {
  const supabase = await createClient();
  try {
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email as string | undefined;
    if (email && COMPANY.test(email)) return { email: email.toLowerCase(), supabase, live: true };
  } catch { /* no session */ }
  // Local-dev fallback (owner). RLS still applies to the anon client, so DB ops
  // only succeed with a real Supabase session — local-dev is for render/wiring.
  try {
    const jar = await cookies();
    const token = jar.get(LOCAL_DEV_ADMIN_COOKIE)?.value;
    // Verify the HMAC-signed cookie (not just presence) so a forged value can't pose as owner.
    if (isLocalDevAuthEnabled() && verifyLocalDevAdminSession(token)) {
      return { email: 'morgan@mycosoft.org', supabase, live: false };
    }
  } catch { /* ignore */ }
  return null;
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [{ data: personnel, error: pe }, { data: records, error: re }] = await Promise.all([
    c.supabase.from('cmmc_personnel').select('*').order('sort_order'),
    c.supabase.from('cmmc_tier1_records').select('*'),
  ]);
  const mas = await fetchMasTier1Context();
  return NextResponse.json({
    personnel: personnel || [],
    records: records || [],
    me: c.email,
    live: c.live,
    masScore: mas.score,
    masAtControls: mas.atControls,
    note: (pe || re)
      ? 'Sign in with your Mycosoft account to load and save (local-dev has no Supabase session).'
      : null,
  });
}

export async function POST(request: NextRequest) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { supabase, email } = c;
  const body = await request.json().catch(() => ({}));
  const op = String(body.op ?? '');

  if (op === 'upsert-record') {
    const kind = String(body.kind ?? '');
    const personId = body.personId ?? null;
    const itemKey = String(body.itemKey ?? '');
    const data = body.data ?? {};
    if (!kind) return NextResponse.json({ error: 'kind required' }, { status: 400 });

    let sel = supabase.from('cmmc_tier1_records').select('id').eq('kind', kind).eq('item_key', itemKey);
    sel = personId == null ? sel.is('person_id', null) : sel.eq('person_id', personId);
    const { data: existing } = await sel.maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from('cmmc_tier1_records')
        .update({ data, updated_by: email, updated_at: new Date().toISOString() }).eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, id: existing.id });
    }
    const { data: ins, error } = await supabase.from('cmmc_tier1_records')
      .insert({ kind, person_id: personId, item_key: itemKey, data, updated_by: email }).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: ins?.id });
  }

  if (op === 'delete-record') {
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { error } = await supabase.from('cmmc_tier1_records').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (op === 'add-person') {
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const { data: ins, error } = await supabase.from('cmmc_personnel')
      .insert({ name, role: String(body.role ?? ''), email: String(body.email ?? ''), created_by: email, sort_order: body.sortOrder ?? 99 })
      .select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, person: ins });
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}
