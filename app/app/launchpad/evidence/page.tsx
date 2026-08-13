'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderLock, Loader2, Hash, Plus } from 'lucide-react';
import { EVIDENCE_BOUNDARY_NOTE } from '@/lib/launchpad/constants';

/**
 * Evidence index — the file NEVER leaves the browser.
 *
 * Picking a file runs SHA-256 locally via Web Crypto; only the digest, size,
 * and the metadata you type are sent. There is no upload path to remove —
 * the API has no file handling and the table has no content column.
 */

interface EvidenceRecord {
  id: string;
  title: string;
  control_ids: string[];
  evidence_type: string;
  authoritative_system: string | null;
  sha256: string | null;
  size_bytes: number | null;
  review_status: string;
  created_at: string;
}

const TYPES = ['policy','configuration','log','screenshot','ticket','training','interview','test_result','other'];
const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm';

export default function EvidencePage() {
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [form, setForm] = useState({
    title: '', controlIds: '', evidenceType: 'policy',
    authoritativeSystem: '', authoritativeRef: '', sha256: '', sizeBytes: 0, notes: '',
  });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/evidence', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setRecords(d.records); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load evidence index'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const hashFile = async (f: File) => {
    setHashing(true);
    try {
      const buf = await f.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      setForm((x) => ({ ...x, sha256: hex, sizeBytes: f.size, title: x.title || f.name }));
    } finally { setHashing(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          controlIds: form.controlIds.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean),
          sizeBytes: form.sizeBytes || undefined,
          sha256: form.sha256 || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Save failed'); return; }
      setShowForm(false);
      setForm({ title: '', controlIds: '', evidenceType: 'policy', authoritativeSystem: '', authoritativeRef: '', sha256: '', sizeBytes: 0, notes: '' });
      await load();
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading evidence index…
    </div>;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderLock className="h-6 w-6 text-primary" /> Evidence index
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{EVIDENCE_BOUNDARY_NOTE}</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Index evidence
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Hashing happens in your browser — the file itself is never transmitted or stored by Launchpad.
      </p>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {showForm && (
        <form onSubmit={submit} className="rounded-lg border border-border/60 p-5 mb-8 space-y-4 bg-muted/10">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Title *</label>
              <input required className={input} value={form.title}
                onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Evidence type</label>
              <select className={input} value={form.evidenceType}
                onChange={(e) => setForm((x) => ({ ...x, evidenceType: e.target.value }))}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Requirements covered (comma-separated ids)</label>
            <input className={input} placeholder="AC.L2-3.1.1, AC.L2-3.1.2" value={form.controlIds}
              onChange={(e) => setForm((x) => ({ ...x, controlIds: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Authoritative system (where the content lives)</label>
              <input className={input} placeholder="e.g. our SharePoint GCC / PreVeil / internal wiki"
                value={form.authoritativeSystem}
                onChange={(e) => setForm((x) => ({ ...x, authoritativeSystem: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Reference (opaque link or path — not content)</label>
              <input className={input} value={form.authoritativeRef}
                onChange={(e) => setForm((x) => ({ ...x, authoritativeRef: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Content hash (computed locally — file is not uploaded)
            </label>
            <div className="flex gap-2">
              <input className={input + ' font-mono text-xs'} placeholder="sha256 (pick a file to compute, or paste)"
                value={form.sha256}
                onChange={(e) => setForm((x) => ({ ...x, sha256: e.target.value }))} />
              <label className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                {hashing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hash a file'}
                <input type="file" className="hidden"
                  onChange={(e) => e.target.files?.[0] && hashFile(e.target.files[0])} />
              </label>
            </div>
          </div>
          <button disabled={saving}
            className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Record evidence metadata'}
          </button>
        </form>
      )}

      {records.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Nothing indexed yet. Evidence records raise the evidence-confidence indicator and feed
          document drafts — the content itself always stays in your systems.
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-medium text-sm">{r.title}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{r.evidence_type}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{r.review_status}</span>
                {r.sha256 && (
                  <code className="text-[10px] text-muted-foreground ml-auto">sha256:{r.sha256.slice(0, 12)}…</code>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.control_ids.map((c) => (
                  <code key={c} className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{c}</code>
                ))}
                {r.authoritative_system && (
                  <span className="text-[11px] text-muted-foreground">lives in: {r.authoritative_system}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
