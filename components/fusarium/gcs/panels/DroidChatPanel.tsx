"use client";

/**
 * DroidChatPanel — the operator's conversation with ONE named droid, instrumented like a radio.
 *
 * Morgan's framing: this is a droid, and the AI inside it should talk to the operator. So the panel
 * is a real chat — but on a defence-adjacent console a transcript is EVIDENCE, which drives every
 * rule below:
 *
 *  1. DROID BUBBLES CONTAIN ONLY WORDS THE DROID PRODUCED. Failures, unreadable replies and link
 *     changes render as centred system lines that look nothing like the droid.
 *  2. THE COMMS METER NEVER FLATTERS THE LINK. Every figure is measured (server-side round trip) or
 *     an em-dash. Uptime is null — not 100% — until there is a sample to compute it from.
 *  3. MAS OVERSIGHT IS STATED, NOT ASSUMED. Morgan's guarantee is that the MAS sees every exchange
 *     and post-processes it as an overseer. Green appears ONLY when the relay actually delivered;
 *     amber when no MAS log endpoint is configured; red when the relay is failing; slate before the
 *     first exchange, because "no data yet" is not "not configured".
 *  4. OFFLINE DISABLES THE INPUT AND SAYS WHY. Typing into a dead link and believing it landed is the
 *     failure this panel exists to prevent.
 *
 * The meter strip deliberately mirrors the Comms · Bridge readouts (StatLED + font-mono figures +
 * 9px cyan labels) so an operator reads it with the same eyes as the rest of the bridge.
 */

import { useCallback, useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import { AlertTriangle, Bot, Eraser, Loader2, Radio, Send, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatLED, type LedColor } from "@/components/fusarium/gcs/ui";
import { useDroidChat, type DroidLinkStats } from "@/lib/fusarium/gcs/useDroidChat";

/** The single rendering of "no measurement exists" — never a stand-in number. */
function Dash(): JSX.Element {
  return <span className="italic text-slate-500/80">&mdash;</span>;
}

function ms(v: number | null): ReactNode {
  return v === null ? <Dash /> : `${v}ms`;
}

/** One meter cell — 9px cyan label over a mono figure, matching the Comms-Bridge readouts. */
function Meter({ label, children, title, className }: { label: string; children: ReactNode; title?: string; className?: string }): JSX.Element {
  return (
    <div className={cn("flex min-w-0 flex-col px-1.5", className)} title={title}>
      <span className="truncate text-[9px] uppercase tracking-wider text-cyan-400/60">{label}</span>
      <span className="truncate font-mono text-[10px] leading-tight tabular-nums text-slate-200">{children}</span>
    </div>
  );
}

interface Oversight {
  led: LedColor;
  text: string;
  title: string;
}

/**
 * MAS oversight state, kept strictly honest. `relayOk` alone cannot distinguish "not configured" from
 * "no exchange yet" — both read null — so the exchange count is the discriminator. Claiming
 * "not configured" before anything was ever sent would be a finding we have not made.
 */
function oversightOf(stats: DroidLinkStats): Oversight {
  if (stats.sent === 0) {
    return { led: "slate", text: "MAS oversight unknown", title: "No exchange yet — the MAS relay has not been exercised, so nothing is known about it." };
  }
  if (stats.relayOk === true) {
    return { led: "green", text: "MAS recording", title: "The last exchange was accepted by the MAS oversight endpoint." };
  }
  if (stats.relayOk === null) {
    return {
      led: "amber",
      text: "MAS relay not configured",
      title: "No MAS droid-log endpoint is configured, so this conversation is NOT being recorded or post-processed by the MAS.",
    };
  }
  return { led: "red", text: "MAS relay failing", title: "The MAS oversight relay was attempted and did not deliver — see the system line on the transcript for the reason." };
}

export default function DroidChatPanel({
  droidId,
  droidName,
  className,
  onClose,
}: {
  droidId: string;
  droidName?: string;
  className?: string;
  onClose?: () => void;
}): JSX.Element {
  const { messages, stats, send, pending, lastError, clear } = useDroidChat(droidId);
  const [draft, setDraft] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  const name = droidName ?? droidId;
  const oversight = oversightOf(stats);

  // Keep the newest line visible. A transcript that silently scrolls away hides the droid's answer.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text || !stats.online || pending) return;
      setDraft("");
      const ok = await send(text);
      // Restore the draft on failure so the operator can retry without retyping. Nothing is hidden by
      // this — the failure is already an explicit system line on the transcript.
      if (!ok) setDraft(text);
    },
    [draft, pending, send, stats.online],
  );

  return (
    <div className={cn("psa-glass flex h-full min-h-0 flex-col overflow-hidden rounded-xl", className)}>
      {/* ------------------------------------------------------------------------- header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-cyan-300">
          <Bot className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-[11px] font-bold uppercase tracking-wider text-white">Droid Chat</span>
          <span className="truncate font-mono text-[10px] text-cyan-400/70">{name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={clear}
            title="Clear the transcript (link statistics are kept — they are instrument readings, not chat)"
            aria-label="Clear transcript"
            className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-slate-400 hover:border-cyan-500/40 hover:bg-cyan-500/10"
          >
            <Eraser className="h-3 w-3" />
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close droid chat"
              className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-slate-400 hover:border-cyan-500/40 hover:bg-cyan-500/10"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* -------------------------------------------------------------------- comms meter */}
      <div className="shrink-0 border-b border-cyan-500/10 bg-white/[0.02] px-2 py-1.5">
        <div className="flex flex-wrap items-stretch gap-y-1 divide-x divide-white/5">
          <div className="flex items-center gap-1.5 px-1.5" title={stats.online ? `Droid agent reachable · ${name}` : (lastError ?? "The droid agent has not been confirmed reachable.")}>
            <StatLED color={stats.online ? "green" : stats.sent > 0 ? "red" : "slate"} pulse={stats.online} />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-cyan-400/60">Link</span>
              <span className={cn("font-mono text-[10px] font-bold leading-tight", stats.online ? "text-green-300" : "text-red-300")}>
                {stats.online ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <Meter label="Last" title="Server-measured round trip of the most recent exchange">{ms(stats.lastLatencyMs)}</Meter>
          <Meter label="Avg" title="Mean round trip across the rolling 20-exchange window">{ms(stats.avgLatencyMs)}</Meter>
          <Meter label="Min / Max" title="Fastest and slowest round trip in the rolling window">
            {stats.minLatencyMs === null || stats.maxLatencyMs === null ? <Dash /> : `${stats.minLatencyMs} / ${stats.maxLatencyMs}`}
          </Meter>
          <Meter label="Sent / Fail" title="Exchanges attempted, and how many returned no droid text">
            <span className="text-slate-200">{stats.sent}</span>
            <span className="text-slate-500"> / </span>
            <span className={stats.failed > 0 ? "text-red-300" : "text-slate-200"}>{stats.failed}</span>
          </Meter>
          <Meter
            label="Uptime"
            title="Share of the rolling window that returned real droid text. Undefined until the first exchange — a perfect score with no samples would be a fabricated claim."
          >
            {stats.uptimePct === null ? (
              <Dash />
            ) : (
              <span className={stats.uptimePct >= 99 ? "text-green-300" : stats.uptimePct >= 80 ? "text-amber-300" : "text-red-300"}>{stats.uptimePct.toFixed(0)}%</span>
            )}
          </Meter>
          <div className="flex items-center gap-1.5 px-1.5" title={oversight.title}>
            <StatLED color={oversight.led} pulse={oversight.led === "red"} />
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-cyan-400/60">
                <ShieldCheck className="h-2.5 w-2.5" />
                Oversight
              </span>
              <span
                className={cn(
                  "truncate font-mono text-[10px] leading-tight",
                  oversight.led === "green" && "text-green-300",
                  oversight.led === "amber" && "text-amber-300",
                  oversight.led === "red" && "text-red-300",
                  oversight.led === "slate" && "text-slate-400",
                )}
              >
                {oversight.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- transcript */}
      <div
        ref={transcriptRef}
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto bg-black/20 px-2 py-2"
        role="log"
        aria-live="polite"
        aria-label={`Transcript with droid ${name}`}
      >
        {messages.length === 0 ? (
          <div className="m-auto max-w-[85%] text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">{name}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">
              {stats.online
                ? "Link confirmed — ready for your first message. Nothing has been said to this droid yet."
                : "No exchange yet. The link has not been confirmed, so nothing can be sent."}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.atMs}-${i}`}
              className={cn(
                "rounded px-2 py-1 text-[11px] leading-snug",
                m.role === "operator" && "max-w-[88%] self-end border border-cyan-500/30 bg-cyan-500/10 text-cyan-50",
                m.role === "droid" && "max-w-[88%] self-start border border-green-500/25 bg-green-500/5 text-green-50",
                // The honesty channel: send failures, unreadable replies, link and oversight changes.
                // Centred, italic and amber so it can never be misread as something the droid said.
                m.role === "system" && "max-w-[94%] self-center border border-amber-500/30 bg-amber-500/[0.07] text-center italic text-amber-200/90",
              )}
            >
              <div className={cn("mb-0.5 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider opacity-70", m.role === "system" && "justify-center")}>
                <span>{m.role === "operator" ? "Operator" : m.role === "droid" ? name : "System"}</span>
                <span className="font-mono opacity-70">{new Date(m.atMs).toLocaleTimeString()}</span>
                {/* Per-reply round trip, right where the reply is — the operator sees which answers
                    were slow without reading the aggregate meter. */}
                {m.role === "droid" && typeof m.latencyMs === "number" ? (
                  <span className="font-mono text-green-300/80" title="Server-measured round trip for this reply">
                    {m.latencyMs}ms
                  </span>
                ) : null}
              </div>
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
            </div>
          ))
        )}
        {pending ? (
          <div className="flex items-center gap-1 self-start px-1 text-[10px] italic text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            waiting for {name}…
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------------- composer + state */}
      <div className="shrink-0 border-t border-cyan-500/10 px-2 py-2">
        {!stats.online ? (
          <div className="mb-1.5 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[10px] text-red-200">
            <div className="mb-0.5 flex items-center gap-1 font-bold uppercase tracking-wide">
              <AlertTriangle className="h-3 w-3" />
              {name} unreachable — chat disabled
            </div>
            {/* The REASON comes from the health probe, never a hardcoded story about the rig. */}
            <p className="break-words font-mono text-[9px] leading-snug text-red-300/90">
              {lastError ?? "The health probe has not confirmed a reachable droid agent. No reason was reported."}
            </p>
            <p className="mt-0.5 text-red-200/70">Nothing typed here would reach the droid, so the input stays disabled. It re-enables by itself on the next health poll.</p>
          </div>
        ) : null}

        {oversight.led === "amber" || oversight.led === "red" ? (
          <div
            className={cn(
              "mb-1.5 flex items-start gap-1.5 rounded border px-2 py-1 text-[9px] leading-snug",
              oversight.led === "red" ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-amber-500/40 bg-amber-500/10 text-amber-200",
            )}
          >
            <ShieldCheck className="mt-px h-3 w-3 shrink-0" />
            <span>
              {oversight.led === "red"
                ? "MAS oversight relay is FAILING — this conversation is not reaching the MAS overseer."
                : "MAS oversight relay is not configured — this conversation is not being recorded or post-processed by the MAS."}
            </span>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!stats.online || pending}
            placeholder={stats.online ? `Message ${name}…` : "Droid unreachable — input disabled"}
            aria-label={`Message to droid ${name}`}
            className={cn(
              "min-h-9 min-w-0 flex-1 rounded-md border bg-black/40 px-2 py-1 text-[12px] text-slate-100 placeholder:text-slate-600",
              "border-cyan-500/20 focus:border-cyan-500/50 focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          />
          <button
            type="submit"
            disabled={!stats.online || pending || !draft.trim()}
            title={stats.online ? `Send to ${name}` : "No reachable chat endpoint for this droid"}
            className={cn(
              "psa-glass-btn inline-flex min-h-9 items-center gap-1 rounded-md border border-cyan-500/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200",
              "hover:border-cyan-500/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Send
          </button>
        </form>

        <div className="mt-1 flex items-center gap-1.5 text-[8px] uppercase tracking-wider text-slate-600">
          <Radio className="h-2.5 w-2.5" />
          <span>Droid bubbles carry only words the droid produced · &ldquo;—&rdquo; means not measured</span>
        </div>
      </div>
    </div>
  );
}
