"use client";

/**
 * Psathyrella GCS — Mission Planner.
 * ==================================
 * A glass MODAL overlay that builds a typed `MissionPlan` (see
 * `lib/psathyrella/contract.ts`) and hands it back via `onUpload`. The plan is
 * an ordered list of tasks (transit / loiter / survey / track / solar_reposition
 * / station_keep), a comms-loss policy, a validity window, rules-of-engagement,
 * and an optional geofence note. "SIGN & UPLOAD" stamps id/createdMs and a
 * placeholder signature hash, then dispatches the plan.
 *
 * US-customary units in operator-facing readouts (US Navy product): positions in
 * decimal degrees, radii in feet, loiter in minutes. Internally the contract
 * stores radiusM (meters) and loiterS (seconds), so we convert at the edges.
 *
 * Self-contained dialog (no external dialog dep), matching the BottomSheet glass
 * aesthetic: `.psa-glass-strong` shell, `.psa-glass-btn` buttons, cyan accents.
 */

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Route,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  MapPin,
  Timer,
  Radar,
  Crosshair,
  Sun,
  Anchor,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type MissionPlan,
  type MissionTask,
  type MissionTaskKind,
} from "@/lib/psathyrella/contract";

// ── Unit helpers (contract is metric; operator UI is US-customary) ───────────
const M_PER_FT = 0.3048;
const ftToM = (ft: number) => ft * M_PER_FT;
const mToFt = (m: number) => m / M_PER_FT;
const minToS = (min: number) => Math.round(min * 60);
const sToMin = (s: number) => s / 60;

// ── Task-kind metadata (label, icon, which params it uses) ───────────────────
type TaskKindMeta = {
  kind: MissionTaskKind;
  label: string;
  icon: React.ReactNode;
  /** Which editable fields this kind exposes. */
  fields: { latlon?: boolean; radius?: boolean; loiter?: boolean };
  hint: string;
};

const TASK_KINDS: TaskKindMeta[] = [
  { kind: "transit", label: "Transit", icon: <Route className="h-3.5 w-3.5" />, fields: { latlon: true }, hint: "Run to a position" },
  { kind: "loiter", label: "Loiter", icon: <Timer className="h-3.5 w-3.5" />, fields: { latlon: true, radius: true, loiter: true }, hint: "Hold an area for a duration" },
  { kind: "survey", label: "Survey", icon: <Radar className="h-3.5 w-3.5" />, fields: { latlon: true, radius: true }, hint: "Sensor sweep of an area" },
  { kind: "track", label: "Track", icon: <Crosshair className="h-3.5 w-3.5" />, fields: { latlon: true, radius: true }, hint: "Shadow a contact" },
  { kind: "solar_reposition", label: "Solar Reposition", icon: <Sun className="h-3.5 w-3.5" />, fields: {}, hint: "Rotate for solar intake" },
  { kind: "station_keep", label: "Station Keep", icon: <Anchor className="h-3.5 w-3.5" />, fields: { latlon: true, radius: true }, hint: "Hold station at a point" },
];

const KIND_META = (k: MissionTaskKind): TaskKindMeta =>
  TASK_KINDS.find((t) => t.kind === k) ?? TASK_KINDS[0];

// ── Comms-loss policy options ────────────────────────────────────────────────
type CommsLossPolicy = MissionPlan["commsLossPolicy"];
const POLICIES: { value: CommsLossPolicy; label: string; hint: string }[] = [
  { value: "rtl", label: "RTL", hint: "Return to launch" },
  { value: "hold", label: "Hold", hint: "Hold position" },
  { value: "continue", label: "Continue", hint: "Continue mission" },
];

// ── Valid-until duration presets (hours) → validUntilMs at sign time ─────────
const VALID_HOURS: { label: string; hours: number | null }[] = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "12h", hours: 12 },
  { label: "24h", hours: 24 },
  { label: "72h", hours: 72 },
  { label: "No limit", hours: null },
];

// ── Local editable task row (numbers held as the displayed US-units value) ───
type DraftTask = {
  id: string;
  kind: MissionTaskKind;
  lat?: number;
  lon?: number;
  radiusFt?: number; // displayed in feet
  loiterMin?: number; // displayed in minutes
  note?: string;
};

let _seq = 0;
const newTaskId = () => `mt-${Date.now().toString(36)}-${(_seq++).toString(36)}`;
const newPlanId = () => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Placeholder operator signature — a deterministic-ish hash of the plan body.
 * (Real cryptographic sign-off is Cursor's backend lane; this stamps intent.) */
function placeholderSignature(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `OPSIG-${hex.toUpperCase()}`;
}

function draftToTask(d: DraftTask): MissionTask {
  const meta = KIND_META(d.kind);
  const t: MissionTask = { id: d.id, kind: d.kind };
  if (meta.fields.latlon) {
    if (Number.isFinite(d.lat)) t.lat = d.lat;
    if (Number.isFinite(d.lon)) t.lon = d.lon;
  }
  if (meta.fields.radius && Number.isFinite(d.radiusFt)) t.radiusM = Math.round(ftToM(d.radiusFt as number));
  if (meta.fields.loiter && Number.isFinite(d.loiterMin)) t.loiterS = minToS(d.loiterMin as number);
  if (d.note && d.note.trim()) t.note = d.note.trim();
  return t;
}

function taskToDraft(t: MissionTask): DraftTask {
  return {
    id: t.id || newTaskId(),
    kind: t.kind,
    lat: t.lat,
    lon: t.lon,
    radiusFt: t.radiusM != null ? Math.round(mToFt(t.radiusM)) : undefined,
    loiterMin: t.loiterS != null ? Math.round(sToMin(t.loiterS)) : undefined,
    note: t.note,
  };
}

// ── Small inline field primitives (glass-styled) ─────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-cyan-400/60">{children}</span>;
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={cn(
        "psa-glass-btn w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-white",
        "placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none",
        className
      )}
    />
  );
}

export interface MissionPlannerPanelProps {
  open: boolean;
  onClose: () => void;
  initial?: MissionPlan | null;
  onUpload: (plan: MissionPlan) => void;
}

export function MissionPlannerPanel({ open, onClose, initial, onUpload }: MissionPlannerPanelProps) {
  const [name, setName] = useState("");
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [policy, setPolicy] = useState<CommsLossPolicy>("rtl");
  const [validHours, setValidHours] = useState<number | null>(24);
  const [roe, setRoe] = useState("");
  const [geofenceNote, setGeofenceNote] = useState("");

  // Re-seed from `initial` whenever the modal opens (so re-opens reflect edits).
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setTasks((initial?.tasks ?? []).map(taskToDraft));
    setPolicy(initial?.commsLossPolicy ?? "rtl");
    setRoe(initial?.roe ?? "");
    setGeofenceNote("");
    if (initial?.validUntilMs != null) {
      const hrs = Math.max(1, Math.round((initial.validUntilMs - Date.now()) / 3_600_000));
      setValidHours(hrs);
    } else {
      setValidHours(initial ? null : 24);
    }
  }, [open, initial]);

  // Escape-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const addTask = (kind: MissionTaskKind) =>
    setTasks((prev) => [...prev, { id: newTaskId(), kind }]);

  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const patchTask = (id: string, patch: Partial<DraftTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const moveTask = (idx: number, dir: -1 | 1) =>
    setTasks((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const canUpload = name.trim().length > 0 && tasks.length > 0;

  const buildPlan = useMemo(
    () => (): MissionPlan => {
      const createdMs = Date.now();
      const validUntilMs = validHours != null ? createdMs + validHours * 3_600_000 : null;
      const built: MissionTask[] = tasks.map(draftToTask);
      const base: Omit<MissionPlan, "signature"> = {
        id: initial?.id ?? newPlanId(),
        name: name.trim() || "Untitled Mission",
        tasks: built,
        commsLossPolicy: policy,
        validUntilMs,
        roe: roe.trim() || undefined,
        createdMs,
      };
      const sigSeed = JSON.stringify(base) + (geofenceNote.trim() ? `|gf:${geofenceNote.trim()}` : "");
      return { ...base, signature: placeholderSignature(sigSeed) };
    },
    [name, tasks, policy, validHours, roe, geofenceNote, initial?.id]
  );

  const handleSignUpload = () => {
    if (!canUpload) return;
    onUpload(buildPlan());
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Mission Planner">
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      {/* Modal shell */}
      <div className="psa-glass-strong relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/70 duration-150 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 to-transparent px-4 py-3">
          <div className="flex items-center gap-2 text-cyan-200">
            <Route className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Mission Planner</span>
            <span className="text-[10px] uppercase tracking-wider text-cyan-400/50">
              {initial?.id ? "Edit Plan" : "New Plan"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          {/* Name */}
          <div>
            <FieldLabel>Mission Name</FieldLabel>
            <GlassInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North Reef Patrol"
              className="text-[12px]"
            />
          </div>

          {/* Task list */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">
                Task Order ({tasks.length})
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-600">runs top → bottom</span>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/10 bg-black/20 px-3 py-4 text-center text-[10px] uppercase tracking-wider text-slate-500">
                No tasks yet — add one below
              </div>
            ) : (
              <ol className="space-y-2">
                {tasks.map((t, idx) => {
                  const meta = KIND_META(t.kind);
                  return (
                    <li key={t.id} className="psa-glass rounded-lg border border-white/10 p-2.5">
                      {/* Row header: seq, kind, reorder/remove */}
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-500/15 font-mono text-[10px] font-bold text-cyan-300">
                          {idx + 1}
                        </span>
                        <span className="flex items-center gap-1.5 text-cyan-200">
                          {meta.icon}
                          <span className="text-[11px] font-bold uppercase tracking-wide">{meta.label}</span>
                        </span>
                        <span className="truncate text-[9px] text-slate-500">{meta.hint}</span>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveTask(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Move up"
                            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTask(idx, 1)}
                            disabled={idx === tasks.length - 1}
                            aria-label="Move down"
                            className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTask(t.id)}
                            aria-label="Remove task"
                            className="flex h-7 w-7 items-center justify-center rounded border border-red-500/30 text-red-300/80 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Params */}
                      <div className="grid grid-cols-2 gap-2">
                        {meta.fields.latlon && (
                          <>
                            <div>
                              <FieldLabel>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5" /> Lat (°)
                                </span>
                              </FieldLabel>
                              <GlassInput
                                type="number"
                                step="0.00001"
                                inputMode="decimal"
                                value={t.lat ?? ""}
                                onChange={(e) =>
                                  patchTask(t.id, { lat: e.target.value === "" ? undefined : Number(e.target.value) })
                                }
                                placeholder="32.56289"
                              />
                            </div>
                            <div>
                              <FieldLabel>Lon (°)</FieldLabel>
                              <GlassInput
                                type="number"
                                step="0.00001"
                                inputMode="decimal"
                                value={t.lon ?? ""}
                                onChange={(e) =>
                                  patchTask(t.id, { lon: e.target.value === "" ? undefined : Number(e.target.value) })
                                }
                                placeholder="-117.1357"
                              />
                            </div>
                          </>
                        )}
                        {meta.fields.radius && (
                          <div>
                            <FieldLabel>Radius (ft)</FieldLabel>
                            <GlassInput
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              value={t.radiusFt ?? ""}
                              onChange={(e) =>
                                patchTask(t.id, { radiusFt: e.target.value === "" ? undefined : Number(e.target.value) })
                              }
                              placeholder="300"
                            />
                          </div>
                        )}
                        {meta.fields.loiter && (
                          <div>
                            <FieldLabel>Loiter (min)</FieldLabel>
                            <GlassInput
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              value={t.loiterMin ?? ""}
                              onChange={(e) =>
                                patchTask(t.id, { loiterMin: e.target.value === "" ? undefined : Number(e.target.value) })
                              }
                              placeholder="15"
                            />
                          </div>
                        )}
                        <div className={cn(meta.fields.latlon || meta.fields.radius || meta.fields.loiter ? "col-span-2" : "col-span-2")}>
                          <FieldLabel>Note</FieldLabel>
                          <GlassInput
                            value={t.note ?? ""}
                            onChange={(e) => patchTask(t.id, { note: e.target.value })}
                            placeholder="optional standing order for this leg"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Add-task palette */}
            <div className="mt-2">
              <FieldLabel>Add Task</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {TASK_KINDS.map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    onClick={() => addTask(k.kind)}
                    title={k.hint}
                    className="psa-glass-btn inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-white/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  >
                    <Plus className="h-3 w-3 shrink-0 text-cyan-400/70" />
                    {k.icon}
                    <span className="truncate">{k.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comms-loss policy */}
          <div>
            <FieldLabel>Comms-Loss Policy</FieldLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {POLICIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPolicy(p.value)}
                  title={p.hint}
                  className={cn(
                    "psa-glass-btn flex min-h-9 flex-col items-center justify-center rounded-md border px-2 py-1 text-center",
                    policy === p.value
                      ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100"
                      : "border-white/10 text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  )}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wide">{p.label}</span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Valid-until */}
          <div>
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <Timer className="h-2.5 w-2.5" /> Valid For (from sign time)
              </span>
            </FieldLabel>
            <div className="grid grid-cols-6 gap-1.5">
              {VALID_HOURS.map((v) => (
                <button
                  key={v.label}
                  type="button"
                  onClick={() => setValidHours(v.hours)}
                  className={cn(
                    "psa-glass-btn min-h-9 rounded-md border px-1 py-1 text-[10px] font-semibold uppercase tracking-wide",
                    validHours === v.hours
                      ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100"
                      : "border-white/10 text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-500/10"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* ROE */}
          <div>
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" /> Rules of Engagement / Standing Orders
              </span>
            </FieldLabel>
            <textarea
              value={roe}
              onChange={(e) => setRoe(e.target.value)}
              rows={2}
              placeholder="e.g. Passive sensing only. No contact within 500 ft of civilian vessels. RTL on battery < 20%."
              className="psa-glass-btn w-full resize-none rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>

          {/* Geofence note (drawing on the map is a later step) */}
          <div>
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <PenLine className="h-2.5 w-2.5" /> Geofence (note — map-draw arrives later)
              </span>
            </FieldLabel>
            <GlassInput
              value={geofenceNote}
              onChange={(e) => setGeofenceNote(e.target.value)}
              placeholder="optional: describe the operating box / leave empty"
              className="text-[11px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-cyan-500/15 bg-black/30 px-4 py-3">
          <div className="min-w-0 text-[9px] uppercase tracking-wider text-slate-500">
            {canUpload ? (
              <span>
                {tasks.length} task{tasks.length === 1 ? "" : "s"} · {policy.toUpperCase()} ·{" "}
                {validHours != null ? `${validHours}h` : "no limit"}
              </span>
            ) : (
              <span className="text-amber-400/70">Name + at least one task required</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="psa-glass-btn inline-flex min-h-9 items-center justify-center rounded-md border border-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSignUpload}
              disabled={!canUpload}
              className={cn(
                "psa-glass-btn inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide",
                canUpload
                  ? "border-green-500/60 bg-green-500/20 text-green-100 hover:bg-green-500/30"
                  : "cursor-not-allowed border-white/10 text-slate-500 opacity-50"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Sign &amp; Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MissionPlannerPanel;
