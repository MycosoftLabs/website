"use client";

/**
 * Psathyrella GCS — Command Ledger panel.
 *
 * Pure presentational DOM panel: renders the command audit ledger fed by a prop.
 * No telemetry-isolation concerns — it lives outside the memoized map subtree and
 * is driven entirely by `ledger: CommandRecord[]` (newest-first, capped upstream).
 *
 * Each row shows the command lifecycle state chip, the label + domain, the bearer
 * used to dispatch it, the monotonic seq, and the round-trip latency (ms). US-Navy
 * product → readouts stay in US-customary units where applicable (latency is ms).
 */

import { ListOrdered } from "lucide-react";
import { RADIO_LABEL, type CommandRecord, type CommandState } from "@/lib/psathyrella/contract";
import { Panel } from "@/components/psathyrella/ui";

/** state → chip palette (border / bg / text), matching the glass tactical aesthetic. */
const STATE_CHIP: Record<CommandState, { label: string; cls: string }> = {
  queued: { label: "QUEUED", cls: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
  sent: { label: "SENT", cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200" },
  acked: { label: "ACKED", cls: "border-blue-500/40 bg-blue-500/10 text-blue-200" },
  applied: { label: "APPLIED", cls: "border-green-500/40 bg-green-500/10 text-green-200" },
  expired: { label: "EXPIRED", cls: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
  failed: { label: "FAILED", cls: "border-red-500/50 bg-red-500/15 text-red-200" },
};

/** Human label for the bearer a command was dispatched over. */
function bearerLabel(bearer: CommandRecord["bearer"]): string {
  if (bearer == null) return "—";
  if (bearer === "satellite") return "SAT";
  if (bearer === "acoustic") return "ACOUSTIC";
  return RADIO_LABEL[bearer];
}

function StateChip({ state }: { state: CommandState }) {
  const { label, cls } = STATE_CHIP[state];
  return (
    <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

export function CommandLedgerPanel({ ledger }: { ledger: CommandRecord[] }) {
  const queued = ledger.filter((r) => r.state === "queued").length;
  const applied = ledger.filter((r) => r.state === "applied").length;
  const failed = ledger.filter((r) => r.state === "failed").length;

  return (
    <Panel
      title="Command Ledger"
      icon={<ListOrdered className="h-4 w-4" />}
      className="h-full"
      bodyClassName="px-0 py-0"
      right={
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider">
          <span className="text-amber-300/80">{queued} q</span>
          <span className="text-green-300/80">{applied} ok</span>
          <span className={failed > 0 ? "text-red-300" : "text-slate-500"}>{failed} fail</span>
        </div>
      }
    >
      <div className="h-full overflow-y-auto px-2 py-2">
        {ledger.length === 0 ? (
          <div className="flex h-full min-h-[80px] items-center justify-center px-3 text-center text-[10px] uppercase tracking-wider text-slate-500">
            No commands dispatched
          </div>
        ) : (
          <ul className="space-y-1">
            {ledger.map((rec) => (
              <li key={rec.id} className="rounded border border-white/5 bg-white/[0.03] px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <StateChip state={rec.state} />
                    <span className="truncate text-[11px] font-medium text-slate-100">{rec.label}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[9px] text-slate-500">#{rec.seq}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500">
                  <span className="truncate">
                    <span className="text-cyan-400/70">{rec.domain}</span>
                    <span className="mx-1 text-slate-700">·</span>
                    <span className="text-slate-400">{bearerLabel(rec.bearer)}</span>
                  </span>
                  <span className="shrink-0 text-slate-400">
                    {rec.latencyMs != null ? `${Math.round(rec.latencyMs)} ms` : "—"}
                  </span>
                </div>
                {rec.detail ? <div className="mt-0.5 truncate text-[9px] text-slate-600">{rec.detail}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

export default CommandLedgerPanel;
