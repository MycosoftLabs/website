import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://192.168.0.189:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

interface FCINoteRequest {
  deviceId?: string
  notes?: string
  timestamp?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FCINoteRequest
    const noteText = (body.notes || "").trim()
    const deviceId = (body.deviceId || "").trim() || "unknown-device"

    if (!noteText)
      return NextResponse.json({ error: "notes is required" }, { status: 400 })

    const noteTimestamp = body.timestamp || new Date().toISOString()
    const eventId = `fci-note-${deviceId}-${Date.now()}`
    const notePreview = noteText.length > 140 ? `${noteText.slice(0, 137)}...` : noteText

    const payload = {
      events: [
        {
          id: eventId,
          type: "biological",
          title: `FCI Experiment Note (${deviceId})`,
          description: notePreview,
          severity: "info",
          timestamp: noteTimestamp,
          location: {
            lat: 0,
            lng: 0,
            name: "fci-lab-session",
          },
          source: "fungi-compute",
          indexed: true,
          metadata: {
            category: "fci_note",
            device_id: deviceId,
            notes: noteText,
            recorded_at: noteTimestamp,
          },
        },
      ],
      metadata: {
        registered_at: new Date().toISOString(),
        batch_size: 1,
      },
    }

    const response = await fetch(`${MINDEX_API_URL}/api/mindex/crep/events/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINDEX_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `Failed to persist note to MINDEX: ${errorText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      deviceId,
      eventId,
      persistedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[FCI Notes] Persist failed:", error)
    return NextResponse.json(
      { error: "Failed to save FCI note" },
      { status: 500 }
    )
  }
}
