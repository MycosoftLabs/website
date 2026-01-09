import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/services/status
 * Get status of all system services
 */
export async function GET(request: NextRequest) {
  try {
    const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003";
    
    const services = [
      {
        id: "mycobrain",
        name: "MycoBrain Service",
        url: MYCOBRAIN_SERVICE_URL,
        healthUrl: `${MYCOBRAIN_SERVICE_URL}/health`,
      },
      // Add more services here
    ];

    const statuses = await Promise.all(
      services.map(async (service) => {
        try {
          const response = await fetch(service.healthUrl, {
            signal: AbortSignal.timeout(2000),
          });
          return {
            ...service,
            status: response.ok ? "online" : "offline",
            statusCode: response.status,
          };
        } catch (error) {
          return {
            ...service,
            status: "offline",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return NextResponse.json({
      services: statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check service status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



































