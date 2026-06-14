import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { fetchMindexWithAuthRetry } from "@/lib/mindex-bff-auth"
import { SINE_VISUALISATION_QUALITY } from "@/lib/mindex/sine-contract"

export const dynamic = "force-dynamic"

function withSineVisualisationDefaults(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.searchParams)
  for (const [key, value] of Object.entries(SINE_VISUALISATION_QUALITY)) {
    if (!params.has(key)) params.set(key, String(value))
  }
  if (!params.has("waveform_points")) params.set("waveform_points", String(SINE_VISUALISATION_QUALITY.max_waveform_points))
  if (!params.has("spec_time_bins")) params.set("spec_time_bins", String(SINE_VISUALISATION_QUALITY.max_time_frames))
  if (!params.has("spec_freq_bins")) params.set("spec_freq_bins", String(SINE_VISUALISATION_QUALITY.max_frequency_bins))
  if (!params.has("n_fft")) params.set("n_fft", String(SINE_VISUALISATION_QUALITY.fft_size))
  if (!params.has("quality")) params.set("quality", "oscilloscope")
  if (!params.has("ignore_saved_visualisation")) params.set("ignore_saved_visualisation", "true")
  if (!params.has("include_waveform")) params.set("include_waveform", "true")
  if (!params.has("include_spectrogram")) params.set("include_spectrogram", "true")
  if (!params.has("include_peaks")) params.set("include_peaks", "true")
  return params.toString()
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const base = env.mindexApiBaseUrl.replace(/\/$/, "")
  const qs = withSineVisualisationDefaults(request)
  try {
    const res = await fetchMindexWithAuthRetry(
      `${base}/api/mindex/sine/blobs/${encodeURIComponent(id)}/visualisation${qs ? `?${qs}` : ""}`,
      { cache: "no-store", signal: AbortSignal.timeout(60_000) },
    )
    const body = await res.text()
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (event) {
    return NextResponse.json(
      {
        ok: false,
        status: "visualisation_unavailable",
        message: event instanceof Error ? event.message : "SINE visualisation request did not complete.",
      },
      { status: 502 },
    )
  }
}
