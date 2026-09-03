"use client";

/**
 * useOpenClaw — the operator's chat link to the OpenClaw droid agent aboard Psathyrella.
 *
 * THE ONE RULE: this hook never puts words in the droid's mouth. A "droid" message appears only when
 * the bridge returned text that the agent actually produced. Everything else — send failures, an
 * unreadable reply shape, the link going away — is a SYSTEM message, visibly not the droid.
 *
 * WHY THAT MATTERS MORE THAN UX POLISH: an operator who believes a command reached the droid will
 * act on that belief (walk away from the bench, log it as done, tell a customer the buoy acknowledged
 * it). So a failed send is never silent and never optimistic: the operator's own line stays on the
 * transcript, followed by an explicit system line saying the send failed and why.
 *
 * Reachability is polled from the bridge, not assumed, and NOTHING here hard-codes a verdict about
 * the rig. OpenClaw does answer on the Jetson (verified Aug 02 2026 at :18789, outside the 87xx
 * range an earlier sweep covered), but "a socket answered" is not "a chat is connected" — that box
 * serves a catch-all on every path while its control UI bundle is unbuilt. Only the bridge's own
 * probe (process live AND chat route serving) sets `reachable`, and when it is false the UI must
 * disable input. If the endpoint moves or goes away, the next poll reflects it with no code change.
 *
 * Never throws into React: every async path is wrapped, and state writes are guarded by a mounted
 * flag so a late response from an unmounted console cannot warn or crash.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface OpenClawMessage {
  role: "operator" | "droid" | "system";
  text: string;
  atMs: number;
  /**
   * Omitted/true = `atMs` is when this line actually happened (we observed it locally).
   * false = the agent published this line WITHOUT a timestamp, so `atMs` is only our receipt time.
   * The console must not print a clock for those: showing "now" for a message the droid may have
   * said an hour ago is a fabricated observation, and on this surface a timestamp is evidence.
   */
  atMsReported?: boolean;
}

export interface OpenClawApi {
  messages: OpenClawMessage[];
  send: (text: string) => Promise<boolean>;
  pending: boolean;
  reachable: boolean;
  lastError: string | null;
}

/** Server bridge. See app/api/fusarium/gcs/openclaw/chat-bridge/route.ts for the contract. */
const ENDPOINT = "/api/fusarium/gcs/openclaw/chat-bridge";
/** Health cadence — fast enough that the console lights up within seconds of the agent appearing,
 *  slow enough that it costs nothing on a bench iPad. */
const HEALTH_POLL_MS = 15000;
/** Mirrors the server cap so an over-long message is refused locally instead of round-tripping. */
const MAX_MESSAGE_CHARS = 4000;

/** Opaque per-mount conversation id so the agent can thread a session. Must satisfy the bridge's
 *  [A-Za-z0-9._:-] validation — both branches below do. */
function makeSessionId(): string {
  const c: Crypto | undefined = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return `gcs-${c.randomUUID()}`;
  // Fallback for contexts without randomUUID (it needs a secure context).
  // getRandomValues is available far more widely and is a CSPRNG; the previous
  // Math.random() fallback produced a guessable session id, which matters
  // because this id is the conversation's only identifier on the wire.
  if (c && typeof c.getRandomValues === "function") {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    return `gcs-${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
  }
  // No crypto at all: fail loudly rather than mint a predictable id.
  throw new Error("Secure random source unavailable — cannot create a session id.");
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

/** Compact preview of an unrecognised payload — enough for the operator to see SOMETHING came back,
 *  without pretending it was speech. */
function rawPreview(raw: unknown): string {
  try {
    const s = typeof raw === "string" ? raw : JSON.stringify(raw);
    if (!s) return "(empty body)";
    return s.length > 300 ? `${s.slice(0, 300)}…` : s;
  } catch {
    return "(unserialisable body)";
  }
}

export function useOpenClaw(opts?: { enabled?: boolean }): OpenClawApi {
  const enabled = opts?.enabled !== false;

  const [messages, setMessages] = useState<OpenClawMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [reachable, setReachable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  if (sessionIdRef.current === null) sessionIdRef.current = makeSessionId();
  /** Previous resolved reachability — null until the first health answer, so the first result can be
   *  logged once without spamming a line on every poll. */
  const lastReachableRef = useRef<boolean | null>(null);
  /** In-flight guard. A ref (not `pending`) so a rapid double-submit is rejected synchronously. */
  const inFlightRef = useRef(false);
  /** Adopt the agent's own transcript only once, and only while ours is still empty. */
  const adoptedHistoryRef = useRef(false);

  const append = useCallback((msg: OpenClawMessage) => {
    if (!mountedRef.current) return;
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Health / history poll. Drives `reachable`, which is what disables the input in the UI.
  useEffect(() => {
    if (!enabled) {
      setReachable(false);
      return;
    }
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${ENDPOINT}?sessionId=${encodeURIComponent(sessionIdRef.current ?? "")}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body: unknown = await res.json().catch(() => null);
        if (cancelled || !mountedRef.current) return;

        // A 200 is NOT enough. The bridge only sets reachable:true after proving the process is live
        // AND the chat route is serving, so we require that flag explicitly — otherwise any 200 that
        // is not our bridge (a proxy page, a rewritten route, an HTML error) would enable the input
        // and let an operator type into nothing. Fail closed.
        const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
        const up = res.ok && rec?.reachable === true;
        // One reason, used for both the state and the transcript line, so the banner and the log can
        // never tell the operator two different stories about the same poll.
        const reason = up
          ? null
          : res.ok
            ? "the bridge answered but did not confirm a serving OpenClaw chat endpoint."
            : errorDetail(body, res.status);
        setReachable(up);
        setLastError(reason);

        // Log only transitions (including the very first resolution) — a line per poll would bury
        // the conversation.
        if (lastReachableRef.current !== up) {
          const first = lastReachableRef.current === null;
          lastReachableRef.current = up;
          append({
            role: "system",
            atMs: Date.now(),
            text: up
              ? first
                ? "OpenClaw bridge reachable — droid AI online."
                : "OpenClaw bridge recovered — droid AI back online."
              : `${first ? "OpenClaw not reachable" : "OpenClaw link lost"} — ${reason}`,
          });
        }

        // Adopt the agent's transcript if it publishes one and we have nothing local yet. This is
        // real upstream content, so it is safe to show; anything we generated stays ours.
        if (up && !adoptedHistoryRef.current && rec) {
          const history = rec.history;
          if (Array.isArray(history) && history.length > 0) {
            adoptedHistoryRef.current = true;
            const adopted: OpenClawMessage[] = history
              .map((h): OpenClawMessage | null => {
                if (typeof h !== "object" || h === null) return null;
                const entry = h as { role?: unknown; text?: unknown; atMs?: unknown };
                if (typeof entry.text !== "string" || !entry.text) return null;
                const role = entry.role === "operator" || entry.role === "droid" ? entry.role : "system";
                // A missing upstream timestamp is NOT filled in with "now" and passed off as one:
                // atMs falls back to receipt time purely for ordering, and atMsReported:false tells
                // the console to render the time as unreported instead of printing a clock.
                const reported = typeof entry.atMs === "number" && Number.isFinite(entry.atMs);
                return { role, text: entry.text, atMs: reported ? (entry.atMs as number) : Date.now(), atMsReported: reported };
              })
              .filter((m): m is OpenClawMessage => m !== null);
            if (adopted.length > 0 && mountedRef.current) {
              setMessages((prev) => (prev.some((m) => m.role !== "system") ? prev : [...prev, ...adopted]));
            }
          }
        }
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setReachable(false);
        setLastError((err as Error).message);
        if (lastReachableRef.current !== false) {
          const first = lastReachableRef.current === null;
          lastReachableRef.current = false;
          append({
            role: "system",
            atMs: Date.now(),
            text: `${first ? "OpenClaw not reachable" : "OpenClaw link lost"} — ${(err as Error).message}`,
          });
        }
      }
    };

    void check();
    const id = window.setInterval(() => void check(), HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, append]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const message = (text ?? "").trim();
      if (!message) return false;

      if (!enabled) {
        append({ role: "system", atMs: Date.now(), text: "Send blocked — the OpenClaw bridge is disabled on this console." });
        return false;
      }
      if (message.length > MAX_MESSAGE_CHARS) {
        append({ role: "system", atMs: Date.now(), text: `Send blocked — message exceeds ${MAX_MESSAGE_CHARS} characters.` });
        return false;
      }
      if (inFlightRef.current) {
        // Refusing loudly beats queueing silently: the operator sees exactly one message in flight.
        append({ role: "system", atMs: Date.now(), text: "Send ignored — a message is already in flight to the droid." });
        return false;
      }

      inFlightRef.current = true;
      if (mountedRef.current) setPending(true);
      // The operator genuinely said this, so it goes on the transcript now. No droid line is
      // speculated alongside it.
      append({ role: "operator", atMs: Date.now(), text: message });

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ message, sessionId: sessionIdRef.current }),
        });
        const body: unknown = await res.json().catch(() => null);

        if (!res.ok) {
          const detail = errorDetail(body, res.status);
          if (mountedRef.current) {
            setLastError(detail);
            // 503 is the bridge's unambiguous "nothing is listening" — reflect it immediately rather
            // than waiting for the next health poll.
            if (res.status === 503) {
              setReachable(false);
              lastReachableRef.current = false;
            }
          }
          append({ role: "system", atMs: Date.now(), text: `SEND FAILED — the droid did not receive this message. ${detail}` });
          return false;
        }

        const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
        const reply = rec && typeof rec.reply === "string" && rec.reply.trim() ? rec.reply : null;
        if (mountedRef.current) {
          setLastError(null);
          setReachable(true);
          lastReachableRef.current = true;
        }

        if (reply) {
          append({ role: "droid", atMs: Date.now(), text: reply });
        } else {
          // Delivered, but the agent's answer was not in a shape we can read. Say exactly that and
          // show the raw payload — inventing a paraphrase here would be fabricating droid speech.
          const note = rec && typeof rec.note === "string" ? rec.note : "Upstream reply shape not recognised.";
          append({ role: "system", atMs: Date.now(), text: `${note} Raw: ${rawPreview(rec ? rec.raw : body)}` });
        }
        return true;
      } catch (err) {
        const detail = (err as Error).message;
        if (mountedRef.current) setLastError(detail);
        append({ role: "system", atMs: Date.now(), text: `SEND FAILED — the droid did not receive this message. ${detail}` });
        return false;
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) setPending(false);
      }
    },
    [append, enabled],
  );

  return { messages, send, pending, reachable, lastError };
}
