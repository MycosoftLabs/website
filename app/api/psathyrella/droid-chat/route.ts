/**
 * POST /api/psathyrella/droid-chat — one operator turn with ONE named droid, plus the MAS
 * oversight relay that Morgan requires for every droid conversation.
 *
 * TWO GUARANTEES, AND THEY ARE THE WHOLE POINT OF THIS FILE
 *
 * 1. THE DROID'S WORDS ARE THE DROID'S WORDS.
 *    This route never produces assistant text. Not a canned reply, not a "helpful" placeholder while
 *    the agent is down, not a paraphrase of an unrecognised payload. An operator reading a transcript
 *    treats every line as a report from the hardware and will act on it. So an unconfigured or
 *    unreachable upstream is a 503 { error: "droid_unreachable", detail } and an unreadable reply is
 *    reply:null plus a note naming what came back — never invented speech.
 *
 * 2. THE MAS SEES EVERY EXCHANGE, OR THE OPERATOR IS TOLD IT DID NOT.
 *    Morgan: every communication with every droid must be monitored and post-processed by the MAS as
 *    an overseer. That is a guarantee, so a relay that silently drops would break it while looking
 *    fine. The relay therefore CANNOT be swallowed: its outcome ships back in `relay`
 *    { attempted, delivered, error } so the console can display, plainly, when oversight is not
 *    recording.
 *
 *    WHY THE RELAY IS AWAITED ON A SHORT LEASH RATHER THAN TRULY DETACHED: a detached POST could only
 *    ever report "unknown", which is exactly the blind spot the guarantee exists to close. So it is
 *    awaited under a hard RELAY_TIMEOUT_MS budget, and it can neither fail the chat (the status code
 *    is decided entirely by the droid exchange) nor meaningfully delay it (the droid's own generation
 *    dwarfs the relay budget). A relay that overruns the budget is reported as undelivered — honest,
 *    because at that point delivery genuinely is unconfirmed.
 *
 * PER-DROID BY CONSTRUCTION
 * The upstream is resolved from `PSATHYRELLA_DROID_CHAT_URL__<DROID_ID_UPPER_SNAKE>` first, so a
 * second buoy is added with one env var and zero code changes. It falls back to the shared OpenClaw
 * chat URL, then to <OPENCLAW_URL>/chat.
 *
 * MEASURED, NOT ASSUMED (probed Aug 02 2026 from this repo):
 *   POST http://192.168.0.123:8793/chat  { "message": "..." }
 *     → HTTP 200 in 3.8s, body carries model:"openclaw", reply:"OK" AND the OpenAI
 *       choices[0].message.content envelope. Both shapes are normalised below.
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A channel to a vehicle — bound it rather than relay unbounded operator text. */
const MAX_MESSAGE_CHARS = 4000;
/** Droid ids become part of an env var name, so keep them to an injection-free set. */
const DROID_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
/** Session ids are echoed upstream and into the relay — same reasoning. */
const SESSION_ID_RE = /^[A-Za-z0-9._:-]{1,200}$/;
/**
 * A generation legitimately takes tens of seconds (the agent answers only when the model is done),
 * so this is a generation budget, not a connectivity timeout.
 */
const CHAT_TIMEOUT_MS = Number(process.env.PSATHYRELLA_DROID_CHAT_TIMEOUT_MS || 45000);
/** Oversight budget. Small enough to be invisible next to a multi-second generation. */
// MAS oversight budget. 2500ms was too slow: with the MAS down, EVERY operator turn paid the full
// budget on top of the droid's own generation. MAS sits on the same LAN (192.168.0.188) where a POST
// normally completes well under 100ms, so 600ms is ~6x headroom for a healthy relay while capping the
// worst case at a quarter of what it was. We still AWAIT it (bounded) rather than detaching, because a
// detached POST can only ever report "unknown" — and the whole point of the relay indicator is to tell
// the operator truthfully whether the MAS is recording this conversation.
const RELAY_TIMEOUT_MS = Number(process.env.PSATHYRELLA_MAS_DROID_LOG_TIMEOUT_MS || 600);
/**
 * Documented dev-PC → Jetson (.123) first-SYN stall: a brand-new connection intermittently dies at
 * the transport layer within a few seconds even though the service answers in milliseconds. A death
 * this fast means the request body never left, so a re-send cannot duplicate an operator message. A
 * slower failure is ambiguous (the droid may have it and be thinking) and is reported, never re-sent.
 */
const STALL_RETRY_WINDOW_MS = 8000;
/** The OpenAI-compatible route wants messages[]; a bespoke /chat wants { message }. Path decides. */
const OPENAI_CHAT_PATH = "/v1/chat/completions";

interface Attempt {
  /** True only when a real HTTP response came back — ANY status counts. */
  answered: boolean;
  ok: boolean;
  status: number | null;
  body: unknown;
  /** Monotonic wall time for this attempt. This is the number the console meters. */
  ms: number;
  error: string | null;
}

export interface DroidChatRelayOutcome {
  /** False when no MAS log endpoint is configured — nothing was even tried. */
  attempted: boolean;
  /** True ONLY when the MAS endpoint accepted the exchange (2xx). */
  delivered: boolean;
  error: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** Short, safe preview of an upstream body for an error detail. */
function preview(body: unknown, max = 220): string {
  try {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    if (!s) return "(empty body)";
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return "(unserialisable body)";
  }
}

/** `psathyrella-1` → `PSATHYRELLA_1`, so the per-droid env var is predictable from the id alone. */
/**
 * Map a droidId to its env-var suffix.
 *
 * Collapsing every non-alphanumeric run to "_" made DISTINCT ids collide: "droid.a", "droid-a" and
 * "droid_a" all produced PSATHYRELLA_DROID_CHAT_URL__DROID_A, so one droid could be answered by
 * another droid's agent — a wrong answer in the wrong window on an operator console. Separators are
 * now encoded distinctly (. -> _DOT_, - -> _DASH_, _ -> _), which keeps the common
 * all-alphanumeric and hyphenated ids readable while making a collision impossible.
 */
function envSuffix(droidId: string): string {
  return droidId
    .replace(/\./g, "_DOT_")
    .replace(/-/g, "_DASH_")
    .replace(/[^A-Za-z0-9_]+/g, (m) => `_X${m.length}_`)
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

interface Upstream {
  url: string;
  /** Which env var supplied it — surfaced in errors so a misconfiguration names itself. */
  source: string;
  /** The per-droid var that WOULD override this, for the unconfigured message. */
  perDroidKey: string;
  openAiShape: boolean;
}

/**
 * Per-droid first, then the shared OpenClaw chat URL, then <OPENCLAW_URL>/chat. Returns null when
 * nothing is configured — which is a 503, never a fabricated conversation.
 */
function resolveUpstream(droidId: string): Upstream | null {
  const perDroidKey = `PSATHYRELLA_DROID_CHAT_URL__${envSuffix(droidId)}`;
  const perDroid = (process.env[perDroidKey] || "").trim();
  if (perDroid) return finish(perDroid, perDroidKey, perDroidKey);

  const shared = (process.env.PSATHYRELLA_OPENCLAW_CHAT_URL || "").trim();
  if (shared) return finish(shared, "PSATHYRELLA_OPENCLAW_CHAT_URL", perDroidKey);

  const base = (process.env.PSATHYRELLA_OPENCLAW_URL || "").trim().replace(/\/+$/, "");
  if (base) return finish(`${base}/chat`, "PSATHYRELLA_OPENCLAW_URL + /chat", perDroidKey);

  return null;

  function finish(raw: string, source: string, key: string): Upstream {
    const url = raw.replace(/\/+$/, "");
    return { url, source, perDroidKey: key, openAiShape: url.endsWith(OPENAI_CHAT_PATH) };
  }
}

async function attempt(url: string, init: RequestInit, timeoutMs: number): Promise<Attempt> {
  // performance.now() is monotonic — a wall-clock jump (NTP step, suspend) must not invent or erase
  // latency on a meter the operator reads as link health.
  const t0 = performance.now();
  const elapsed = () => Math.round(performance.now() - t0);
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text.slice(0, 2000);
    }
    return { answered: true, ok: res.ok, status: res.status, body, ms: elapsed(), error: null };
  } catch (err) {
    return { answered: false, ok: false, status: null, body: null, ms: elapsed(), error: (err as Error).message };
  }
}

/**
 * Normalise every reply shape this fleet actually emits. Anything else is reported as unrecognised
 * with reply:null and the raw body attached — guessing which field held the text, or stitching one
 * together, would be fabricating droid speech.
 */
function normalizeReply(body: unknown): { reply: string | null; note: string | null } {
  if (!isRecord(body)) {
    const kind = body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
    return { reply: null, note: `Upstream returned a ${kind} body, not a recognised chat object — raw body shown, no text inferred.` };
  }
  // Convenience keys first (the verified bridge sets reply/message/content alongside choices[]),
  // then the OpenAI envelope.
  for (const key of ["reply", "response", "message", "content"] as const) {
    const direct = nonEmptyString(body[key]);
    if (direct) return { reply: direct, note: null };
  }
  if (Array.isArray(body.choices) && body.choices.length > 0) {
    const first: unknown = body.choices[0];
    const message = isRecord(first) ? first.message : null;
    const content = isRecord(message) ? nonEmptyString(message.content) : null;
    if (content) return { reply: content, note: null };
    return { reply: null, note: "Upstream sent an OpenAI-style envelope with no message content — raw body shown, no text inferred." };
  }
  return {
    reply: null,
    note: `Upstream replied with an unrecognised shape (top-level keys: ${Object.keys(body).slice(0, 12).join(", ") || "none"}) — raw body shown, no text inferred.`,
  };
}

/** The model the agent says answered. Reported only when it reports one. */
function readModel(body: unknown): string | null {
  if (!isRecord(body)) return null;
  return nonEmptyString(body.model) ?? nonEmptyString(body.agent) ?? null;
}

/**
 * MAS OVERSIGHT RELAY. Never throws, never changes the chat's status code — but never lies about the
 * outcome either. `PSATHYRELLA_MAS_DROID_LOG_URL` has NO default on purpose: MAS (192.168.0.188:8001)
 * exposes no droid-log route yet, and pointing this at a guessed path would report "delivered" for a
 * 404 or invent an endpoint that does not exist.
 */
async function relayToMas(payload: Record<string, unknown>): Promise<DroidChatRelayOutcome> {
  const url = (process.env.PSATHYRELLA_MAS_DROID_LOG_URL || "").trim();
  if (!url) {
    return {
      attempted: false,
      delivered: false,
      error: "PSATHYRELLA_MAS_DROID_LOG_URL is not configured — the MAS is NOT recording droid conversations.",
    };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { attempted: true, delivered: false, error: `MAS oversight endpoint answered HTTP ${res.status}: ${preview(text)}` };
    }
    return { attempted: true, delivered: true, error: null };
  } catch (err) {
    // Includes the timeout: past the budget, delivery is genuinely unconfirmed, so it is reported as
    // undelivered rather than assumed good.
    return { attempted: true, delivered: false, error: `MAS oversight relay failed: ${(err as Error).message}` };
  }
}

function unreachable(
  detail: string,
  droidId: string,
  upstream: string | null,
  relay: DroidChatRelayOutcome | null = null,
) {
  return NextResponse.json(
    { error: "droid_unreachable", detail, droidId, upstream, relay },
    { status: 503 },
  );
}

export async function POST(req: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request", detail: "body must be JSON" }, { status: 400 });
  }
  if (!isRecord(raw)) {
    return NextResponse.json({ error: "invalid_request", detail: "body must be a JSON object" }, { status: 400 });
  }
  if (typeof raw.droidId !== "string" || !DROID_ID_RE.test(raw.droidId)) {
    return NextResponse.json({ error: "invalid_request", detail: "droidId must match [A-Za-z0-9._-]{1,64}" }, { status: 400 });
  }
  const droidId = raw.droidId;
  if (typeof raw.message !== "string") {
    return NextResponse.json({ error: "invalid_request", detail: "message must be a string" }, { status: 400 });
  }
  const message = raw.message.trim();
  if (!message) {
    return NextResponse.json({ error: "invalid_request", detail: "message must not be empty" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: "invalid_request", detail: `message exceeds ${MAX_MESSAGE_CHARS} characters` }, { status: 400 });
  }
  let sessionId: string | null = null;
  if (raw.sessionId !== undefined && raw.sessionId !== null) {
    if (typeof raw.sessionId !== "string" || !SESSION_ID_RE.test(raw.sessionId)) {
      return NextResponse.json({ error: "invalid_request", detail: "sessionId must match [A-Za-z0-9._:-]{1,200}" }, { status: 400 });
    }
    sessionId = raw.sessionId;
  }

  const upstream = resolveUpstream(droidId);
  if (!upstream) {
    const detail = `No chat upstream is configured for droid "${droidId}". Set PSATHYRELLA_DROID_CHAT_URL__${envSuffix(droidId)}, or PSATHYRELLA_OPENCLAW_CHAT_URL / PSATHYRELLA_OPENCLAW_URL for the shared agent. Message NOT sent.`;
    // Failures must still hit MAS oversight — "every communication" includes the ones that never left.
    const relay = await relayToMas({
      droidId,
      sessionId,
      ts: new Date().toISOString(),
      operatorText: message,
      droidText: null,
      latencyMs: null,
      model: null,
      source: "gcs",
      outcome: "unreachable",
      error: detail,
      upstream: null,
    });
    return unreachable(detail, droidId, null, relay);
  }

  const body = JSON.stringify(
    upstream.openAiShape
      ? { messages: [{ role: "user", content: message }], ...(sessionId ? { sessionId } : {}) }
      : sessionId
        ? { message, sessionId }
        : { message },
  );
  const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json" }, body };

  let sent = await attempt(upstream.url, init, CHAT_TIMEOUT_MS);
  let attempts = 1;
  // One re-send ONLY inside the window where the transport provably never carried the body.
  if (!sent.answered && sent.ms < STALL_RETRY_WINDOW_MS) {
    sent = await attempt(upstream.url, init, CHAT_TIMEOUT_MS);
    attempts = 2;
  }

  if (!sent.answered) {
    const detail = `Droid "${droidId}" did not answer at ${upstream.url} after ${attempts} attempt(s) in ${sent.ms}ms (${sent.error ?? "no response"}) — delivery unconfirmed, no reply exists.`;
    const relay = await relayToMas({
      droidId,
      sessionId,
      ts: new Date().toISOString(),
      operatorText: message,
      droidText: null,
      latencyMs: sent.ms,
      model: null,
      source: "gcs",
      outcome: "unreachable",
      error: detail,
      upstream: upstream.url,
      status: sent.status,
    });
    return unreachable(detail, droidId, upstream.url, relay);
  }
  if (!sent.ok) {
    // Reachable but failing is a DIFFERENT fact from unreachable, and still yields no invented text.
    const detail = `Droid "${droidId}" answered HTTP ${sent.status} from ${upstream.source}: ${preview(sent.body)}`;
    const relay = await relayToMas({
      droidId,
      sessionId,
      ts: new Date().toISOString(),
      operatorText: message,
      droidText: null,
      latencyMs: sent.ms,
      model: null,
      source: "gcs",
      outcome: "upstream_error",
      error: detail,
      upstream: upstream.url,
      status: sent.status,
    });
    return NextResponse.json(
      {
        error: "droid_upstream_error",
        detail,
        droidId,
        upstream: upstream.url,
        status: sent.status,
        latencyMs: sent.ms,
        raw: sent.body,
        relay,
      },
      { status: 502 },
    );
  }

  const { reply, note } = normalizeReply(sent.body);
  const model = readModel(sent.body);

  // Relay the exchange as it actually was: droidText is null when the agent's answer was unreadable,
  // because handing the MAS a fabricated transcript would poison the very oversight it performs.
  const relay = await relayToMas({
    droidId,
    sessionId,
    ts: new Date().toISOString(),
    operatorText: message,
    droidText: reply,
    latencyMs: sent.ms,
    model,
    source: "gcs",
    outcome: reply ? "ok" : "unreadable",
    error: note,
    upstream: upstream.url,
    status: sent.status,
  });

  return NextResponse.json({
    ok: true,
    droidId,
    upstream: upstream.url,
    upstreamSource: upstream.source,
    // FALSE means these words came from the SHARED agent, not an endpoint bound to this droid id.
    // Verified live Aug 02 2026: droidId "mushroom-1" resolves to the buoy bridge and answers
    // "Jetson-Myco-1". The console must be able to say so, or one droid's words get read as another's.
    perDroidUpstream: upstream.source === upstream.perDroidKey,
    sessionId,
    status: sent.status,
    attempts,
    latencyMs: sent.ms,
    model,
    reply,
    note,
    raw: sent.body,
    relay,
    receivedAt: new Date().toISOString(),
  });
}
