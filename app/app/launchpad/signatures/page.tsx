'use client';

import { useCallback, useEffect, useState } from 'react';
import { PenLine, Loader2, ExternalLink } from 'lucide-react';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';

interface EnvelopeRow {
  id: string;
  document_id: string | null;
  status: string;
  provider_envelope_id: string | null;
  completed_doc_sha256: string | null;
  sent_at: string | null;
  completed_at: string | null;
}

/**
 * Signature center — envelope metadata only. Humans sign in DocuSign.
 * Launchpad never applies a signature or stores signed PDF bytes.
 */
export default function SignaturesPage() {
  const [envelopes, setEnvelopes] = useState<EnvelopeRow[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/signatures', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) {
        setEnvelopes(d.envelopes ?? []);
        setNote(d.note ?? null);
        setConnected(Boolean(d.connection?.connected));
        setErr(null);
      } else setErr(d?.error || `HTTP ${r.status}`);
    } catch {
      setErr('Could not load envelopes');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    const r = await fetch('/api/fusarium/launchpad/signatures/oauth');
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.authorizeUrl) {
      setAuthorizeUrl(d.authorizeUrl);
      window.location.href = d.authorizeUrl;
      return;
    }
    setErr(d?.error || 'DocuSign OAuth is not configured.');
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading signatures…
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Signatures"
        icon={PenLine}
        description="Route DRAFT documents to authorized officials in DocuSign. Launchpad stores envelope id, status, and a hash — never the signed file or a signature image."
      />
      <Card className="p-4 mb-6">
        <p className="text-sm text-muted-foreground mb-3">
          Customer DocuSign account is the default send path. Mycosoft does not sign for you.
        </p>
        <GlassButton onClick={connect} disabled={connected}>
          {connected ? 'DocuSign connected' : 'Connect DocuSign'}
        </GlassButton>
        {authorizeUrl && (
          <a href={authorizeUrl} className="ml-3 text-sm underline inline-flex items-center gap-1">
            Open DocuSign <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </Card>
      {err && <p className="text-sm text-destructive mb-4">{err}</p>}
      {note && <p className="text-xs text-muted-foreground mb-4">{note}</p>}
      {envelopes.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          No envelopes yet. Generate a DRAFT on Documents, then send it from this pipeline once DocuSign is connected.
        </Card>
      ) : (
        <div className="space-y-2">
          {envelopes.map((e) => (
            <Card key={e.id} className="p-4 flex flex-wrap items-center gap-3">
              <StateBadge tone={e.status === 'completed' ? 'emerald' : 'amber'}>{e.status}</StateBadge>
              <code className="text-[11px] text-muted-foreground">{e.provider_envelope_id ?? e.id.slice(0, 8)}</code>
              {e.completed_doc_sha256 && (
                <code className="text-[10px] text-muted-foreground">sha256:{e.completed_doc_sha256.slice(0, 12)}…</code>
              )}
            </Card>
          ))}
        </div>
      )}
      <OfficialLinksPanel surface="documents" />
    </div>
  );
}
