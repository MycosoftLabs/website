"use client";

/**
 * useDroidChat — the operator's conversation with ONE named droid, plus the link instrumentation the
 * console meters and the MAS-oversight state the console must be able to show honestly.
 *
 * THE ONE RULE: this hook never puts words in a droid's mouth. A "droid" message appears only when
 * /api/psathyrella/droid-chat returned text the agent actually produced. Every other outcome — a
 * failed send, an unreadable reply shape, oversight not recording — is a SYSTEM message, visibly not
 * the droid.
 *
 * WHY A FAILED SEND IS LOUD: an operator who believes a message reached the droid acts on that belief
 * (walks away from the bench, logs it done, tells a customer the buoy acknowledged it). So a failure
 * never rolls back the operator's own line and never appends an optimistic reply — the operator's
 * line stays, followed by an explicit system line saying the send failed and why.
 *
 * That line says "no reply from the droid", NOT "the droid did not receive this message". Delivery is
 * frequently unknown on a failure and sometimes provably happened: an upstream that answers HTTP 500
 * read the message first, and the route's one re-send on a fast transport death can deliver the same
 * message twice (measured: a stand-in agent that consumed the body and then dropped the socket
 * received it twice). The route's own `detail` — "Message NOT sent." vs "delivery unconfirmed" vs
 * "answered HTTP 500" — carries the precise truth; this line must not overwrite it with a certainty
 * nobody has.
 *
 * WHY MAS OVERSIGHT IS TRACKED HERE: Morgan's requirement is that every droid exchange is relayed to
 * the MAS for monitoring and post-processing. That is a guarantee, so the moment it stops holding the
 * operator has to see it. `stats.relayOk` carries the last exchange's oversight state (true recorded /
 * false failing / null not configured or not yet known) and any transition also lands on the
 * transcript as a system line with the reason.
 *
 * Never throws into React: every async path is wrapped, writes are guarded by a mounted flag, and
 * each event performs exactly ONE state update so a render can never observe a half-applied exchange.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface DroidMessage {
  role: "operator" | "droid" | "system";
  text: string;
  atMs: number;
  /** Server-measured round trip for a droid reply. Null/absent for operator + system lines. */
  latencyMs?: number | null;
}

export interface DroidLinkStats {
  lastLatencyMs: number | null;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  sent: number;
  failed: number;
  /** Share of the rolling window that came back with real droid text, 0..100. Null until one exchange. */
  uptimePct: number | null;
  lastOkMs: number | null;
  lastErrorMs: number | null;
  online: boolean;
  /** true = MAS recorded the last exchange · false = relay failing · null = unconfigured / unknown. */
  relayOk: boolean | null;
}

export interface DroidChatApi {
  messages: DroidMessage[];
  stats: DroidLinkStats;
  send: (text: string) => Promise<boolean>;
  pending: boolean;
  lastError: string | null;
  clear: () => void;
}

/** Per-droid chat + MAS oversight relay. See app/api/psathyrella/droid-chat/route.ts. */
const CHAT_ENDPOINT = "/api/psathyrella/droid-chat";
/** Existing owner-gated probe of the OpenClaw bridge — reused rather than duplicated. */
const HEALTH_ENDPOINT = "/api/psathyrella/openclaw/status";
const DEFAULT_HEALTH_POLL_MS = 15000;
/** Rolling window for avg/min/max/uptime. Long enough to show a trend, short enough to react. */
const WINDOW_SIZE = 20;
/** Mirrors the server cap so an over-long message is refused locally instead of round-tripping. */
const MAX_MESSAGE_CHARS = 4000;

interface WindowEntry {
  /** True only when the exchange yielded real droid text. */
  ok: boolean;
  /** Server-measured latency; null when the exchange never produced a measurement. */
  latencyMs: number | null;
}

interface ChatState {
  messages: DroidMessage[];
  window: WindowEntry[];
  sent: number;
  failed: number;
  lastOkMs: number | null;
  lastErrorMs: number | null;
  relayOk: boolean | null;
  online: boolean;
  pending: boolean;
  lastError: string | null;
}

const INITIAL: ChatState = {
  messages: [],
  window: [],
  sent: 0,
  failed: 0,
  lastOkMs: null,
  lastErrorMs: null,
  relayOk: null,
  online: false,
  pending: false,
  lastError: null,
};

function pushWindow(prev: WindowEntry[], entry: WindowEntry): WindowEntry[] {
  const next = [...prev, entry];
  return next.length > WINDOW_SIZE ? next.slice(next.length - WINDOW_SIZE) : next;
}

function sys(text: string): DroidMessage {
  return { role: "system", text, atMs: Date.now() };
}

/** Opaque per-droid conversation id. Must satisfy the route's [A-Za-z0-9._:-] validation. */
function makeSessionId(droidId: string): string {
  const safe = droidId.replace(/[^A-Za-z0-9._:-]/g, "-");
  const c: Crypto | undefined = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  const rand = c && typeof c.randomUUID === "function" ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `gcs-${safe}-${rand}`;
}

function errorDetail(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    const rec = body as Record<string, unknown>;
    const detail = typeof rec.detail === "string" ? rec.detail : null;
    const error = typeof rec.error === "string" ? rec.error : null;
    if (detail) return detail;
    if (error) return error;
  }
  return `HTTP ${status}`;
}

/** Compact preview of an unrecognised payload — proof SOMETHING came back, without calling it speech. */
function rawPreview(raw: unknown): string {
  try {
    const s = typeof raw === "string" ? raw : JSON.stringify(raw);
    if (!s) return "(empty body)";
    return s.length > 300 ? `${s.slice(0, 300)}…` : s;
  } catch {
    return "(unserialisable body)";
  }
}

interface RelayRead {
  state: boolean | null;
  error: string | null;
}

/** Read the route's relay outcome into the tri-state the console renders. */
function readRelay(rec: Record<string, unknown> | null): RelayRead {
  const relay = rec && typeof rec.relay === "object" && rec.relay !== null ? (rec.relay as Record<string, unknown>) : null;
  if (!relay) return { state: null, error: "The chat route reported no MAS oversight outcome." };
  const error = typeof relay.error === "string" ? relay.error : null;
  // attempted:false means no MAS log endpoint is configured — unknown-not-recording, not "failing".
  if (relay.attempted !== true) return { state: null, error };
  return { state: relay.delivered === true, error };
}

/** The system line for a change in oversight state. Null when nothing needs saying. */
function relayTransitionLine(prev: boolean | null, next: boolean | null, error: string | null): string | null {
  if (prev === next) return null;
  if (next === true) return "MAS oversight recording — this exchange was relayed to the MAS.";
  if (next === null) {
    return `MAS oversight is NOT recording this conversation — ${error ?? "no MAS droid-log endpoint is configured."}`;
  }
  return `MAS OVERSIGHT RELAY FAILED — the MAS did not record this exchange. ${error ?? "No reason reported."}`;
}

export function useDroidChat(droidId: string, opts?: { pollHealthMs?: number }): DroidChatApi {
  const pollHealthMs = opts?.pollHealthMs ?? DEFAULT_HEALTH_POLL_MS;

  const [state, setState] = useState<ChatState>(INITIAL);

  const mountedRef = useRef(true);
  /** In-flight guard. A ref (not `pending`) so a rapid double-submit is rejected synchronously. */
  const inFlightRef = useRef(false);
  /** Has this conversation already been told it is talking to the shared agent? Warn once, not per turn. */
  const sharedUpstreamWarnedRef = useRef(false);
  const sessionIdRef = useRef<string>(makeSessionId(droidId));
  /** Previous health verdict — null until the first answer, so the first result logs once. */
  const lastOnlineRef = useRef<boolean | null>(null);
  const droidRef = useRef(droidId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // A different droid is a different conversation: transcript, counters and session all reset rather
  // than letting one droid's exchanges be read as another's.
  useEffect(() => {
    if (droidRef.current === droidId) return;
    droidRef.current = droidId;
    sessionIdRef.current = makeSessionId(droidId);
    lastOnlineRef.current = null;
    inFlightRef.current = false;
    sharedUpstreamWarnedRef.current = false;
    setState(INITIAL);
  }, [droidId]);

  // Health poll → `online`, which is what disables the input in the UI. Fail closed: anything short
  // of an explicit reachable:true reads as offline, so an operator can never type into nothing.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      let up = false;
      let reason: string | null = null;
      try {
        const res = await fetch(HEALTH_ENDPOINT, { cache: "no-store", credentials: "same-origin" });
        const body: unknown = await res.json().catch(() => null);
        const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
        up = res.ok && rec?.reachable === true;
        reason = up ? null : res.ok ? "the bridge answered but did not confirm a reachable droid agent." : errorDetail(body, res.status);
      } catch (err) {
        up = false;
        reason = (err as Error).message;
      }
      if (cancelled || !mountedRef.current) return;

      // Log transitions only (including the first resolution) — a line per poll would bury the chat.
      const changed = lastOnlineRef.current !== up;
      const first = lastOnlineRef.current === null;
      lastOnlineRef.current = up;
      setState((prev) => ({
        ...prev,
        online: up,
        // Do not clear an error the operator still needs; only the online path resets it.
        lastError: up ? (prev.pending ? prev.lastError : null) : reason,
        messages: changed
          ? [
              ...prev.messages,
              sys(
                up
                  ? first
                    ? `Droid link up — ${droidId} agent reachable.`
                    : `Droid link recovered — ${droidId} agent reachable again.`
                  : `${first ? "Droid link not available" : "DROID LINK LOST"} — ${reason ?? "no reason reported."}`,
              ),
            ]
          : prev.messages,
      }));
    };

    void check();
    const id = window.setInterval(() => void check(), pollHealthMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [droidId, pollHealthMs]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const message = (text ?? "").trim();
      if (!message) return false;

      if (message.length > MAX_MESSAGE_CHARS) {
        setState((prev) => ({ ...prev, messages: [...prev.messages, sys(`Send blocked — message exceeds ${MAX_MESSAGE_CHARS} characters.`)] }));
        return false;
      }
      if (inFlightRef.current) {
        // Refusing loudly beats queueing silently: exactly one message is ever in flight.
        setState((prev) => ({ ...prev, messages: [...prev.messages, sys("Send ignored — a message is already in flight to the droid.")] }));
        return false;
      }

      inFlightRef.current = true;
      // Event 1: the operator genuinely said this, so it goes on the transcript now. No droid line is
      // speculated alongside it.
      setState((prev) => ({ ...prev, pending: true, messages: [...prev.messages, { role: "operator", text: message, atMs: Date.now() }] }));

      try {
        const res = await fetch(CHAT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ droidId, message, sessionId: sessionIdRef.current }),
        });
        const body: unknown = await res.json().catch(() => null);
        const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;

        if (!res.ok) {
          const detail = errorDetail(body, res.status);
          const latency = typeof rec?.latencyMs === "number" ? rec.latencyMs : null;
          if (!mountedRef.current) return false;
          // Event 2 (failure): the operator's line stays, an explicit failure line follows it. 503 is
          // the route's unambiguous "nothing is listening" — reflected immediately rather than
          // waiting for the next health poll.
          if (res.status === 503) lastOnlineRef.current = false;
          setState((prev) => ({
            ...prev,
            pending: false,
            online: res.status === 503 ? false : prev.online,
            sent: prev.sent + 1,
            failed: prev.failed + 1,
            // A failed exchange never reaches relayToMas() — oversight did NOT record this turn.
            relayOk: false,
            window: pushWindow(prev.window, { ok: false, latencyMs: latency }),
            lastErrorMs: Date.now(),
            lastError: detail,
            messages: [...prev.messages, sys(`SEND FAILED — no reply from the droid. ${detail}`)],
          }));
          return false;
        }

        const reply = typeof rec?.reply === "string" && rec.reply.trim() ? rec.reply : null;
        const latency = typeof rec?.latencyMs === "number" ? rec.latencyMs : null;
        const note = typeof rec?.note === "string" ? rec.note : null;
        const relay = readRelay(rec);
        if (!mountedRef.current) return false;

        // The route reports whether the endpoint that answered is bound to THIS droid id. When it is
        // not, the words came from the shared agent — verified live: droidId "mushroom-1" is answered
        // by the buoy's "Jetson-Myco-1". Saying so once per conversation is the difference between a
        // documented fallback and one droid's answer being read as another droid's.
        const upstreamSource = typeof rec?.upstreamSource === "string" ? rec.upstreamSource : null;
        const warnShared = rec?.perDroidUpstream === false && !sharedUpstreamWarnedRef.current;
        if (warnShared) sharedUpstreamWarnedRef.current = true;

        // Event 2 (success): one update carrying the reply (or the honest "unreadable" line), the
        // link sample, and any change in MAS oversight.
        setState((prev) => {
          const extra: DroidMessage[] = [];
          if (warnShared) {
            extra.push(
              sys(
                `Answered by the SHARED agent endpoint (${upstreamSource ?? "shared configuration"}), not one bound to "${droidId}" — these words are from whichever droid that endpoint serves.`,
              ),
            );
          }
          if (reply) {
            extra.push({ role: "droid", text: reply, atMs: Date.now(), latencyMs: latency });
          } else {
            // Delivered, but the answer was not in a readable shape. Say exactly that and show what
            // came back — inventing a paraphrase here would be fabricating droid speech.
            extra.push(sys(`${note ?? "Upstream reply shape not recognised."} Raw: ${rawPreview(rec?.raw ?? body)}`));
          }
          const line = relayTransitionLine(prev.relayOk, relay.state, relay.error);
          if (line) extra.push(sys(line));
          return {
            ...prev,
            pending: false,
            online: true,
            sent: prev.sent + 1,
            failed: reply ? prev.failed : prev.failed + 1,
            window: pushWindow(prev.window, { ok: Boolean(reply), latencyMs: latency }),
            lastOkMs: reply ? Date.now() : prev.lastOkMs,
            lastErrorMs: reply ? prev.lastErrorMs : Date.now(),
            relayOk: relay.state,
            lastError: reply ? null : (note ?? "Upstream reply shape not recognised."),
            messages: [...prev.messages, ...extra],
          };
        });
        lastOnlineRef.current = true;
        return Boolean(reply);
      } catch (err) {
        const detail = (err as Error).message;
        if (!mountedRef.current) return false;
        setState((prev) => ({
          ...prev,
          pending: false,
          sent: prev.sent + 1,
          failed: prev.failed + 1,
          // A failed exchange never reaches relayToMas() — oversight did NOT record this turn.
          relayOk: false,
          window: pushWindow(prev.window, { ok: false, latencyMs: null }),
          lastErrorMs: Date.now(),
          lastError: detail,
          messages: [...prev.messages, sys(`SEND FAILED — no reply from the droid. ${detail}`)],
        }));
        return false;
      } finally {
        inFlightRef.current = false;
      }
    },
    [droidId],
  );

  /**
   * Clears the TRANSCRIPT and starts a new session id. Link statistics deliberately survive: the
   * meter is an instrument reading of the radio path, and zeroing it from a UI button would erase
   * evidence that the link is degraded.
   */
  const clear = useCallback(() => {
    sessionIdRef.current = makeSessionId(droidRef.current);
    setState((prev) => ({ ...prev, messages: [], lastError: null }));
  }, []);

  const stats = useMemo<DroidLinkStats>(() => {
    const latencies = state.window.map((w) => w.latencyMs).filter((n): n is number => typeof n === "number");
    const okCount = state.window.filter((w) => w.ok).length;
    const last = state.window.length > 0 ? state.window[state.window.length - 1].latencyMs : null;
    return {
      lastLatencyMs: last,
      avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : null,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : null,
      sent: state.sent,
      failed: state.failed,
      // Null, not 100, before any exchange — a perfect score with no samples is a fabricated claim.
      uptimePct: state.window.length > 0 ? (okCount / state.window.length) * 100 : null,
      lastOkMs: state.lastOkMs,
      lastErrorMs: state.lastErrorMs,
      online: state.online,
      relayOk: state.relayOk,
    };
  }, [state]);

  return { messages: state.messages, stats, send, pending: state.pending, lastError: state.lastError, clear };
}
