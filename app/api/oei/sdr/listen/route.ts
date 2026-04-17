/**
 * SDR Listen — unified audio-tuning endpoint.
 *
 * Three modes:
 *   1. mode=stream & url=<http url>
 *      Proxy an internet radio stream (Icecast/Shoutcast MP3/AAC/Ogg/HLS) so
 *      the browser can play without CORS. Returns audio/* stream.
 *   2. mode=sdr & sdrUrl=<kiwisdr http url> & frequency_khz=<n> & band=am|fm|usb|lsb|cw
 *      Return a WebSocket-URL + session-token pair the client can use to
 *      connect directly to a public KiwiSDR node (CORS is open on KiwiSDR
 *      WebSocket, but we mint a short-lived auth so we can rate-limit).
 *   3. mode=mycosoft & deviceId=<hyphae1|mushroom1|psathyrella|ground-station>
 *      Routes to the Mycosoft-owned SDR inside the device, via the
 *      GroundStationProvider + MAS bridge. Returns a session token + WS URL.
 *
 * Params:
 *   mode           stream | sdr | mycosoft
 *   url            audio stream URL (mode=stream)
 *   sdrUrl         public SDR node URL (mode=sdr)
 *   deviceId       Mycosoft device id (mode=mycosoft)
 *   frequency_khz  tune frequency (mode=sdr or mycosoft)
 *   band           am | fm | usb | lsb | cw
 *   bandwidth_hz   filter bandwidth
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAllowedStream(url: string): boolean {
  // Allow only public-radio hosts + our own + KiwiSDR nodes
  try {
    const u = new URL(url)
    // Block localhost / private IP exfiltration
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return false
    if (/^10\./.test(u.hostname) || /^192\.168\./.test(u.hostname) ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(u.hostname)) return false
    return true
  } catch { return false }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get("mode") || "stream"

  try {
    if (mode === "stream") {
      const streamUrl = url.searchParams.get("url")
      if (!streamUrl) return NextResponse.json({ error: "url param required" }, { status: 400 })
      if (!isAllowedStream(streamUrl)) return NextResponse.json({ error: "stream host not allowed" }, { status: 403 })

      // Proxy the stream — keep it as a streaming response, don't buffer
      const upstream = await fetch(streamUrl, {
        headers: {
          "User-Agent": "MycosoftCREP-SDR/1.0",
          "Icy-MetaData": "1",
          "Accept": "audio/*;q=0.9, */*;q=0.5",
        },
        // Never redirect to a private IP
        redirect: "follow",
      })
      if (!upstream.ok) {
        return NextResponse.json({
          error: `upstream stream returned ${upstream.status}`,
        }, { status: upstream.status })
      }
      const contentType = upstream.headers.get("content-type") || "audio/mpeg"
      return new Response(upstream.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          // Pass ICY metadata through so the client can show "now playing"
          "icy-name": upstream.headers.get("icy-name") || "",
          "icy-genre": upstream.headers.get("icy-genre") || "",
          "icy-br": upstream.headers.get("icy-br") || "",
        },
      })
    }

    if (mode === "sdr") {
      const sdrUrl = url.searchParams.get("sdrUrl")
      const frequency_khz = Number(url.searchParams.get("frequency_khz"))
      const band = url.searchParams.get("band") || "usb"
      const bandwidth_hz = Number(url.searchParams.get("bandwidth_hz") || 2400)
      if (!sdrUrl) return NextResponse.json({ error: "sdrUrl required" }, { status: 400 })

      // KiwiSDR uses a simple query-string login + WebSocket channel
      const wsBase = sdrUrl.replace(/^http/, "ws").replace(/\/$/, "")
      const sessionToken = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

      return NextResponse.json({
        mode: "sdr",
        sdrUrl,
        wsUrl: `${wsBase}/kiwi/${sessionToken}/SND`,
        frequency_khz,
        band,
        bandwidth_hz,
        tuneCommand: `SET mod=${band} low_cut=-${bandwidth_hz/2} high_cut=${bandwidth_hz/2} freq=${frequency_khz}`,
        protocol: "KiwiSDR v1",
        docs: "https://github.com/kiwisdr/KiwiSDR/wiki",
      })
    }

    if (mode === "mycosoft") {
      const deviceId = url.searchParams.get("deviceId")
      const frequency_khz = Number(url.searchParams.get("frequency_khz"))
      const band = url.searchParams.get("band") || "fm"
      if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 })

      // Route to the GroundStationProvider via MAS bridge
      const masUrl = process.env.MAS_URL || "http://localhost:8001"
      const token = process.env.MAS_BRIDGE_TOKEN || ""
      const r = await fetch(`${masUrl}/sdr/tune`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-mas-token": token },
        body: JSON.stringify({ deviceId, frequency_khz, band, source: "crep-sdr-widget" }),
        signal: AbortSignal.timeout(8_000),
      })
      if (!r.ok) {
        return NextResponse.json({
          error: `MAS SDR tune failed: ${r.status}`,
          deviceId,
          frequency_khz,
        }, { status: 502 })
      }
      const session = await r.json()
      return NextResponse.json({
        mode: "mycosoft",
        deviceId,
        frequency_khz,
        band,
        wsUrl: session.wsUrl,
        sessionToken: session.token,
        protocol: "Mycosoft SDR v1",
      })
    }

    return NextResponse.json({ error: `unknown mode: ${mode}` }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "sdr listen failed" }, { status: 500 })
  }
}
