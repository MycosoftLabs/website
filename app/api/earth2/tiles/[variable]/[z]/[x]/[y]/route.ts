/**
 * Earth-2 Weather Tile Generator
 * February 5, 2026
 * 
 * Returns weather visualization tiles for MapLibre
 * Uses MAS real tiles with cached-real fallback only
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedReal, normalizeError, setCachedReal } from "../../../../../_lib/real-cache";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ variable: string; z: string; x: string; y: string }> }
) {
  const { variable, z, x, y } = await params;
  const { searchParams } = new URL(request.url);
  const cacheKey = `earth2:tile:${variable}:${z}:${x}:${y}:${searchParams.toString()}`;

  try {
    const upstreamPath = `/api/earth2/tiles/${variable}/${z}/${x}/${y}`;
    const upstreamUrl = `${MAS_API_URL}${upstreamPath}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await fetch(upstreamUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`MAS tile status ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    setCachedReal(
      cacheKey,
      { bodyBase64: buffer.toString("base64"), contentType },
      { ttlMs: 5 * 60 * 1000, headers: { "content-type": contentType } },
    );
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=120",
      },
    });
  } catch (error) {
    const cached = getCachedReal(cacheKey);
    if (cached && typeof cached.body === "object" && cached.body !== null) {
      const bodyObj = cached.body as { bodyBase64?: string; contentType?: string };
      if (bodyObj.bodyBase64) {
        return new NextResponse(Buffer.from(bodyObj.bodyBase64, "base64"), {
          headers: {
            "Content-Type": bodyObj.contentType || "application/octet-stream",
            "X-Data-Source": "cached_real",
            "Cache-Control": "public, max-age=60",
          },
        });
      }
    }

    return new NextResponse(`Earth-2 tile unavailable: ${normalizeError(error)}`, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
