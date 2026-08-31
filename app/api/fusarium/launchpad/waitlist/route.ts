import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Get-started intake — the one PUBLIC (pre-tenant) Launchpad route.
 *
 * Public marketing form -> service-role insert into launchpad_waitlist (RLS
 * denies anon/authenticated entirely) -> best-effort MAS notification. Modeled
 * on app/api/defense/briefing/route.ts.
 *
 * Non-CUI intake only: the form asks for public company facts. Nothing here
 * creates a tenant or grants access.
 */

const MAX = 4000;

const clean = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, MAX) : null;
};

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = clean(body.name);
  const email = clean(body.email);
  const company = clean(body.company);
  if (!name || !email || !company) {
    return NextResponse.json({ error: 'Name, email, and company are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('launchpad_waitlist')
    .insert({
      name,
      email,
      company,
      website: clean(body.website),
      builds: clean(body.builds),
      stage: clean(body.stage),
      target_agencies: clean(body.targetAgencies),
      heard_from: clean(body.heardFrom),
      notes: clean(body.notes),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[launchpad/waitlist] insert failed:', error.message);
    return NextResponse.json({ error: 'Could not record application' }, { status: 500 });
  }

  // Best-effort ops notification; never blocks the applicant.
  try {
    const masUrl = (process.env.MAS_API_URL || '').replace(/\/$/, '');
    if (masUrl) {
      await fetch(`${masUrl}/api/communications/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'launchpad_get_started_enquiry',
          priority: 'normal',
          recipient: process.env.ADMIN_EMAIL || 'morgan@mycosoft.org',
          subject: `Launchpad enquiry: ${company}`,
          body: `${name} <${email}> — ${company}\nStage: ${clean(body.stage) || 'n/a'}\nBuilds: ${clean(body.builds) || 'n/a'}\nApplication ID: ${data.id}`,
        }),
        signal: AbortSignal.timeout(4000),
      });
    }
  } catch {
    // notification is advisory only
  }

  return NextResponse.json({ ok: true, id: data.id });
}
