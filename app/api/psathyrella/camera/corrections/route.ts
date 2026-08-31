/**
 * POST/GET /api/psathyrella/camera/corrections — the operator-correction capture log.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The detector on the buoy is a FROZEN, general-purpose COCO-80 model (ultralytics yolo11n, CPU, no
 * tracker). COCO has no maritime vocabulary: at sea it fires "bottle" on the buoy's own tower hardware
 * and "toilet"/"couch"/"tv"/"vase" on dock scenery. The ontology layer hides that from the operator's
 * screen, but hiding a wrong label is not the same as fixing it — today every judgement the pilot makes
 * ("that is a channel marker, not a bottle") is thrown away the moment the next 1 Hz frame arrives.
 *
 * The pilot watching the feed is the ONLY reliable maritime labeler in this system. This route turns
 * each of those judgements into a durable, append-only training example — a real label on a real frame
 * from the real deployment environment, with the source geometry and true bearing attached. That is
 * precisely the input an Autodistill / YOLO fine-tune pipeline needs, and it is the only route by which
 * a maritime dataset for these optics can come into existence: nobody is going to hand us a labeled
 * corpus of THIS tower, in THIS harbor, at THIS mounting height.
 *
 * STATE PLAINLY: this endpoint CAPTURES data. It does not make the live model better. Nothing written
 * here changes inference on the Jetson. The model only improves after a human runs an offline
 * fine-tune/distill on this export and deploys new weights. No claim beyond capture may be made of it.
 *
 * STORAGE: append-only JSONL + sibling image crops in a gitignored local dir (see
 * PSATHYRELLA_CORRECTIONS_DIR, default `<repo>/.psathyrella/corrections`). Append-only because a
 * capture log that can be rewritten is a capture log that can silently lose evidence; and local-only
 * because the crops are imagery of the deployment environment.
 *
 * Owner-gated on BOTH verbs, like the rest of the buoy surface.
 */

import { NextResponse } from "next/server";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireOwner } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";
// fs writes — this route cannot run on the edge runtime.
export const runtime = "nodejs";

const LOG_NAME = "corrections.jsonl";

/** Geometry provenance must match DetectionSource in lib/psathyrella/targetTracking.ts — a bogus
 *  source would make the recorded bearing/box un-reprojectable later, i.e. a dead training row. */
const SOURCES = new Set(["quad360", "front", "pano", "bev"]);

/** Data-URL prefixes we accept, mapped to the extension + magic bytes we then VERIFY against. A
 *  mislabeled blob (png bytes claiming jpeg) would poison an image-loader in the training pipeline. */
const IMAGE_KINDS: Array<{ prefix: string; ext: string; magic: number[] }> = [
  { prefix: "data:image/jpeg;base64,", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { prefix: "data:image/png;base64,", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
];

const MAX_SNAPSHOT_CHARS = 4 * 1024 * 1024; // ~4 MB of data-URL text
const MAX_BODY_CHARS = 6 * 1024 * 1024; // snapshot + the small JSON envelope around it
const MAX_NOTE_CHARS = 2000;
const MAX_LABEL_CHARS = 64;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/** Correction as it is persisted. One JSON object per line. */
interface StoredCorrection {
  id: string;
  atIso: string;
  feedId: string;
  source: string;
  tMs: number;
  rawClass: string;
  correctedLabel: string;
  bbox: { x: number; y: number; w: number; h: number };
  frameW: number;
  frameH: number;
  bearingTrueDeg: number | null;
  note: string | null;
  /** Relative filename of the sibling crop, or null when no usable image was supplied/writable. */
  snapshotFile: string | null;
}

function correctionsDir(): string {
  const configured = process.env.PSATHYRELLA_CORRECTIONS_DIR;
  if (configured && configured.trim()) return path.resolve(configured.trim());
  return path.join(process.cwd(), ".psathyrella", "corrections");
}

function isMissing(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ENOENT";
}

function bad(field: string, why: string) {
  return NextResponse.json({ error: "invalid_correction", field, detail: why }, { status: 400 });
}

/** Control characters would corrupt a JSONL line's readability and have no place in a label. */
const CTRL = /[\u0000-\u001f\u007f]/;

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function finite(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function POST(req: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  // Refuse on the declared size before reading a byte. Without this the cap below is enforced only
  // AFTER the whole body has been buffered into memory, so the limit protects the parser but not the
  // process. Content-Length is absent on chunked uploads, hence the post-read check stays as the
  // authoritative one — this is the cheap early-out, not a replacement for it.
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "body_too_large", maxChars: MAX_BODY_CHARS }, { status: 413 });
  }

  // Read as text first so an oversized body is rejected before it is parsed into memory as JSON.
  let text: string;
  try {
    text = await req.text();
  } catch {
    return NextResponse.json({ error: "unreadable_body" }, { status: 400 });
  }
  if (text.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "body_too_large", maxChars: MAX_BODY_CHARS }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = asRecord(parsed);
  if (!body) return bad("body", "expected a JSON object");

  // Reject unknown keys rather than dropping them: a caller that thought it was recording an extra
  // field deserves a hard error, not a training row that silently lost it.
  const ALLOWED = new Set([
    "feedId", "source", "tMs", "rawClass", "correctedLabel", "bbox",
    "frameW", "frameH", "bearingTrueDeg", "note", "snapshotDataUrl",
  ]);
  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) return bad(key, "unknown field");
  }

  // ── feedId / source ──
  const feedId = typeof body.feedId === "string" ? body.feedId.trim() : "";
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(feedId)) return bad("feedId", "expected 1-32 chars [a-z0-9_-]");
  const source = typeof body.source === "string" ? body.source.trim() : "";
  if (!SOURCES.has(source)) return bad("source", `expected one of ${[...SOURCES].join("|")}`);

  // ── tMs: the frame time the correction refers to. The CALLER must state it; the server never
  // defaults it to "now", because a server-invented timestamp is indistinguishable from a real one and
  // would silently break any later join against recorded telemetry. Note that a caller which does not
  // hold the Jetson inference clock (e.g. useCorrections) supplies BROWSER submit time instead, which
  // at the 1 Hz detection poll trails the frame by up to ~1-2 s — `atIso` below is the server's own
  // receipt time, so the two together bound the real frame instant. ──
  const tMs = finite(body.tMs);
  if (tMs === null || tMs <= 0) return bad("tMs", "expected a positive finite epoch-ms number");

  // ── labels ──
  const rawClass = typeof body.rawClass === "string" ? body.rawClass.trim() : "";
  if (!rawClass || rawClass.length > MAX_LABEL_CHARS || CTRL.test(rawClass)) {
    return bad("rawClass", `expected 1-${MAX_LABEL_CHARS} printable chars`);
  }
  const correctedLabel = typeof body.correctedLabel === "string" ? body.correctedLabel.trim() : "";
  if (!correctedLabel || correctedLabel.length > MAX_LABEL_CHARS || CTRL.test(correctedLabel)) {
    return bad("correctedLabel", `expected 1-${MAX_LABEL_CHARS} printable chars`);
  }

  // ── bbox: normalized source-frame space, same convention as CameraDetection.bbox ──
  const rawBox = asRecord(body.bbox);
  if (!rawBox) return bad("bbox", "expected an object { x, y, w, h }");
  const x = finite(rawBox.x), y = finite(rawBox.y), w = finite(rawBox.w), h = finite(rawBox.h);
  if (x === null || y === null || w === null || h === null) return bad("bbox", "x/y/w/h must be finite numbers");
  if (x < 0 || x > 1 || y < 0 || y > 1) return bad("bbox", "x/y must be normalized 0..1");
  if (w <= 0 || w > 1 || h <= 0 || h > 1) return bad("bbox", "w/h must be normalized (0..1]");
  // NOTE: x+w > 1 is deliberately allowed — an object running off the frame edge is a legitimate,
  // common maritime observation. We record it as given; clamping here would be silent coercion.

  const frameW = finite(body.frameW);
  const frameH = finite(body.frameH);
  if (frameW === null || !Number.isInteger(frameW) || frameW <= 0) return bad("frameW", "expected a positive integer");
  if (frameH === null || !Number.isInteger(frameH) || frameH <= 0) return bad("frameH", "expected a positive integer");

  // ── bearingTrueDeg: optional. Out-of-range is rejected, not wrapped — a wrapped bearing on an
  // operator console is exactly the kind of quiet fix that turns into a wrong maneuver. ──
  let bearingTrueDeg: number | null = null;
  if (body.bearingTrueDeg !== undefined && body.bearingTrueDeg !== null) {
    const b = finite(body.bearingTrueDeg);
    if (b === null || b < 0 || b >= 360) return bad("bearingTrueDeg", "expected 0..<360, or null");
    bearingTrueDeg = b;
  }

  let note: string | null = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string") return bad("note", "expected a string");
    if (body.note.length > MAX_NOTE_CHARS) return bad("note", `max ${MAX_NOTE_CHARS} chars`);
    const trimmed = body.note.trim();
    note = trimmed ? trimmed : null;
  }

  // ── snapshot: optional data URL, decoded to a sibling file ──
  let imageBytes: Buffer | null = null;
  let imageExt = "";
  if (body.snapshotDataUrl !== undefined && body.snapshotDataUrl !== null) {
    const url = body.snapshotDataUrl;
    if (typeof url !== "string") return bad("snapshotDataUrl", "expected a data: URL string");
    if (url.length > MAX_SNAPSHOT_CHARS) {
      return NextResponse.json(
        { error: "snapshot_too_large", field: "snapshotDataUrl", maxChars: MAX_SNAPSHOT_CHARS },
        { status: 413 },
      );
    }
    const kind = IMAGE_KINDS.find((k) => url.startsWith(k.prefix));
    if (!kind) return bad("snapshotDataUrl", "expected a data:image/jpeg;base64, or data:image/png;base64, URL");
    const b64 = url.slice(kind.prefix.length);
    // Buffer.from(..., "base64") silently ignores junk, so validate the alphabet explicitly first.
    if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return bad("snapshotDataUrl", "malformed base64 payload");
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0) return bad("snapshotDataUrl", "empty image payload");
    if (!kind.magic.every((byte, i) => buf[i] === byte)) {
      return bad("snapshotDataUrl", "image bytes do not match the declared content type");
    }
    imageBytes = buf;
    imageExt = kind.ext;
  }

  // ── persist ──
  const dir = correctionsDir();
  const id = crypto.randomUUID();
  // Defense in depth: the filename is derived ONLY from a generated uuid, never from caller input, and
  // is re-checked here so no future edit can make a caller-controlled path reachable.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ error: "id_generation_failed" }, { status: 500 });
  }

  try {
    await mkdir(dir, { recursive: true });
  } catch {
    return NextResponse.json({ error: "corrections_dir_unwritable", dir }, { status: 500 });
  }

  // Write the crop BEFORE the log line, so the log can never reference a file that is not on disk.
  let snapshotFile: string | null = null;
  let snapshotError: string | null = null;
  if (imageBytes) {
    const name = `${id}.${imageExt}`;
    try {
      await writeFile(path.join(dir, name), imageBytes, { flag: "wx" });
      snapshotFile = name;
    } catch {
      // A failed image write must NOT lose the correction — the label is the valuable part.
      snapshotError = "snapshot_write_failed";
    }
  }

  const record: StoredCorrection = {
    id,
    atIso: new Date().toISOString(),
    feedId,
    source,
    tMs,
    rawClass,
    correctedLabel,
    bbox: { x, y, w, h },
    frameW,
    frameH,
    bearingTrueDeg,
    note,
    snapshotFile,
  };

  try {
    // JSON.stringify escapes newlines, so one record is always exactly one line.
    await appendFile(path.join(dir, LOG_NAME), `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    return NextResponse.json({ error: "correction_write_failed", dir }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, snapshotFile, snapshotError }, { status: 201 });
}

export async function GET(req: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const logPath = path.join(correctionsDir(), LOG_NAME);

  // Raw export for a training pipeline: byte-for-byte what was captured.
  if (url.searchParams.get("format") === "jsonl") {
    let raw = "";
    try {
      raw = await readFile(logPath, "utf8");
    } catch (err) {
      // Nothing captured yet is an honest empty export, not a server error.
      if (!isMissing(err)) return NextResponse.json({ error: "corrections_read_failed" }, { status: 500 });
    }
    return new NextResponse(raw, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="${LOG_NAME}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  let raw = "";
  try {
    raw = await readFile(logPath, "utf8");
  } catch (err) {
    if (isMissing(err)) return NextResponse.json({ count: 0, corrections: [] });
    return NextResponse.json({ error: "corrections_read_failed" }, { status: 500 });
  }

  const corrections: StoredCorrection[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const rec = JSON.parse(t) as StoredCorrection;
      if (rec && typeof rec.id === "string") corrections.push(rec);
    } catch {
      // A torn final line (process killed mid-append) or a hand-edit — skip it rather than 500.
    }
  }
  corrections.reverse(); // newest first

  // `count` is the TOTAL captured, not the length of the returned page — the UI shows it as
  // "N corrections captured", which must not shrink because someone asked for ?limit=10.
  return NextResponse.json({ count: corrections.length, corrections: corrections.slice(0, limit) });
}
