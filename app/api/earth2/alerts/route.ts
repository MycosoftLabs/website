/**
 * Earth-2 Alerts API Route
 * February 12, 2026
 * 
 * Fetches weather and spore alerts from MAS backend Earth-2 API
 * NO MOCK DATA - returns empty array when API unavailable
 */

import { NextRequest, NextResponse } from "next/server";

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001";

interface Earth2Alert {
  id: string;
  type: "weather" | "spore" | "severe_weather" | "nowcast";
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  timestamp: string;
  expiresAt?: string;
  source: "workflow_48" | "workflow_49" | "workflow_50" | "manual" | "mas";
  species?: string;
  concentration?: number;
  windSpeed?: number;
  precipitation?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Try to fetch alerts from MAS Earth-2 API
    const response = await fetch(`${MAS_API_URL}/api/earth2/alerts`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      // 5 second timeout for alerts
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.log(`[Earth2 Alerts] MAS API returned status ${response.status}`);
      // Return empty alerts array - NO MOCK DATA per Mycosoft policy
      return NextResponse.json({
        alerts: [],
        status: "unavailable",
        message: "Earth-2 alerts service unavailable",
        source: "none",
      });
    }

    const data = await response.json();
    
    // Transform and validate alerts from MAS
    const alerts: Earth2Alert[] = (data.alerts || []).map((alert: any) => ({
      id: alert.id || `mas-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: validateAlertType(alert.type),
      severity: validateSeverity(alert.severity),
      title: alert.title || "Alert",
      description: alert.description || "",
      location: {
        lat: alert.location?.lat || alert.lat || 0,
        lon: alert.location?.lon || alert.lon || 0,
        name: alert.location?.name || alert.locationName,
      },
      timestamp: alert.timestamp || new Date().toISOString(),
      expiresAt: alert.expiresAt,
      source: alert.source || "mas",
      species: alert.species,
      concentration: alert.concentration,
      windSpeed: alert.windSpeed,
      precipitation: alert.precipitation,
    }));

    return NextResponse.json({
      alerts,
      status: "online",
      count: alerts.length,
      source: "mas",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Earth2 Alerts] Failed to fetch from MAS:", error);
    
    // Return empty alerts array - NO MOCK DATA per Mycosoft policy
    return NextResponse.json({
      alerts: [],
      status: "error",
      message: error instanceof Error ? error.message : "Failed to fetch alerts",
      source: "none",
    });
  }
}

function validateAlertType(type: string): Earth2Alert["type"] {
  const validTypes = ["weather", "spore", "severe_weather", "nowcast"];
  return validTypes.includes(type) ? type as Earth2Alert["type"] : "weather";
}

function validateSeverity(severity: string): Earth2Alert["severity"] {
  const validSeverities = ["low", "moderate", "high", "critical"];
  return validSeverities.includes(severity) ? severity as Earth2Alert["severity"] : "moderate";
}
