'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Loader2, Download, Sparkles, Info, BookOpen } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { PageHeader, Card, StatTile, SegmentBar, StateBadge, type Tone } from '@/components/launchpad/ui';
import { FeatureGate, TierTag } from '@/components/launchpad/entitlements';

/**
 * SSP workbench — generate and download a DRAFT System Security Plan skeleton.
 *
 * The skeleton is deterministic assembly from the tenant's own recorded facts
 * (company profile + control register + evidence-index counts) — no model,
 * no invention. Family meters below show exactly how complete the inputs are
 * BEFORE generating, so nobody is surprised by a document full of
 * [CUSTOMER INPUT REQUIRED] placeholders.
 */

interface FamilyRow {
  family: string;
  familyName: string;
  total: number;
  implemented: number;
  partial: number;
  notImplemented: number;
  notApplicable: number;
  unassessed: number;
  evidenceRecords: number;
}

interface DocRow {
  id: string;
  title: string;
  status: string;
  template_version: string | null;
  content_hash: string | null;
  created_at: string;
}

const STATUS_TONE: Record<string, Tone> = {
  draft: 'amber',
  customer_review: 'sky',
  approved: 'emerald',
  superseded: 'slate',
};

export default function SspPage() {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/ssp', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setFamilies(d.families ?? []);
        setDocuments(d.documents ?? []);
        setNote(d.note ?? null);
        setErr(null);
      } else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load the SSP workbench'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/ssp', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Generation failed'); return; }
      await load();
    } finally { setGenerating(false); }
  };

  const download = async (id: string) => {
    setDownloadingId(id); setErr(null);
    try {
      const r = await fetch(`/api/fusarium/launchpad/readiness/ssp?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.document?.markdown) { setErr(d?.error || 'Could not fetch the draft'); return; }
      const blob = new Blob([d.document.markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssp-draft-${d.document.created_at?.slice(0, 10) ?? 'download'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setDownloadingId(null); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading SSP workbench…
    </div>;
  }

  const totalAssessed = families.reduce((s, f) => s + f.implemented + f.partial + f.notImplemented + f.notApplicable, 0);
  const totalControls = families.reduce((s, f) => s + f.total, 0);
  const totalEvidence = families.reduce((s, f) => s + f.evidenceRecords, 0);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="System Security Plan (SSP)"
        icon={FileCheck2}
        description={<>Assemble a DRAFT SSP skeleton from your own recorded facts — deterministic, no AI drafting, every missing fact left as an explicit placeholder. <TierTag feature="documentFactory" /></>}
        actions={
          <GlassButton onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> : <Sparkles className="h-4 w-4 text-current mr-2" />}
            Generate DRAFT
          </GlassButton>
        }
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="pl-1.5 grid sm:grid-cols-3 gap-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <BookOpen className="h-3.5 w-3.5" /> What is this
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An <strong className="text-foreground">SSP (System Security Plan)</strong> is the single document that
              describes your system, its boundary (which machines and services handle sensitive government data),
              and how each of the 110 NIST SP 800-171 requirements is handled. Assessors and contracting officers
              read it first — it is the front door of your entire assessment.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Why it matters</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Without an SSP you cannot self-assess at all — the SSP requirement (CA.L2-3.12.4) blocks eligibility
              outright, regardless of score. And it is a long-lived artifact: assessment records, including every
              affirmed SSP version, must be retained for <strong className="text-foreground">six years</strong>.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Your next step</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fill your company profile, mark requirement states in the control register, and index evidence.
              Then generate the skeleton below, download the markdown, and replace every{' '}
              <code className="text-[10px] px-1 rounded bg-muted">[CUSTOMER INPUT REQUIRED]</code> with your real
              facts. A human official approves — the factory never does.
            </p>
          </div>
        </div>
      </Card>

      {err && <Card tone="red" className="p-4 mb-5"><p className="text-sm pl-1.5">{err}</p></Card>}

      <FeatureGate feature="documentFactory">
        {/* Input readiness */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <StatTile label="Requirements assessed" tone={totalAssessed > 0 ? 'sky' : 'slate'}
            value={<>{totalAssessed}<span className="text-base font-normal text-muted-foreground">/{totalControls}</span></>}
            sub="customer-marked in the control register" />
          <StatTile label="Evidence records" tone={totalEvidence > 0 ? 'sky' : 'slate'} value={totalEvidence}
            sub="metadata + hash only — content stays in your systems" />
          <StatTile label="Drafts generated" tone={documents.length > 0 ? 'emerald' : 'slate'} value={documents.length}
            sub="every draft needs customer review before use" />
        </div>

        {/* Family-by-family completeness */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Section completeness — the 14 NIST SP 800-171 families
        </h2>
        <p className="text-xs text-muted-foreground mb-3 max-w-3xl">
          Each family becomes one section of the SSP. The meters show what the skeleton will contain today:
          anything unassessed or unimplemented renders as an honest gap with a placeholder, never as a claim.
        </p>
        <div className="grid md:grid-cols-2 gap-3 mb-8">
          {families.map((f) => (
            <Card key={f.family} className="p-4">
              <div className="pl-1.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold">
                    <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted mr-2">{f.family}</code>
                    {f.familyName}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{f.evidenceRecords} evidence</span>
                </div>
                <SegmentBar
                  total={f.total}
                  segments={[
                    { tone: 'emerald', value: f.implemented, label: 'implemented (customer-marked)' },
                    { tone: 'amber', value: f.partial, label: 'partial' },
                    { tone: 'red', value: f.notImplemented, label: 'not implemented' },
                    { tone: 'sky', value: f.notApplicable, label: 'N/A' },
                    { tone: 'slate', value: f.unassessed, label: 'unassessed' },
                  ]}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Drafts */}
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Generated drafts
        </h2>
        {documents.length === 0 ? (
          <Card className="p-8 text-center">
            <FileCheck2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No SSP draft yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {note ?? 'Generate assembles a DRAFT skeleton from your recorded facts. Approval is a separate human action.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="pl-1.5 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{doc.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(doc.created_at).toLocaleString()}
                      {doc.content_hash && <code className="ml-2 text-[10px]">sha256:{doc.content_hash.slice(0, 12)}…</code>}
                    </div>
                  </div>
                  <StateBadge tone={STATUS_TONE[doc.status] ?? 'slate'}>{doc.status.replace(/_/g, ' ')}</StateBadge>
                  <GlassButton onClick={() => download(doc.id)} disabled={downloadingId === doc.id}>
                    {downloadingId === doc.id
                      ? <Loader2 className="h-4 w-4 animate-spin text-current mr-2" />
                      : <Download className="h-4 w-4 text-current mr-2" />}
                    Download DRAFT (.md)
                  </GlassButton>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground mt-5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Every section is headed &quot;DRAFT — CUSTOMER REVIEW REQUIRED&quot; and every status reads
            &quot;customer-marked&quot;. The document never states you are certified or compliant — the safe
            phrasing for outside use is &quot;pursuing CMMC Level 2 (Self-Assessment)&quot;. Store the executed
            version in your own authoritative system and keep it for six years.
          </span>
        </div>
      </FeatureGate>
    </div>
  );
}
