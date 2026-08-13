/**
 * /api/psathyrella/openclaw/chat-bridge — same-origin bridge between the GCS operator and the
 * OpenClaw droid agent running on the buoy.
 *
 * WHY THIS ROUTE IS DELIBERATELY UNFORGIVING
 * Psathyrella is a droid, and the AI inside it is supposed to talk to the operator. The moment an
 * operator believes they are talking to the droid, every word on that transcript is read as a report
 * from the hardware. So this file has one unbreakable rule:
 *
 *   IT NEVER PRODUCES ASSISTANT TEXT. NOT A CANNED REPLY, NOT A SIMULATED ONE, NOT A "helpful"
 *   PLACEHOLDER WHILE THE AGENT IS DOWN.
 *
 * No upstream, an upstream that is not serving chat, or a dead upstream → 503
 * { error: "openclaw_unreachable", detail } and the console renders an honest dead state.
 *
 * MEASURED TOPOLOGY (probed from this repo, Aug 02 2026 — not assumed):
 *   http://192.168.0.123:18789            OpenClaw, LIVE. GET /health → {"ok":true,"status":"live"} in ~8ms.
 *   POST /v1/chat/completions             THE chat route. OPTIONS → 405 `Allow: POST` (route exists, POST only).
 *   every other path                      404, or the SPA catch-all 503 "Control UI assets not found.
 *                                         Build them with `pnpm ui:build`…" — including GET /chat and GET /.
 * That catch-all is why reachability here is NOT "a socket answered": the OpenClaw box answers on
 * every path, so treating any response as "chat is up" would light the console green while nothing
 * could actually be said to the droid. Reachable means BOTH: the process reports live at /health AND
 * the chat route exists (OPTIONS is not 404 and not the catch-all 503).
 *
 * The earlier assumed port :8793 (used by the sibling openclaw/status + chat routes) is NOT what is
 * listening; :18789 is. PSATHYRELLA_OPENCLAW_URL in .env.local already points at :18789.
 *
 * WHY THE PATH IS `chat-bridge` AND NOT `chat`
 * `app/api/psathyrella/openclaw/chat/route.ts` was created by a parallel agent while this module was
 * being built (POST-only passthrough). Overwriting another agent's live, untracked work is
 * unrecoverable, so this took an adjacent path. The two are redundant — an owner should delete one.
 * This one adds: GET health/route-existence, strict validation, retry-fresh for the documented Jetson
 * link stall, three-shape reply normalisation, and the 503 unreachable contract.
 *
 *   GET  → reachable/live + the agent's transcript when it publishes one
 *   POST → { message, sessionId? } relayed to the agent; reply normalised, never invented
 */

import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** An operator message is a channel to a vehicle — bound it rather than relay unbounded text. */
const MAX_MESSAGE_CHARS = 4000;
/** Session ids are echoed to the agent and into a URL — keep them to an opaque, injection-free set. */
const SESSION_ID_RE = /^[A-Za-z0-9._:-]{1,200}$/;
/**
 * A generation legitimately takes tens of seconds (a non-streaming agent answers only when the model
 * is done), so the POST budget is generous and env-tunable. It is NOT a connectivity timeout — the
 * preflight below owns connectivity.
 */
const POST_TIMEOUT_MS = Number(process.env.PSATHYRELLA_OPENCLAW_TIMEOUT_MS || 45000);
/** Probes: short attempts on a brand-new connection each time. See probeFresh(). */
const PROBE_ATTEMPTS = 3;
const PROBE_TIMEOUT_MS = 3000;
/**
 * If the POST dies at the transport layer this fast, the connection never carried a request body, so
 * re-sending cannot duplicate a message. A slower failure is ambiguous (the agent may have received
 * it and be working) and is reported as a failure, never silently re-sent.
 */
const STALL_RETRY_WINDOW_MS = 8000;
/** Verified live OpenClaw base. Only used when no env var is set. */
const DEFAULT_BASE = "http://192.168.0.123:18789";
/** Verified chat route on that build of OpenClaw (OpenAI-compatible, POST only). */
const OPENAI_CHAT_PATH = "/v1/chat/completions";

interface Attempt {
  /** True only when a real HTTP response came back — ANY status counts, 404 included. */
  answered: boolean;
  ok: boolean;
  status: number | null;
  body: unknown;
  ms: number;
  error: string | null;
  allow: string | null;
}

/**
 * Resolve the agent endpoint. An explicit PSATHYRELLA_OPENCLAW_CHAT_URL wins; otherwise the verified
 * OpenAI-compatible route on the configured base. Env chain matches the sibling openclaw routes so
 * one variable configures the whole surface.
 */
function resolveChat(): { url: string; base: string; explicit: boolean; openAiShape: boolean } {
  const base = (process.env.PSATHYRELLA_OPENCLAW_BRIDGE_URL || process.env.PSATHYRELLA_OPENCLAW_URL || DEFAULT_BASE).trim().replace(/\/+$/, "");
  const direct = (process.env.PSATHYRELLA_OPENCLAW_CHAT_URL || "").trim().replace(/\/+$/, "");
  const url = direct || `${base}${OPENAI_CHAT_PATH}`;
  // Body shape follows the PATH, not a guess: the OpenAI route wants messages[], a bespoke /chat
  // route wants { message }.
  return { url, base, explicit: Boolean(direct), openAiShape: url.endsWith(OPENAI_CHAT_PATH) };
}

async function attempt(url: string, init: RequestInit, timeoutMs: number): Promise<Attempt> {
  const t0 = Date.now();
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
    return { answered: true, ok: res.ok, status: res.status, body, ms: Date.now() - t0, error: null, allow: res.headers.get("allow") };
  } catch (err) {
    return { answered: false, ok: false, status: null, body: null, ms: Date.now() - t0, error: (err as Error).message, allow: null };
  }
}

/**
 * Retry-fresh — the documented dev-PC → Jetson (.123) first-SYN stall: a new connection
 * intermittently hangs for seconds even though the service answers in ~8 ms directly, and a longer
 * timeout does not help because a stalled connection stays stalled. A short per-attempt timeout plus
 * a brand-new connection recovers immediately, while a GENUINE outage still resolves as unreachable
 * within attempts x timeout. Only transport failures are retried — an HTTP response of any status is
 * a real answer from the far end.
 */
async function probeFresh(url: string, init: RequestInit, attempts: number, timeoutMs: number): Promise<Attempt> {
  let last = await attempt(url, init, timeoutMs);
  for (let i = 1; i < attempts && !last.answered; i++) last = await attempt(url, init, timeoutMs);
  return last;
}

/**
 * Does the chat ROUTE exist? OPTIONS is free and mutates nothing. On the live box the real route
 * answers 405 `Allow: POST` while unknown paths answer 404 or the SPA catch-all 503 — so those two
 * are the disqualifiers, and everything else counts as present.
 */
function routeExists(opt: Attempt): boolean {
  if (!opt.answered) return false;
  if (opt.status === 404) return false;
  if (opt.status === 503) return false; // control-UI catch-all: the app is not serving its routes
  return true;
}

function catchAllHint(body: unknown): string | null {
  const text = typeof body === "string" ? body : null;
  return text && /Control UI assets not found/i.test(text)
    ? "OpenClaw is serving its control-UI catch-all (assets not built — `pnpm ui:build` on the Jetson), so its routes are not being served."
    : null;
}

function unreachable(detail: string, upstream: string | null, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: "openclaw_unreachable", detail, upstream, reachable: false, ...extra }, { status: 503 });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/** Short, safe preview of an upstream body for an error detail. */
function preview(body: unknown, max = 200): string {
  try {
    const s = typeof body === "string" ? body : JSON.stringify(body);
    if (!s) return "(empty body)";
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return "(unserialisable body)";
  }
}

/**
 * Normalise the three reply shapes agents commonly emit. Anything else is reported as an
 * unrecognised shape with reply:null — the raw body still ships so the operator (and whoever owns
 * the agent) sees exactly what came back. Guessing which field held the text, or stitching one
 * together, would be fabricating droid speech.
 */
function normalizeReply(body: unknown): { reply: string | null; note: string | null } {
  if (!isRecord(body)) {
    const kind = body === null ? "null" : Array.isArray(body) ? "array" : typeof body;
    return { reply: null, note: `Upstream returned a ${kind} body, not a recognised chat object — raw body shown, no text inferred.` };
  }
  // 1. { reply: "..." }
  const direct = nonEmptyString(body.reply);
  if (direct) return { reply: direct, note: null };
  // 2. { response: "..." }
  const response = nonEmptyString(body.response);
  if (response) return { reply: response, note: null };
  // 3. OpenAI-style { choices: [{ message: { content: "..." } }] }
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

type WireRole = "operator" | "droid" | "system";

/** Map whatever the agent calls its speakers onto the console's three roles. Unknown → system, so an
 *  unrecognised speaker can never be painted as the droid. */
function mapRole(v: unknown): WireRole {
  const r = typeof v === "string" ? v.toLowerCase() : "";
  if (r === "user" || r === "operator" || r === "human") return "operator";
  if (r === "assistant" || r === "agent" || r === "droid" || r === "openclaw" || r === "bot") return "droid";
  return "system";
}

export interface OpenClawWireMessage {
  role: WireRole;
  text: string;
  atMs: number | null;
}

/** Pull a transcript out of a GET response if the agent exposes one. Absent → null (not an empty
 *  array), so the client can tell "no history endpoint" from "history is genuinely empty". */
function normalizeHistory(body: unknown): { history: OpenClawWireMessage[] | null; note: string | null } {
  if (!isRecord(body)) return { history: null, note: "Upstream did not return a transcript object." };
  const rawList: unknown[] | null = Array.isArray(body.messages) ? body.messages : Array.isArray(body.history) ? body.history : null;
  if (!rawList) return { history: null, note: "Upstream exposed no transcript (no messages/history array)." };
  const history = rawList
    .map((entry): OpenClawWireMessage | null => {
      if (!isRecord(entry)) return null;
      const text = nonEmptyString(entry.text) ?? nonEmptyString(entry.content) ?? nonEmptyString(entry.message);
      if (!text) return null;
      const at = entry.atMs ?? entry.ts ?? entry.timestamp;
      const atMs = typeof at === "number" ? at : typeof at === "string" && !Number.isNaN(Date.parse(at)) ? Date.parse(at) : null;
      return { role: mapRole(entry.role), text, atMs };
    })
    .filter((m): m is OpenClawWireMessage => m !== null);
  return { history, note: null };
}

/**
 * GET — is there actually an AI to talk to, and does it publish a transcript?
 * Reachable requires the process to report live AND the chat route to exist. Anything short of that
 * answers 503 { error: "openclaw_unreachable" } with a detail that names which half failed, so the
 * console can say something true instead of "offline".
 */
export async function GET(req: Request) {
  // Owner-only buoy surface (morgan@mycosoft.org). Dev/LAN passes via the signed local-dev cookie.
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const { url: chatUrl, base, explicit, openAiShape } = resolveChat();
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (sessionId && !SESSION_ID_RE.test(sessionId)) {
    return NextResponse.json({ error: "invalid_request", detail: "sessionId must match [A-Za-z0-9._:-]{1,200}" }, { status: 400 });
  }

  // Two independent facts, probed in parallel: is the process alive, and does the chat route exist.
  const [health, options] = await Promise.all([
    probeFresh(`${base}/health`, { method: "GET" }, PROBE_ATTEMPTS, PROBE_TIMEOUT_MS),
    probeFresh(chatUrl, { method: "OPTIONS" }, PROBE_ATTEMPTS, PROBE_TIMEOUT_MS),
  ]);

  const processLive = health.answered && health.ok;
  const chatRoute = routeExists(options);

  if (!health.answered) {
    return unreachable(
      `No OpenClaw process answered at ${base}/health after ${PROBE_ATTEMPTS} fresh attempts (${health.error ?? "no response"}).`,
      chatUrl,
      { base, processLive: false, chatRouteExists: false },
    );
  }
  if (!processLive) {
    return unreachable(
      `OpenClaw at ${base} answered HTTP ${health.status} on /health: ${preview(health.body)}`,
      chatUrl,
      { base, processLive: false, chatRouteExists: chatRoute, healthStatus: health.status },
    );
  }
  if (!chatRoute) {
    // The most misleading state there is: the box is up and answers everything, but nothing can be
    // said to the droid. Name both halves so nobody reads "live" as "chat works".
    const hint = catchAllHint(options.body);
    return unreachable(
      `OpenClaw process is LIVE at ${base} (/health ok, ${health.ms}ms) but no chat endpoint is serving: OPTIONS ${chatUrl} → HTTP ${options.status ?? "no answer"}.${hint ? ` ${hint}` : ""}`,
      chatUrl,
      { base, processLive: true, chatRouteExists: false, chatStatus: options.status, health: health.body },
    );
  }

  // Transcript, only where one could plausibly exist. The OpenAI completions route is stateless and
  // POST-only, so asking it for history would be noise, not data.
  let history: OpenClawWireMessage[] | null = null;
  let historyNote: string | null = openAiShape
    ? "Chat endpoint is the stateless OpenAI-compatible route — it publishes no transcript; the console keeps its own."
    : null;
  if (!openAiShape) {
    const url = sessionId ? `${chatUrl}?sessionId=${encodeURIComponent(sessionId)}` : chatUrl;
    const res = await probeFresh(url, { method: "GET" }, PROBE_ATTEMPTS, PROBE_TIMEOUT_MS);
    if (res.answered && res.ok) {
      const norm = normalizeHistory(res.body);
      history = norm.history;
      historyNote = norm.note;
    } else {
      historyNote = res.answered ? `Upstream answered HTTP ${res.status} to the transcript request.` : `Transcript request failed: ${res.error ?? "no response"}`;
    }
  }

  return NextResponse.json({
    ok: true,
    reachable: true,
    upstream: chatUrl,
    base,
    explicitEndpoint: explicit,
    processLive: true,
    chatRouteExists: true,
    chatMethods: options.allow,
    healthMs: health.ms,
    health: health.body,
    sessionId: sessionId ?? null,
    history,
    historyNote,
    checkedAt: new Date().toISOString(),
  });
}

/**
 * POST — relay one operator message to the droid agent.
 * Success means the agent answered. Failure means the operator is told, plainly, that it did not.
 */
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

  const { url: chatUrl, base, openAiShape } = resolveChat();

  // Prove the route exists BEFORE sending. OPTIONS mutates nothing, and an unproven route means the
  // message is never sent — so the operator is never left guessing whether it half-landed.
  const pre = await probeFresh(chatUrl, { method: "OPTIONS" }, PROBE_ATTEMPTS, PROBE_TIMEOUT_MS);
  if (!pre.answered) {
    return unreachable(
      `OpenClaw unreachable at ${chatUrl} after ${PROBE_ATTEMPTS} fresh attempts (${pre.error ?? "no response"}) — message NOT sent.`,
      chatUrl,
      { base },
    );
  }
  if (!routeExists(pre)) {
    const hint = catchAllHint(pre.body);
    return unreachable(
      `No chat endpoint is serving at ${chatUrl} (OPTIONS → HTTP ${pre.status}).${hint ? ` ${hint}` : ""} Message NOT sent.`,
      chatUrl,
      { base, chatStatus: pre.status },
    );
  }

  const bodyForShape = (oa: boolean) =>
    JSON.stringify(
      oa
        ? { messages: [{ role: "user", content: message }], ...(sessionId ? { sessionId } : {}) }
        : sessionId
          ? { message, sessionId }
          : { message },
    );
  const initFor = (oa: boolean): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: bodyForShape(oa) });

  let target = chatUrl;
  let sent = await attempt(target, initFor(openAiShape), POST_TIMEOUT_MS);
  let attempts = 1;
  // One re-send ONLY when the transport died fast enough that no body can have been delivered.
  if (!sent.answered && sent.ms < STALL_RETRY_WINDOW_MS) {
    sent = await attempt(target, initFor(openAiShape), POST_TIMEOUT_MS);
    attempts = 2;
  }
  // A bespoke endpoint that turns out not to exist → try the OpenAI route once. 404/405 prove the
  // request was not accepted anywhere, so this cannot double-send. (Never triggered for a 5xx: that
  // is ambiguous, and re-sending an accepted message is worse than reporting the failure.)
  if (!openAiShape && sent.answered && (sent.status === 404 || sent.status === 405)) {
    const oaTarget = `${base}${OPENAI_CHAT_PATH}`;
    if (oaTarget !== target) {
      const oa = await attempt(oaTarget, initFor(true), POST_TIMEOUT_MS);
      attempts += 1;
      if (oa.answered) {
        target = oaTarget;
        sent = oa;
      }
    }
  }

  if (!sent.answered) {
    return unreachable(`OpenClaw did not answer (${sent.error ?? "no response"}) after ${sent.ms}ms — delivery unconfirmed.`, target, { base });
  }
  if (!sent.ok) {
    // Reachable but failing — a different fact from unreachable, and still no invented text.
    return NextResponse.json(
      {
        error: "openclaw_upstream_error",
        detail: `OpenClaw answered HTTP ${sent.status}: ${preview(sent.body)}`,
        upstream: target,
        status: sent.status,
        latencyMs: sent.ms,
        raw: sent.body,
      },
      { status: 502 },
    );
  }

  const { reply, note } = normalizeReply(sent.body);
  return NextResponse.json({
    ok: true,
    upstream: target,
    sessionId,
    status: sent.status,
    latencyMs: sent.ms,
    attempts,
    reply,
    note,
    raw: sent.body,
    receivedAt: new Date().toISOString(),
  });
}
