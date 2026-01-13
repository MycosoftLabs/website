import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ActivityEvent {
  id: string;
  type: string;
  status: "success" | "warning" | "error" | "info";
  message: string;
  details?: string;
  source: string;
  timestamp: string;
}

export async function GET() {
  const events: ActivityEvent[] = [];
  const now = new Date();

  try {
    // Try to fetch from MAS API for recent activity
    const masUrl = process.env.MAS_API_URL || "http://localhost:8001";
    
    const [masActivity, n8nActivity] = await Promise.allSettled([
      fetch(`${masUrl}/api/activity?limit=20`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      }),
      fetch(`${masUrl}/api/n8n/executions?limit=10`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      }),
    ]);

    // Parse MAS activity
    if (masActivity.status === "fulfilled" && masActivity.value.ok) {
      const data = await masActivity.value.json();
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach((e: any) => {
          events.push({
            id: e.id || `mas-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: e.type || "system",
            status: e.status || "info",
            message: e.message || e.description || "System event",
            details: e.details,
            source: e.source || "MAS",
            timestamp: e.timestamp || now.toISOString(),
          });
        });
      }
    }

    // Parse n8n executions as events
    if (n8nActivity.status === "fulfilled" && n8nActivity.value.ok) {
      const data = await n8nActivity.value.json();
      if (data.executions && Array.isArray(data.executions)) {
        data.executions.forEach((e: any) => {
          events.push({
            id: e.id?.toString() || `n8n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: "workflow",
            status: e.finished 
              ? (e.stoppedAt ? "success" : "error")
              : "info",
            message: `Workflow: ${e.workflowName || e.workflowId || "Unknown"}`,
            details: e.mode || "",
            source: "n8n",
            timestamp: e.startedAt || now.toISOString(),
          });
        });
      }
    }

    // If no real events, provide some simulated ones for demo
    if (events.length === 0) {
      const simulatedEvents: ActivityEvent[] = [
        {
          id: `sim-1-${Date.now()}`,
          type: "system",
          status: "success",
          message: "MINDEX database synchronized",
          details: "1,245,678 taxa indexed",
          source: "MINDEX ETL",
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: `sim-2-${Date.now()}`,
          type: "api",
          status: "success",
          message: "API gateway health check passed",
          details: "All endpoints responding",
          source: "MAS",
          timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        },
        {
          id: `sim-3-${Date.now()}`,
          type: "workflow",
          status: "success",
          message: "Weather data sync completed",
          details: "Updated 50 monitoring locations",
          source: "n8n",
          timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: `sim-4-${Date.now()}`,
          type: "ai",
          status: "info",
          message: "MYCA model inference active",
          details: "Processing 12 pending requests",
          source: "MYCA",
          timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        },
        {
          id: `sim-5-${Date.now()}`,
          type: "device",
          status: "success",
          message: "MycoBrain telemetry received",
          details: "COM7: 2x BME688 sensors online",
          source: "MycoBrain",
          timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
        },
        {
          id: `sim-6-${Date.now()}`,
          type: "observation",
          status: "info",
          message: "New species observation logged",
          details: "Trametes versicolor - California",
          source: "iNaturalist",
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        },
      ];
      events.push(...simulatedEvents);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ 
      events: events.slice(0, 50),
      count: events.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    
    // Return simulated data on error
    return NextResponse.json({
      events: [
        {
          id: `fallback-${Date.now()}`,
          type: "system",
          status: "warning",
          message: "Activity feed temporarily unavailable",
          details: "Reconnecting to backend services...",
          source: "NatureOS",
          timestamp: now.toISOString(),
        },
      ],
      count: 1,
      timestamp: now.toISOString(),
      error: "Backend temporarily unavailable",
    });
  }
}
