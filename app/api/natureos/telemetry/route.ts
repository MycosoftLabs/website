import { NextRequest, NextResponse } from "next/server";

function buildUpstreamUrl(request: NextRequest, baseUrl: string) {
  const upstream = new URL("/api/telemetry/devices/latest", baseUrl);
  const incoming = new URL(request.url);
  upstream.search = incoming.search;
  return upstream.toString();
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.MINDEX_API_URL || process.env.MINDEX_API_BASE_URL;
  const apiKey = process.env.MINDEX_API_KEY;
  if (!baseUrl)
    return NextResponse.json(
      { error: "MINDEX_API_URL is not configured" },
      { status: 500 }
    );
  if (!apiKey)
    return NextResponse.json(
      { error: "MINDEX_API_KEY is not configured" },
      { status: 500 }
    );

  try {
    const response = await fetch(buildUpstreamUrl(request, baseUrl), {
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      cache: "no-store",
    });

    if (!response.ok)
      return NextResponse.json(
        { error: "MINDEX telemetry unavailable" },
        { status: response.status }
      );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("NatureOS telemetry proxy error:", error);
    return NextResponse.json(
      { error: "Telemetry proxy failed" },
      { status: 500 }
    );
  }
}
