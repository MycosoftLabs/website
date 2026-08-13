'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Factory, Loader2, Plus, Pencil, Trash2, Flag, Sparkles, Info, X,
} from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import { LiquidCheckbox } from '@/components/launchpad/liquid';
import { PageHeader, Card, StatTile, StateBadge, type Tone } from '@/components/launchpad/ui';
import { FeatureGate, TierTag, useEntitlements } from '@/components/launchpad/entitlements';

/**
 * Origin Graph — the BOM (bill of materials) workbook.
 *
 * Every line is screened server-side against PUBLIC prohibited-source lists
 * (Section 889, DoD §1260H, FCC Covered List, covered foreign countries).
 * A flag is a prompt for the customer to verify against the official list —
 * never an automated legal conclusion. Domestic content is an estimate by
 * cost, never a BAA/TAA determination, and nothing here is "certified".
 */

interface BomFlag {
  code: string;
  rule: string;
  matched: string;
  message: string;
}
interface BomPart {
  id: string;
  assembly: string | null;
  part_number: string | null;
  description: string | null;
  quantity: number | null;
  unit_cost: number | null;
  manufacturer: string | null;
  supplier: string | null;
  country_of_origin: string | null;
  origin_confidence: number | null;
  prototype_only: boolean;
  flags: BomFlag[] | null;
  created_at: string;
}
interface Summary {
  totalParts: number;
  domesticPct: number | null;
  flaggedCount: number;
}

const RED_CODES = ['prohibited_entity', 'covered_country_origin'];
const NOTE_CODE = 'substitution_note';
const FLAG_TONE: Record<string, Tone> = {
  prohibited_entity: 'red',
  covered_country_origin: 'red',
  covered_component_review: 'amber',
  unknown_origin: 'amber',
};

const field = 'myco-glass-field w-full rounded-lg border border-border px-3 py-2 text-sm';

const screeningFlags = (p: BomPart): BomFlag[] => (p.flags ?? []).filter((f) => f.code !== NOTE_CODE);
const redFlags = (p: BomPart): BomFlag[] => (p.flags ?? []).filter((f) => RED_CODES.includes(f.code));
const noteOf = (p: BomPart): string => (p.flags ?? []).find((f) => f.code === NOTE_CODE)?.message ?? '';
const money = (n: number | null): string =>
  n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const extCost = (p: BomPart): number | null =>
  p.unit_cost == null ? null : (p.quantity && p.quantity > 0 ? p.quantity : 1) * p.unit_cost;

const EMPTY_FORM = {
  description: '', partNumber: '', assembly: '', manufacturer: '', supplier: '',
  countryOfOrigin: '', quantity: '', unitCost: '', prototypeOnly: false, substitutionNote: '',
};

export default function OriginGraphPage() {
  const { entitlements } = useEntitlements();
  const [parts, setParts] = useState<BomPart[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteSaving, setNoteSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fusarium/launchpad/origin/bom', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok) { setParts(d.parts ?? []); setSummary(d.summary ?? null); setErr(null); }
      else setErr(d?.error || `HTTP ${r.status}`);
    } catch { setErr('Could not load the BOM'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const lineLimit = typeof entitlements?.bomLineLimit === 'number' ? entitlements.bomLineLimit : null;
  const atLimit = lineLimit !== null && lineLimit > 0 && parts.length >= lineLimit && !editingId;
  const unscoredLines = parts.filter((p) => !(p.country_of_origin ?? '').trim() || p.unit_cost == null).length;

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const openEdit = (p: BomPart) => {
    setEditingId(p.id);
    setForm({
      description: p.description ?? '',
      partNumber: p.part_number ?? '',
      assembly: p.assembly ?? '',
      manufacturer: p.manufacturer ?? '',
      supplier: p.supplier ?? '',
      countryOfOrigin: p.country_of_origin ?? '',
      quantity: p.quantity == null ? '' : String(p.quantity),
      unitCost: p.unit_cost == null ? '' : String(p.unit_cost),
      prototypeOnly: Boolean(p.prototype_only),
      substitutionNote: noteOf(p),
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr(null);
    try {
      const quantity = form.quantity.trim() === '' ? undefined : Number(form.quantity);
      const unitCost = form.unitCost.trim() === '' ? undefined : Number(form.unitCost);
      if ((quantity !== undefined && !Number.isFinite(quantity)) || (unitCost !== undefined && !Number.isFinite(unitCost))) {
        setErr('Quantity and unit cost must be numbers'); return;
      }
      const r = await fetch('/api/fusarium/launchpad/origin/bom', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          description: form.description,
          partNumber: form.partNumber,
          assembly: form.assembly,
          manufacturer: form.manufacturer,
          supplier: form.supplier,
          countryOfOrigin: form.countryOfOrigin,
          quantity, unitCost,
          prototypeOnly: form.prototypeOnly,
          substitutionNote: form.substitutionNote || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || 'Save failed'); return; }
      setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM });
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (p: BomPart) => {
    if (!window.confirm(`Remove "${p.description ?? p.part_number ?? 'this part'}" from the BOM?`)) return;
    setErr(null);
    const r = await fetch('/api/fusarium/launchpad/origin/bom', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d?.error || 'Remove failed'); return; }
    await load();
  };

  const saveNote = async (p: BomPart) => {
    setNoteSaving(p.id); setErr(null);
    try {
      const r = await fetch('/api/fusarium/launchpad/origin/bom', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, substitutionNote: noteDrafts[p.id] ?? '' }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d?.error || 'Could not save the note'); return; }
      await load();
    } finally { setNoteSaving(null); }
  };

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-current" /> Loading Origin Graph…
    </div>;
  }

  const flagged = parts.filter((p) => redFlags(p).length > 0);
  const domesticTone: Tone = summary?.domesticPct == null ? 'slate' : summary.domesticPct >= 60 ? 'emerald' : 'amber';

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        title="Origin Graph — bill of materials"
        icon={Factory}
        description={<>Where every part of your product comes from, what it costs, and which parts could block
          a federal award. <TierTag feature="originGraph" /></>}
        actions={
          <GlassButton onClick={openAdd} disabled={atLimit}>
            <Plus className="h-4 w-4 text-current mr-2" /> Add part
          </GlassButton>
        }
      />

      <FeatureGate feature="originGraph">
        {/* Education first: founders who have never sold to the government. */}
        <Card tone="sky" className="p-5 mb-6">
          <div className="pl-1.5 grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-500 mb-1">What is this</div>
              <p className="text-muted-foreground leading-relaxed">
                Your <strong className="text-foreground">BOM</strong> (bill of materials — the parts list for the
                thing you build) with each line screened against public banned-source lists, plus a running
                <strong className="text-foreground"> domestic content</strong> estimate — how much of your product,
                by cost, is US-made.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-500 mb-1">Why it matters</div>
              <p className="text-muted-foreground leading-relaxed">
                Defense contracts carry &quot;Made in America&quot; rules (the Buy American Act) and hard bans:
                <strong className="text-foreground"> Section 889</strong> is a federal law that bars contractors from
                using certain Chinese telecom and camera brands, and parts from
                <strong className="text-foreground"> covered foreign countries</strong> (China, Russia, Iran, North
                Korea) can sink an award by themselves. One flagged camera or radio module can make an otherwise
                great product unsellable to the government.
              </p>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-500 mb-1">Your next step</div>
              <p className="text-muted-foreground leading-relaxed">
                Add every part with its supplier, country of origin, and unit cost. Ask suppliers where parts are
                <em> actually made</em> — &quot;shipped from&quot; is not origin. Then work the red flags: each one
                gets a substitution plan below.
              </p>
            </div>
          </div>
        </Card>

        {err && <Card tone="red" className="p-4 mb-5"><p className="text-sm pl-1.5">{err}</p></Card>}

        {/* Posture tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatTile label="BOM lines" tone="slate"
            value={<>{parts.length}<span className="text-base font-normal text-muted-foreground"> of {lineLimit ?? '—'}</span></>}
            sub="lines used on your plan" />
          <StatTile label="Domestic content (by cost)" tone={domesticTone}
            value={summary?.domesticPct == null ? undefined : `${summary.domesticPct}%`}
            empty={summary?.domesticPct == null ? 'Needs origin + unit cost on at least one line' : undefined}
            sub="US-origin cost ÷ total cost · estimate, not a BAA/TAA determination" />
          <StatTile label="Flagged for review" tone={summary && summary.flaggedCount > 0 ? 'red' : 'emerald'}
            value={summary?.flaggedCount ?? 0}
            sub="possible banned-source matches — verify against the official list" />
          <StatTile label="Unscored lines" tone={unscoredLines > 0 ? 'amber' : 'emerald'}
            value={unscoredLines}
            sub="missing origin or unit cost — excluded from the % until filled in" />
        </div>

        {atLimit && (
          <Card tone="amber" className="p-4 mb-5">
            <p className="text-sm pl-1.5">
              All <span className="tabular-nums font-semibold">{lineLimit}</span> BOM lines on your plan are in
              use. Your existing lines are untouched — <a href="/app/launchpad/billing" className="underline underline-offset-2 text-emerald-600 dark:text-emerald-400 font-medium">upgrade</a> to add more.
            </p>
          </Card>
        )}

        {/* Add / edit form */}
        {showForm && (
          <Card className="p-5 mb-6">
            <form onSubmit={submit} className="pl-1.5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{editingId ? 'Edit part' : 'Add a part'}</h2>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="text-muted-foreground hover:text-foreground" aria-label="Close form">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Part name *</label>
                  <input required className={field} placeholder="e.g. Flight controller board" value={form.description}
                    onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Part / model number</label>
                  <input className={field} value={form.partNumber}
                    onChange={(e) => setForm((x) => ({ ...x, partNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Assembly (what it goes into)</label>
                  <input className={field} placeholder="e.g. Sensor tower" value={form.assembly}
                    onChange={(e) => setForm((x) => ({ ...x, assembly: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Manufacturer</label>
                  <input className={field} placeholder="who makes it" value={form.manufacturer}
                    onChange={(e) => setForm((x) => ({ ...x, manufacturer: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Supplier</label>
                  <input className={field} placeholder="who you buy it from" value={form.supplier}
                    onChange={(e) => setForm((x) => ({ ...x, supplier: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Country of origin (where it&apos;s made)</label>
                  <input className={field} placeholder="e.g. USA, Taiwan, Germany" value={form.countryOfOrigin}
                    onChange={(e) => setForm((x) => ({ ...x, countryOfOrigin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Quantity</label>
                  <input className={field} type="number" min="0" step="any" value={form.quantity}
                    onChange={(e) => setForm((x) => ({ ...x, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Unit cost (USD)</label>
                  <input className={field} type="number" min="0" step="0.01" value={form.unitCost}
                    onChange={(e) => setForm((x) => ({ ...x, unitCost: e.target.value }))} />
                </div>
                <div className="flex items-end pb-1">
                  <LiquidCheckbox
                    checked={form.prototypeOnly}
                    onChange={(v) => setForm((x) => ({ ...x, prototypeOnly: v }))}
                    label={<span className="text-sm">Prototype only (not in the production build)</span>}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Notes / substitution plan</label>
                <textarea className={field} rows={2} maxLength={1000}
                  placeholder="e.g. Sourcing a US-made alternative from vendor X; sample ordered"
                  value={form.substitutionNote}
                  onChange={(e) => setForm((x) => ({ ...x, substitutionNote: e.target.value }))} />
              </div>
              <GlassButton type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to BOM'}
              </GlassButton>
            </form>
          </Card>
        )}

        {/* Parts table */}
        {parts.length === 0 ? (
          <Card className="p-10 text-center">
            <Factory className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No BOM lines yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Add your first part with &quot;Add part&quot; above. Launchpad never invents supply-chain data —
              the screening, the domestic-content estimate, and the flags all come from what you record here.
            </p>
          </Card>
        ) : (
          <Card className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  {['Part', 'Supplier / Mfr', 'Origin', 'Qty', 'Unit cost', 'Ext. cost', 'Screening', ''].map((h, i) => (
                    <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-t border-border/40 align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{p.description ?? '—'}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.part_number && <code className="mr-1.5">{p.part_number}</code>}
                        {p.assembly && <span>in {p.assembly}</span>}
                        {p.prototype_only && <span className="ml-1.5 italic">prototype only</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div>{p.supplier ?? '—'}</div>
                      {p.manufacturer && <div className="text-[11px] text-muted-foreground">mfr: {p.manufacturer}</div>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.country_of_origin ?? <span className="text-amber-500 text-xs">not recorded</span>}</td>
                    <td className="px-3 py-2 tabular-nums">{p.quantity ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">{money(p.unit_cost)}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">{money(extCost(p))}</td>
                    <td className="px-3 py-2">
                      {screeningFlags(p).length === 0 ? (
                        <StateBadge tone="emerald">no match</StateBadge>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {screeningFlags(p).map((f, i) => (
                            <span key={i} title={f.message}>
                              <StateBadge tone={FLAG_TONE[f.code] ?? 'amber'}>
                                {f.matched || f.code.replace(/_/g, ' ')}
                              </StateBadge>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} aria-label="Edit part"
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(p)} aria-label="Remove part"
                        className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-muted">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Substitution workbench — every red flag gets a plan */}
        {flagged.length > 0 && (
          <>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
              <Flag className="h-3.5 w-3.5 text-red-500" /> Flagged parts — find a substitute
            </h2>
            <div className="space-y-3 mb-6">
              {flagged.map((p) => (
                <Card key={p.id} tone="red" className="p-4">
                  <div className="pl-1.5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{p.description ?? p.part_number ?? 'Part'}</span>
                      {p.supplier && <span className="text-xs text-muted-foreground">from {p.supplier}</span>}
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {redFlags(p).map((f, i) => (
                        <div key={i} className="text-xs leading-relaxed">
                          <StateBadge tone="red">{f.matched || f.code.replace(/_/g, ' ')}</StateBadge>
                          <span className="ml-2 text-muted-foreground">matched rule: <span className="text-foreground">{f.rule}</span></span>
                          <p className="text-muted-foreground mt-1">{f.message}</p>
                        </div>
                      ))}
                    </div>
                    <label className="text-xs font-medium block mb-1">Your substitution plan (customer-entered)</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <textarea className={field} rows={2} maxLength={1000}
                        placeholder="e.g. Replace with US-made module from vendor X — quote requested, sample due next month"
                        value={noteDrafts[p.id] ?? noteOf(p)}
                        onChange={(e) => setNoteDrafts((x) => ({ ...x, [p.id]: e.target.value }))} />
                      <div className="flex flex-col gap-2 shrink-0">
                        <GlassButton onClick={() => saveNote(p)} disabled={noteSaving === p.id}>
                          {noteSaving === p.id ? 'Saving…' : 'Save plan'}
                        </GlassButton>
                        <GlassButton disabled>
                          <Sparkles className="h-3.5 w-3.5 text-current mr-1.5" /> AI substitute research — backend pending
                        </GlassButton>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      The AI research hook is not wired yet — when the managed AI backend lands, it will draft
                      candidate substitutes for your review. It will never mark a part cleared; that decision is yours.
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground mt-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Method: domestic content = US-origin extended cost ÷ total extended cost (quantity × unit cost;
            a missing quantity counts as 1). Lines missing unit cost or origin are excluded from the
            calculation and shown as unscored. Screening compares your entries against public reference lists
            (Section 889 / FAR 52.204-25, DoD §1260H, FCC Covered List, covered foreign countries) — always
            verify a flag against the official list before acting on it. Nothing on this page certifies
            domestic content or eligibility.
          </span>
        </div>
      </FeatureGate>
    </div>
  );
}
