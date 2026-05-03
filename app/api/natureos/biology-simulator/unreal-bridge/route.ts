import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Real config only — no fake stream URLs. Frontend reads this for feature-flag UX.
 */
export async function GET() {
  const pixelStreamUrl =
    process.env.UNREAL_PIXEL_STREAM_URL ||
    process.env.NEXT_PUBLIC_UNREAL_PIXEL_STREAM_URL ||
    ""
  const signalingUrl =
    process.env.UNREAL_SIGNALING_URL || process.env.NEXT_PUBLIC_UNREAL_SIGNALING_URL || ""

  const enabled = Boolean(pixelStreamUrl.trim())

  return NextResponse.json({
    bridge: "unreal_pixel_streaming",
    enabled,
    pixelStreamUrl: enabled ? pixelStreamUrl : null,
    signalingUrl: signalingUrl.trim() || null,
    message: enabled
      ? "Unreal bridge URLs are configured — connect a running Pixel Streaming deployment."
      : "No UNREAL_PIXEL_STREAM_URL — Biology Simulator shows roadmap-only until ops wires streaming.",
  })
}
