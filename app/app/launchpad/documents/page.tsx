'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Download, CircleHelp, Target, Footprints } from 'lucide-react';
import { POLICY_FAMILIES } from '@/lib/reports/policy';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
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
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Document factory"
        icon={FileText}
        description="Drafts are assembled from your company profile and the published requirement catalog. Missing facts appear as placeholders — the factory never invents implementation details, never marks anything approved, and never signs. Complete your Company profile first for richer drafts."
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-4">
        <div className="grid sm:grid-cols-3 gap-5 text-sm">
          <div className="flex items-start gap-2.5">
            <CircleHelp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">What is this?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A generator that assembles DRAFT policy documents — one per requirement family —
                from the facts in your Company profile. Every draft opens with DRAFT — CUSTOMER
                REVIEW REQUIRED and stays a draft until a person on your team acts on it outside
                this factory.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Why it matters</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Assessments run on written policies, and small companies stall writing them from a
                blank page. A skeleton pre-filled with your real facts gets you to review faster —
                but an unreviewed draft is not a policy: someone has to read, correct, and adopt it.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Footprints className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Your next step</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete your Company profile, then generate a family below and download the draft.
                Anything marked [CUSTOMER INPUT REQUIRED] is a fact only you can supply — fill it
                in during your review.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Generator bar */}
      <Card className="p-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">
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
      </Card>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {docs.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No documents yet. Generate your first family policy draft above.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-sm">{d.title}</span>
                <StateBadge tone={d.status === 'draft' ? 'amber' : 'slate'}>
                  {d.status.toUpperCase()}
                </StateBadge>
                {d.rule_pack_version && (
                  <code className="text-[10px] text-muted-foreground">{d.rule_pack_version}</code>
                )}
                {d.content_hash && (
                  <code className="text-[10px] text-muted-foreground">sha256:{d.content_hash.slice(0, 12)}…</code>
                )}
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                  {new Date(d.created_at).toLocaleString()}
                </span>
                <GlassButton onClick={() => download(d.id, d.title)}>
                  <Download className="h-3.5 w-3.5 text-current mr-1.5" /> Download DRAFT
                </GlassButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      <OfficialLinksPanel surface="documents" title="Policy and signature sources" />
    </div>
  );
}
