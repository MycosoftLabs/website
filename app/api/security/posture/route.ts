import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

/** BFF proxy: MAS read-only MYCA operational posture (PreVeil, BGC metadata). No secrets to browser. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const base = (process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || '').replace(/\/$/, '');
  if (!base) {
    return NextResponse.json({ error: 'MAS not configured' }, { status: 503 });
  }

  const key = process.env.MYCA_POSTURE_API_KEY || process.env.MAS_API_KEY || process.env.MAS_INTERNAL_API_KEY || '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (key) headers['X-API-Key'] = key;

  try {
    const res = await fetch(`${base}/api/myca/posture`, { cache: 'no-store', headers });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'MAS posture unreachable' }, { status: 503 });
  }
}
