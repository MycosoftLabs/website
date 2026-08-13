import { NextResponse } from 'next/server';
import { requireTenant } from '@/lib/launchpad/tenant-context';
import { jsonError } from '@/lib/launchpad/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireTenant();
  if (gate.error) return gate.error;
  const { ctx } = gate;
  const { data, error } = await ctx.supabase
    .from('launchpad_document_templates')
    .select('id, key, title, version, body, active')
    .eq('active', true)
    .order('title');
  if (error) return jsonError(500, 'load_failed', 'Could not load templates');
  const templates = data ?? [];
  return NextResponse.json({
    templates,
    excluded: ['sf-86', 'e-QIP', 'NBIS'],
    note:
      templates.length === 0
        ? 'No templates published yet. Apply migration 20260812210000. SF-86 is never offered.'
        : 'SF-86 / background-investigation forms are excluded by policy. Drafts always require human approval.',
  });
}
