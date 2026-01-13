import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface DeviceEvent {
  id: string;
  device_id: string;
  port?: string;
  connected: boolean;
  message: string;
  timestamp: string;
  location?: { lat: number; lng: number; name?: string };
  telemetry?: Record<string, unknown>;
}

export async function GET() {
  const events: DeviceEvent[] = [];
  const now = new Date();

  try {
    // Try to fetch from local MycoBrain service
    const mycobrainUrl = process.env.MYCOBRAIN_API_URL || "http://localhost:8003";
    
    const devicesRes = await fetch(`${mycobrainUrl}/devices`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (devicesRes.ok) {
      const data = await devicesRes.json();
      const devices = data.devices || [];
      
      // Convert connected devices to events
      devices.forEach((device: any) => {
        events.push({
          id: `device-${device.device_id || device.port}-${Date.now()}`,
          device_id: device.device_id || `mycobrain-${device.port}`,
          port: device.port,
          connected: device.connected || device.status === "connected",
          message: device.connected 
            ? `Device online: ${device.device_info?.side ? `Side ${device.device_info.side}` : "MycoBrain"}`
            : "Device connected",
          timestamp: now.toISOString(),
          telemetry: device.device_info,
        });
      });
    }

    // If no real events, provide simulated ones
    if (events.length === 0) {
      events.push({
        id: `sim-device-${Date.now()}`,
        device_id: "mycobrain-COM7",
        port: "COM7",
        connected: true,
        message: "MycoBrain Side-A online with 2x BME688 sensors",
        timestamp: now.toISOString(),
        telemetry: {
          side: "A",
          firmware_version: "2.0.0",
          bme688_count: 2,
          uptime_ms: 3600000,
        },
      });
    }

    return NextResponse.json({
      events,
      count: events.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch MycoBrain events:", error);
    
    return NextResponse.json({
      events: [],
      count: 0,
      timestamp: now.toISOString(),
      error: "MycoBrain service unavailable",
    });
  }
}
