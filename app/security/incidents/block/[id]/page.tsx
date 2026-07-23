import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getIncidentLogChain } from '@/lib/security/database';

export const dynamic = 'force-dynamic';

// Authorized users: Morgan (owner) and RJ only. Former staff removed.
const OWNER_EMAILS = new Set(['morgan@mycosoft.org']);
const ADMIN_EMAILS = new Set([
  'morgan@mycosoft.org',
  'rj@mycosoft.org',
  'admin@mycosoft.org',
]);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Chain block ${id} | Incidents | Mycosoft` };
}

export default async function IncidentChainBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email || '';
  if (!email) {
    redirect(`/login?returnTo=${encodeURIComponent(`/security/incidents/block/${id}`)}`);
  }
  const isAdmin = OWNER_EMAILS.has(email) || ADMIN_EMAILS.has(email);
  if (!isAdmin) {
    redirect('/security');
  }

  const entries = await getIncidentLogChain({ limit: 10000 });
  const entry = entries.find((e) => e.id === id || String(e.sequence_number) === id);
  if (!entry) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 text-slate-100 md:p-8">
      <Link
        href="/security/incidents"
        className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm text-cyan-400 hover:text-cyan-300"
      >
        ← Back to incidents
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold sm:text-2xl">Chain block #{entry.sequence_number}</h1>
        <p className="text-sm text-slate-400">
          Incident log chain entry — use export from the incidents dashboard for full audit packages.
        </p>
      </header>

      <dl className="grid gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Block id</dt>
          <dd className="font-mono text-cyan-300">{entry.id}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Event hash</dt>
          <dd className="break-all font-mono text-xs text-slate-200">{entry.event_hash}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Previous hash</dt>
          <dd className="break-all font-mono text-xs text-slate-200">{entry.previous_hash}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Incident</dt>
          <dd className="font-mono text-xs text-slate-200">{entry.incident_id}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Event type</dt>
          <dd>{entry.event_type}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd>{entry.created_at}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Reporter</dt>
          <dd>
            {entry.reporter_name} ({entry.reporter_type} / {entry.reporter_id})
          </dd>
        </div>
      </dl>

      <section className="rounded-lg border border-slate-700 bg-slate-950/80 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-300">Event data</h2>
        <pre className="max-h-[420px] overflow-auto text-xs text-slate-300">
          {JSON.stringify(entry.event_data, null, 2)}
        </pre>
      </section>
    </div>
  );
}
