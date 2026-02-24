/**
 * Mycorrhizae Protocol API Proxy
 *
 * Proxies requests to the Mycorrhizae API (port 8002) for channel subscribe,
 * publish, and streaming. Uses MYCORRHIZAE_API_URL from env.
 */

import { NextRequest, NextResponse } from "next/server";

const MYCORRHIZAE_URL =
  process.env.MYCORRHIZAE_API_URL || "http://192.168.0.187:8002";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path?.join("/") || "";
  const url = new URL(request.url);
  const search = url.searchParams.toString();
  const target = `${MYCORRHIZAE_URL}/api/${pathStr}${search ? `?${search}` : ""}`;
  try {
    const apiKey = request.headers.get("X-API-Key") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["X-API-Key"] = apiKey;
    const res = await fetch(target, { headers });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Mycorrhizae proxy error", detail: String(e) },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path?.join("/") || "";
  const target = `${MYCORRHIZAE_URL}/api/${pathStr}`;
  try {
    const apiKey = request.headers.get("X-API-Key") || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["X-API-Key"] = apiKey;
    const body = await request.text();
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: body || undefined,
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Mycorrhizae proxy error", detail: String(e) },
      { status: 502 }
    );
  }
}
