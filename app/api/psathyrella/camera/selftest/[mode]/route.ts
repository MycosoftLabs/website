/**
 * GET /api/psathyrella/camera/_selftest/:mode  (mode = quad | single)  — DEV/DEMO ONLY
 *
 * A self-contained animated MJPEG (multipart/x-mixed-replace) test pattern rendered with sharp, to
 * PROVE the GCS camera pipeline (the same-origin `<img>` MJPEG path) renders a live feed with NO
 * browser camera permission — before the real Jetson Arducam feeds are up. It is a **test pattern**,
 * never real camera data, and is hard-gated behind `PSATHYRELLA_CAM_SELFTEST=1` (404 otherwise) AND
 * owner auth, so it can never surface as a buoy feed. Delete the env flag to revert to honest offline.
 *
 *  - quad   = a 2x2 composite (BOW/STBD/AFT/PORT quadrants) so Quad360View's tile-crop shows 4 tiles.
 *  - single = one framed view for the Target tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/api-auth";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const W = 640, H = 480;
const BOUNDARY = "psathyrellaselftest";

function frameSvg(mode: string, t: number, ts: string): string {
  if (mode === "quad") {
    const cells = [
      { x: 0, y: 0, c: "#0e3a5f", label: "BOW" },
      { x: W / 2, y: 0, c: "#3f1d5f", label: "STBD" },
      { x: 0, y: H / 2, c: "#5f3a0e", label: "AFT" },
      { x: W / 2, y: H / 2, c: "#0e5f3a", label: "PORT" },
    ];
    const dx = (Math.sin(t / 6) * 0.4 + 0.5) * (W / 2 - 40) + 20;
    const rects = cells.map((c) => `
      <rect x="${c.x}" y="${c.y}" width="${W / 2}" height="${H / 2}" fill="${c.c}"/>
      <text x="${c.x + 16}" y="${c.y + 36}" fill="#9feaff" font-family="monospace" font-size="24" font-weight="bold">${c.label}</text>
      <circle cx="${c.x + dx}" cy="${c.y + H / 4}" r="12" fill="#22d3ee"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${rects}
      <line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" stroke="#000a" stroke-width="3"/>
      <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#000a" stroke-width="3"/>
      <text x="${W / 2}" y="${H - 14}" fill="#fff" font-family="monospace" font-size="15" text-anchor="middle">GCS 360° PIPELINE TEST · ${ts}</text></svg>`;
  }
  const bx = (Math.sin(t / 6) * 0.4 + 0.5) * (W - 60) + 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#08131f"/>
    <rect x="0" y="${H / 2 - 3}" width="${W}" height="6" fill="#12324a"/>
    <circle cx="${bx}" cy="${H / 2}" r="20" fill="#22d3ee"/>
    <text x="${W / 2}" y="64" fill="#9feaff" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle">TARGET PIPELINE TEST</text>
    <text x="${W / 2}" y="${H - 22}" fill="#fff" font-family="monospace" font-size="17" text-anchor="middle">MJPEG in &lt;img&gt; · no camera permission · ${ts}</text></svg>`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ mode: string }> }) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  if (process.env.PSATHYRELLA_CAM_SELFTEST !== "1") {
    return NextResponse.json({ error: "selftest_disabled", hint: "set PSATHYRELLA_CAM_SELFTEST=1" }, { status: 404 });
  }
  const { mode } = await params;
  const m = mode === "quad" ? "quad" : "single";

  const enc = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      req.signal.addEventListener("abort", () => { closed = true; });
      let t = 0;
      while (!closed && !req.signal.aborted) {
        try {
          const ts = new Date().toISOString().slice(11, 23);
          const jpeg = await sharp(Buffer.from(frameSvg(m, t++, ts))).jpeg({ quality: 72 }).toBuffer();
          controller.enqueue(enc.encode(`--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`));
          controller.enqueue(new Uint8Array(jpeg));
          controller.enqueue(enc.encode("\r\n"));
        } catch { break; }
        await new Promise((r) => setTimeout(r, 120)); // ~8 fps
      }
      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Accel-Buffering": "no",
    },
  });
}
