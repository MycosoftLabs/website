import { NextResponse } from "next/server";

/**
 * WiFiSense API - Mock endpoint for WiFi-based presence sensing
 * 
 * GET: Retrieve current WiFiSense status and zone configurations
 * POST: Update settings or submit RSSI readings
 */

// In-memory state for demo purposes
let wifisenseEnabled = true;
let processingMode = "phase0";

const mockZones = [
  {
    zone_id: "main-lab",
    name: "Main Laboratory",
    devices: ["myco-001", "myco-002", "spore-001"],
    presence_threshold: -70,
    motion_sensitivity: 0.5,
    enabled: true,
  },
  {
    zone_id: "g-room-1",
    name: "Grow Room 1",
    devices: ["spore-002", "spore-003"],
    presence_threshold: -65,
    motion_sensitivity: 0.7,
    enabled: true,
  },
];

function generatePresenceEvents() {
  const states = ["present", "absent", "entering", "leaving", "unknown"] as const;
  return mockZones.map((zone) => ({
    zone_id: zone.zone_id,
    state: states[Math.floor(Math.random() * 3)] as (typeof states)[number], // Bias toward present/absent
    confidence: 0.6 + Math.random() * 0.4,
    last_updated: new Date().toISOString(),
  }));
}

function generateMotionEvents() {
  const levels = ["none", "low", "medium", "high"] as const;
  return mockZones.map((zone) => ({
    zone_id: zone.zone_id,
    level: levels[Math.floor(Math.random() * 4)] as (typeof levels)[number],
    variance: Math.random() * 10,
    last_updated: new Date().toISOString(),
  }));
}

export async function GET() {
  const presenceEvents = generatePresenceEvents();
  const motionEvents = generateMotionEvents();

  return NextResponse.json({
    enabled: wifisenseEnabled,
    processing_mode: processingMode,
    zones: mockZones,
    zones_count: mockZones.length,
    devices_count: mockZones.reduce((acc, z) => acc + z.devices.length, 0),
    presence_events: presenceEvents,
    motion_events: motionEvents,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "set_enabled") {
      wifisenseEnabled = !!body.enabled;
      return NextResponse.json({ success: true, enabled: wifisenseEnabled });
    }

    if (body.action === "set_mode") {
      processingMode = body.mode || "phase0";
      return NextResponse.json({ success: true, mode: processingMode });
    }

    // Handle RSSI reading submission
    if (body.readings) {
      // In a real implementation, this would process the readings
      // and update presence/motion detection state
      console.log("Received RSSI readings:", body.readings.length);
      return NextResponse.json({ 
        success: true, 
        processed: body.readings.length,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("WiFiSense API error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
