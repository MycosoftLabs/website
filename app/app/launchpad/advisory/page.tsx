'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Clock, Users, MessageSquareText, Loader2 } from 'lucide-react';
import { PageHeader, Card, StateBadge } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';
import { OfficialLinksPanel } from '@/components/launchpad/official-links';
import { CATALOG } from '@/lib/launchpad/catalog';

/**
 * Advisory — paid 1-on-1 working sessions, booked through real Stripe
 * checkout (test mode in this environment) using the advisory SKUs from the
 * single catalog source. Prices render from the catalog, never hardcoded.
 *
 * Honest framing everywhere: advisory is practical guidance, not legal or
 * consulting representation, and never a compliance certification.
 */

const FIELD = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

const SESSION_BLURBS: Record<number, { title: string; blurb: string }> = {
  15: { title: 'Quick unblock', blurb: 'One specific question, answered. "Which registration comes first?" "Is this clause a dealbreaker?"' },
  30: { title: 'Focused session', blurb: 'Work one topic end-to-end: a registration, a readiness question, a sanity-check on an opportunity.' },
  60: { title: 'Deep dive', blurb: 'Readiness planning, gap walkthroughs, proposal strategy — with time to look at your actual materials.' },
  90: { title: 'Working session', blurb: 'Build the artifact together on a screen-share and leave with a concrete output, not just notes.' },
};

const price = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function AdvisoryPage() {
  const advisorySkus = CATALOG
    .filter((p) => p.kind === 'advisory')
    .sort((a, b) => (a.advisoryMinutes ?? 0) - (b.advisoryMinutes ?? 0));

  const [booking, setBooking] = useState<string | null>(null);
  const [bookNote, setBookNote] = useState<string | null>(null);

  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [topicNote, setTopicNote] = useState<{ tone: 'ok' | 'info' | 'error'; text: string } | null>(null);
  const [credits, setCredits] = useState<Array<{ id: string; sku: string; minutes: number; status: string }>>([]);
  const [calNote, setCalNote] = useState<string | null>(null);
  const [calBlocking, setCalBlocking] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fusarium/launchpad/advisory/booking', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.credits)) setCredits(d.credits);
        if (d.calcom && d.calcom.configured === false) {
          const reason = d.note || d.calcom.blockingReason;
          setCalNote(reason);
          setCalBlocking(d.calcom.blockingReason || reason);
        }
      })
      .catch(() => undefined);
  }, []);

  const book = async (lookupKey: string) => {
    setBooking(lookupKey); setBookNote(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) { window.location.href = d.url; return; }
      setBookNote(d?.error || 'Checkout could not be started.');
    } catch { setBookNote('Checkout could not be started.'); }
    finally { setBooking(null); }
  };

  const scheduleCredit = async (creditId: string) => {
    setSchedulingId(creditId);
    try {
      const r = await fetch('/api/fusarium/launchpad/advisory/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditId }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.bookingUrl) {
        window.location.href = d.bookingUrl;
        return;
      }
      setCalNote(d?.error || 'Cal.com booking is not configured — availability is not invented.');
    } catch {
      setCalNote('Could not open Cal.com.');
    } finally {
      setSchedulingId(null);
    }
  };

  const submitTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;
    setSubmitting(true); setTopicNote(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Advisory topic: ${trimmed.slice(0, 120)}`,
          category: 'advisory',
          kind: 'advisory',
          detail: trimmed.slice(0, 4000),
        }),
      });
      if (r.status === 404) {
        setTopicNote({
          tone: 'info',
          text: 'The request queue is not live yet — it is coming. Until then, founder time is booked directly through the paid sessions above.',
        });
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setTopicNote({ tone: 'error', text: d?.error || `HTTP ${r.status}` }); return; }
      setTopic('');
      setTopicNote({ tone: 'ok', text: 'Topic recorded in your workspace queue. It shapes upcoming clinics and session prep — it is not a booking.' });
    } catch { setTopicNote({ tone: 'error', text: 'Could not submit the topic — please retry.' }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Advisory"
        icon={CalendarClock}
        description="Short, paid working sessions with practitioners who have set up defense-contractor operations before. Guidance, not representation — and never a certification."
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">What is this</div>
            <p className="text-muted-foreground leading-relaxed">
              1-on-1 time with the FUSARIUM team, sold in fixed blocks. You bring the question — a
              registration, a solicitation (the government&apos;s published request for offers), a readiness
              gap — and work it live.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Why it matters</div>
            <p className="text-muted-foreground leading-relaxed">
              Founders new to government work lose weeks to questions a practitioner answers in minutes.
              Fifteen focused minutes at the right moment is often the cheapest unblock available.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Your next step</div>
            <p className="text-muted-foreground leading-relaxed">
              Book the smallest block that fits your question — or post a topic below (free) so it can shape
              the next group clinic.
            </p>
          </div>
        </div>
      </Card>

      {/* Honest-framing boundary */}
      <Card tone="amber" className="p-4 mb-6">
        <p className="pl-1.5 text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">What advisory is not:</span> it is not legal advice,
          not consulting representation, and never a compliance certification. No session marks a requirement
          &quot;met&quot; or makes your company &quot;compliant&quot; — assessments belong to assessors, and
          implementation decisions stay yours.
        </p>
      </Card>

      {bookNote && <p className="text-sm text-destructive mb-4">{bookNote}</p>}
      {calNote && <p className="text-sm text-muted-foreground mb-4">{calNote}</p>}

      {credits.some((c) => c.status === 'unredeemed') && (
        <Card className="p-4 mb-6">
          <h2 className="text-sm font-semibold mb-2">Sessions you have paid for</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Stripe already captured payment. Schedule on Cal.com — Launchpad does not invent open slots.
          </p>
          <ul className="space-y-2">
            {credits.filter((c) => c.status === 'unredeemed').map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="text-sm">{c.minutes}-minute session</span>
                <GlassButton onClick={() => scheduleCredit(c.id)} disabled={schedulingId !== null}>
                  {schedulingId === c.id ? 'Opening Cal.com…' : 'Schedule now'}
                </GlassButton>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Session cards — prices straight from the catalog */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {advisorySkus.map((p) => {
          const meta = SESSION_BLURBS[p.advisoryMinutes ?? 0];
          return (
            <Card key={p.lookupKey} className="p-4 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-2">
                <StateBadge tone="sky">
                  <Clock className="h-3 w-3" /> <span className="tabular-nums">{p.advisoryMinutes} min</span>
                </StateBadge>
                <span className="text-lg font-bold tabular-nums">{price(p.unitAmount)}</span>
              </div>
              <div className="text-sm font-semibold mb-1">{meta ? meta.title : p.name}</div>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">
                {meta ? meta.blurb : ''}
              </p>
              <GlassButton
                onClick={() => book(p.lookupKey)}
                disabled={booking !== null || Boolean(calBlocking)}
                className="myco-glass-button--block"
              >
                {calBlocking ? 'Booking unavailable' : booking === p.lookupKey ? 'Opening checkout…' : 'Book'}
              </GlassButton>
            </Card>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mb-8 leading-snug">
        Pay in Stripe first. Schedule then opens a real Cal.com link on Morgan&apos;s calendar. Availability
        is never invented — checkout stays disabled until Cal.com is configured including the redeem webhook.
      </p>

      {/* Group clinics */}
      <Card className="p-5 mb-6">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-emerald-500" /> Group onboarding clinics — included in your plan
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every paid plan includes monthly group onboarding clinics: a live group session where new founders
          walk the same first steps together — registrations, readiness basics, reading a first solicitation —
          and ask questions as they come up. Clinics are included per plan at no extra charge; invitations go
          to workspace owners by email. The topics you submit below feed the clinic agenda.
        </p>
      </Card>

      {/* Topic request */}
      <Card className="p-5">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-1">
          <MessageSquareText className="h-4 w-4 text-emerald-500" /> Request a topic
        </h2>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          Free. Tell us what you are stuck on or want covered — it lands in your workspace task queue and
          shapes clinic agendas and session prep. Do not paste sensitive technical data here; a plain-English
          description of the topic is all that is needed.
        </p>
        <form onSubmit={submitTopic} className="space-y-3">
          {/* No visible label element in this layout, so the field carries its own
              name — otherwise a screen reader announces a bare "edit text". */}
          <textarea
            id="advisory-topic"
            aria-label="Request a topic"
            className={FIELD}
            rows={3}
            maxLength={4000}
            placeholder="e.g. How do we decide between SBIR Phase I and a Direct-to-Phase-II? What does a first SAM.gov registration actually involve?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <GlassButton type="submit" disabled={submitting || !topic.trim()}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin text-current mr-2" /> Submitting…</> : 'Submit topic'}
            </GlassButton>
            {topicNote && (
              <p className={`text-xs ${topicNote.tone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {topicNote.text}
              </p>
            )}
          </div>
        </form>
      </Card>
      <OfficialLinksPanel surface="advisory" title="Where to read more" />
    </div>
  );
}
