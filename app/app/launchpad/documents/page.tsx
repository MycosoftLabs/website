'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Download } from 'lucide-react';
import { POLICY_FAMILIES } from '@/lib/reports/policy';
import { GlassButton } from '@/components/ui/glass-button';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';

/**
 * Document factory — DRAFT policies generated from the tenant's own profile
 * facts. Every draft opens with DRAFT — CUSTOMER REVIEW REQUIRED, carries
 * [CUSTOMER INPUT REQUIRED] placeholders for missing facts, and stays 'draft'
 * until a customer official acts outside this factory.
 */

interface DocRow {
  id: string;
  kind: string;
  title: string;
  status: string;
  rule_pack_version: string | null;
  content_hash: string | null;
  created_at: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [family, setFamily] = useState('AC');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/documents', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setDocs(d.documents); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load documents'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(family); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d?.error || 'Generation failed');
      await load();
    } finally { setGenerating(null); }
  };

  const download = async (id: string, title: string) => {
    const r = await fetch(`/api/fusarium/launchpad/documents?id=${encodeURIComponent(id)}`);
    const d = await r.json();
    if (!r.ok || !d.document?.rendered_html) return;
    const blob = new Blob([d.document.rendered_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRAFT_${title.replace(/[^A-Za-z0-9]+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading documents…
    </div>;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
        <FileText className="h-6 w-6 text-primary" /> Document factory
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
        Drafts are assembled from your company profile and the published requirement catalog. Missing
        facts appear as placeholders — the factory never invents implementation details, never marks
        anything approved, and never signs. Complete your Company profile first for richer drafts.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-8 rounded-lg border border-border/60 p-4 bg-muted/10">
        <select value={family} onChange={(e) => setFamily(e.target.value)}
          className="myco-glass-field rounded-lg border border-border px-3 py-2 text-sm">
          {Object.entries(POLICY_FAMILIES).map(([k, v]) => (
            <option key={k} value={k}>{k} — {v.policyTitle}</option>
          ))}
        </select>
        <GlassButton onClick={generate} disabled={!!generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : null}
          Generate DRAFT policy
        </GlassButton>
        <span className="text-xs text-muted-foreground">
          Works without an AI key (deterministic skeleton); richer narrative when a drafting model is configured.
        </span>
      </div>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {docs.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No documents yet. Generate your first family policy draft above.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="rounded-lg border border-border/60 p-4 flex flex-wrap items-center gap-3">
              <span className="font-medium text-sm">{d.title}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded border ${
                d.status === 'draft' ? 'border-amber-500/40 text-amber-500' : 'border-border text-muted-foreground'
              }`}>
                {d.status.toUpperCase()}
              </span>
              {d.rule_pack_version && (
                <code className="text-[10px] text-muted-foreground">{d.rule_pack_version}</code>
              )}
              {d.content_hash && (
                <code className="text-[10px] text-muted-foreground">sha256:{d.content_hash.slice(0, 12)}…</code>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(d.created_at).toLocaleString()}
              </span>
              <GlassButton onClick={() => download(d.id, d.title)}>
                <Download className="h-3.5 w-3.5 text-current mr-1.5" /> Download DRAFT
              </GlassButton>
            </div>
          ))}
        </div>
      )}
      <OfficialLinksPanel surface="documents" title="Policy and signature sources" />
    </div>
  );
}
