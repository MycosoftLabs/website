'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ListTodo, Loader2, Plus, CalendarClock, CircleHelp, Target, Footprints, Play, X,
} from 'lucide-react';
import { PageHeader, Card, StatTile, StateBadge, type Tone } from '@/components/launchpad/ui';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox, LiquidRadio, LiquidSwitch } from '@/components/launchpad/liquid';

/**
 * Tasks & deadlines — the tenant's operating to-do list plus an "operating
 * calendar": one chronological view that merges task due dates with the
 * tenant's open POA&M closeout clocks (fetched defensively — if the POA&M
 * endpoint is unavailable, tasks still render and the gap is named).
 *
 * Column truth (supabase/migrations/20260811090100_launchpad_asa.sql,
 * launchpad_tasks): the pinned contract's `category` is the real column
 * `kind`; the API speaks `kind` end to end.
 */

interface TaskRecord {
  id: string;
  title: string;
  detail: string | null;
  kind: string; // contract name: category
  control_id: string | null;
  status: string; // open | in_progress | done | dropped
  due_at: string | null; // date column, YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

interface PoamItem {
  id: string;
  control_id: string;
  status: string;
  weakness: string | null;
  due_at: string | null;
}

const KINDS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'readiness', label: 'Readiness', hint: 'self-assessment work against the 110 requirements' },
  { value: 'registration', label: 'Registration', hint: 'SAM.gov, UEI/CAGE, portal accounts and renewals' },
  { value: 'enclave', label: 'Enclave', hint: 'your protected IT environment for sensitive work' },
  { value: 'advisory', label: 'Advisory', hint: 'follow-ups from advisory sessions' },
  { value: 'formation', label: 'Formation', hint: 'company/legal setup (entity, banking, insurance)' },
  { value: 'general', label: 'General', hint: 'everything else' },
];

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  open: { label: 'open', tone: 'sky' },
  in_progress: { label: 'in progress', tone: 'amber' },
  done: { label: 'done', tone: 'emerald' },
  dropped: { label: 'dropped', tone: 'slate' },
};
const STATUS_ORDER = ['open', 'in_progress', 'done', 'dropped'];

const fieldCls = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

const daysLeft = (d: string) => Math.ceil((Date.parse(d) - Date.now()) / 86_400_000);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function DueChip({ due }: { due: string }) {
  const d = daysLeft(due);
  const cls = d < 0 ? 'text-red-500' : d <= 14 ? 'text-amber-500' : 'text-muted-foreground';
  return (
    <span className={`text-xs font-semibold tabular-nums ${cls}`}>
      {d < 0 ? `${-d}d overdue` : d === 0 ? 'due today' : `${d}d left`}
    </span>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [poam, setPoam] = useState<PoamItem[]>([]);
  const [poamAvailable, setPoamAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarView, setCalendarView] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [form, setForm] = useState({ title: '', kind: 'readiness', dueAt: '', detail: '' });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/tasks', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setTasks(d.tasks ?? []); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load tasks'); }
    finally { setLoading(false); }
  }, []);

  // Defensive: POA&M dates enrich the calendar but must never break this page.
  const loadPoam = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/readiness/poam', { cache: 'no-store' });
      if (!r.ok) { setPoamAvailable(false); return; }
      const d = await r.json().catch(() => null);
      setPoam(Array.isArray(d?.items) ? d.items : []);
      setPoamAvailable(true);
    } catch { setPoamAvailable(false); }
  }, []);

  useEffect(() => { load(); loadPoam(); }, [load, loadPoam]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          kind: form.kind, // pinned contract name: category
          dueAt: form.dueAt || undefined,
          detail: form.detail || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Could not create task'); return; }
      setShowForm(false);
      setForm({ title: '', kind: 'readiness', dueAt: '', detail: '' });
      await load();
    } finally { setSaving(false); }
  };

  const setStatus = async (id: string, status: string) => {
    setErr(null);
    const r = await fetch('/api/fusarium/launchpad/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    if (!r || !r.ok) {
      const d = r ? await r.json().catch(() => ({})) : {};
      setErr((d as { error?: string })?.error || 'Could not update task');
    }
    await load();
  };

  const filtered = useMemo(
    () => (kindFilter === 'all' ? tasks : tasks.filter((t) => t.kind === kindFilter)),
    [tasks, kindFilter],
  );

  const openCount = tasks.filter((t) => t.status === 'open').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  // Operating calendar: active tasks with due dates + open POA&M closeout clocks.
  const deadlines = useMemo(() => {
    const rows: Array<{ key: string; date: string; title: string; source: 'task' | 'poam'; kind?: string; status: string }> = [];
    for (const t of filtered) {
      if (t.due_at && (t.status === 'open' || t.status === 'in_progress')) {
        rows.push({ key: `task-${t.id}`, date: t.due_at, title: t.title, source: 'task', kind: t.kind, status: t.status });
      }
    }
    for (const p of poam) {
      if (p.due_at && (p.status === 'open' || p.status === 'in_progress')) {
        rows.push({
          key: `poam-${p.id}`,
          date: p.due_at,
          title: `POA&M closeout — ${p.control_id}${p.weakness ? `: ${p.weakness}` : ''}`,
          source: 'poam',
          status: p.status,
        });
      }
    }
    return rows.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }, [filtered, poam]);

  const nextDeadline = deadlines.length > 0 ? deadlines[0] : null;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading tasks…
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Tasks & deadlines"
        description="Your operating to-do list across readiness, registrations, and company setup — with every hard deadline on one calendar."
        icon={ListTodo}
        actions={
          <GlassButton onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 text-current mr-2" /> New task
          </GlassButton>
        }
      />

      {/* Education-first intro */}
      <Card className="p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-5 text-sm">
          <div className="flex items-start gap-2.5">
            <CircleHelp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">What is this?</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                One list for everything government work makes you track: readiness gaps, registration
                renewals, enclave setup, and advisory follow-ups — each with an owner-visible due date.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Why it matters</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Government deadlines are unforgiving: a lapsed SAM.gov registration blocks awards, and every
                item on your POA&M (Plan of Action &amp; Milestones — the dated list of security gaps you have
                committed to fix) carries a 180-day closeout clock.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Footprints className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Your next step</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add your first task with a due date, then flip on the operating calendar to see task
                deadlines and POA&M closeout dates merged in one chronological view.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {err && <p className="text-sm text-destructive mb-4">{err}</p>}

      {/* Counts + next deadline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tasks.length === 0 ? (
          <>
            <StatTile label="Open" tone="slate" empty="No tasks yet" />
            <StatTile label="In progress" tone="slate" empty="No tasks yet" />
            <StatTile label="Done" tone="slate" empty="No tasks yet" />
            <StatTile label="Next deadline" tone="slate" empty={poamAvailable ? 'Nothing scheduled' : 'POA&M dates unavailable'} />
          </>
        ) : (
          <>
            <StatTile label="Open" value={openCount} tone={openCount > 0 ? 'sky' : 'slate'} sub="waiting to start" />
            <StatTile label="In progress" value={inProgressCount} tone={inProgressCount > 0 ? 'amber' : 'slate'} sub="being worked" />
            <StatTile label="Done" value={doneCount} tone={doneCount > 0 ? 'emerald' : 'slate'} sub="completed" />
            {nextDeadline ? (
              <StatTile
                label="Next deadline"
                value={<span className="text-lg">{new Date(nextDeadline.date).toLocaleDateString()}</span>}
                sub={nextDeadline.title}
                tone={daysLeft(nextDeadline.date) < 14 ? 'red' : 'sky'}
              />
            ) : (
              <StatTile label="Next deadline" tone="slate" empty="No due dates set" />
            )}
          </>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="p-5 mb-6">
          <form onSubmit={create} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Title *</label>
                <input required className={fieldCls} value={form.title} maxLength={300}
                  placeholder="e.g. Renew SAM.gov registration"
                  onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Due date</label>
                <input type="date" className={fieldCls} value={form.dueAt}
                  onChange={(e) => setForm((x) => ({ ...x, dueAt: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {KINDS.map((k) => (
                  <LiquidRadio
                    key={k.value}
                    name="task-kind"
                    value={k.value}
                    checked={form.kind === k.value}
                    onChange={() => setForm((x) => ({ ...x, kind: k.value }))}
                    label={<span title={k.hint}>{k.label}</span>}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {KINDS.find((k) => k.value === form.kind)?.hint}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Detail</label>
              <textarea className={fieldCls} rows={3} value={form.detail} maxLength={4000}
                placeholder="What done looks like, links to the portal or requirement, who else is involved…"
                onChange={(e) => setForm((x) => ({ ...x, detail: e.target.value }))} />
            </div>
            <GlassButton type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create task'}
            </GlassButton>
          </form>
        </Card>
      )}

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {[{ value: 'all', label: 'All' }, ...KINDS].map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKindFilter(k.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                kindFilter === k.value
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {k.label}
              {k.value !== 'all' && (
                <span className="ml-1 tabular-nums opacity-70">{tasks.filter((t) => t.kind === k.value).length}</span>
              )}
            </button>
          ))}
        </div>
        <LiquidSwitch
          checked={calendarView}
          onChange={setCalendarView}
          label={<span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Operating calendar</span>}
        />
      </div>

      {calendarView ? (
        /* ------------------------- Operating calendar ------------------------- */
        <div>
          {!poamAvailable && (
            <p className="text-xs text-muted-foreground mb-3">
              POA&M due dates are unavailable right now — showing task deadlines only.
            </p>
          )}
          {deadlines.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No upcoming deadlines. Give tasks a due date and they appear here; open POA&M items with
              closeout dates merge in automatically.
            </div>
          ) : (
            <div className="space-y-2">
              {deadlines.map((d) => (
                <Card key={d.key} tone={daysLeft(d.date) < 0 ? 'red' : daysLeft(d.date) <= 14 ? 'amber' : 'sky'} className="p-4">
                  <div className="flex flex-wrap items-center gap-3 pl-1.5">
                    <span className="text-sm font-semibold tabular-nums w-40 shrink-0">{fmtDate(d.date)}</span>
                    {d.source === 'poam' ? (
                      <StateBadge tone="amber">POA&M clock</StateBadge>
                    ) : (
                      <StateBadge tone={STATUS_META[d.status]?.tone ?? 'slate'}>
                        {KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}
                      </StateBadge>
                    )}
                    <span className="text-sm min-w-0 flex-1 truncate" title={d.title}>{d.title}</span>
                    <span className="ml-auto"><DueChip due={d.date} /></span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* --------------------------- Status board ---------------------------- */
        <div className="space-y-6">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {tasks.length === 0
                ? 'No tasks yet. Create your first one — a good starter is "Verify SAM.gov registration status" under Registration.'
                : 'No tasks in this category yet.'}
            </div>
          ) : (
            STATUS_ORDER.map((status) => {
              const rows = filtered.filter((t) => t.status === status);
              if (rows.length === 0) return null;
              const meta = STATUS_META[status];
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <StateBadge tone={meta.tone}>{meta.label}</StateBadge>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{rows.length}</span>
                  </div>
                  <div className="space-y-2">
                    {rows.map((t) => (
                      <Card key={t.id} className={`p-4 ${status === 'done' || status === 'dropped' ? 'opacity-70' : ''}`}>
                        <div className="flex flex-wrap items-center gap-3">
                          <LiquidCheckbox
                            checked={t.status === 'done'}
                            onChange={(checked) => setStatus(t.id, checked ? 'done' : 'open')}
                            label={<span className={`text-sm font-medium ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</span>}
                          />
                          <span className="text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                            {KINDS.find((k) => k.value === t.kind)?.label ?? t.kind}
                          </span>
                          {t.control_id && <code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{t.control_id}</code>}
                          {t.due_at && (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5" /> {new Date(t.due_at).toLocaleDateString()}
                            </span>
                          )}
                          {t.due_at && t.status !== 'done' && t.status !== 'dropped' && <DueChip due={t.due_at} />}
                          <span className="ml-auto flex items-center gap-2">
                            {t.status === 'open' && (
                              <GlassButton className="text-xs" onClick={() => setStatus(t.id, 'in_progress')}>
                                <Play className="h-3.5 w-3.5 text-current mr-1.5" /> Start
                              </GlassButton>
                            )}
                            {(t.status === 'open' || t.status === 'in_progress') && (
                              <GlassButton className="text-xs" onClick={() => setStatus(t.id, 'dropped')}>
                                <X className="h-3.5 w-3.5 text-current mr-1.5" /> Drop
                              </GlassButton>
                            )}
                            {t.status === 'dropped' && (
                              <GlassButton className="text-xs" onClick={() => setStatus(t.id, 'open')}>
                                Reopen
                              </GlassButton>
                            )}
                          </span>
                        </div>
                        {t.detail && <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{t.detail}</p>}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
