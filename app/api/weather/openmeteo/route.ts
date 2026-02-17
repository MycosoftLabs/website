/**
 * Open-Meteo Weather API Route - CPU Fallback
 * February 12, 2026
 * 
 * Provides weather data from Open-Meteo when GPU-based Earth-2 is unavailable.
 * Open-Meteo is a free, open-source weather API that runs on CPU.
 * 
 * NO MOCK DATA - returns empty state when API unavailable
 */

import { NextRequest, NextResponse } from "next/server";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

interface OpenMeteoForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    precipitation: number;
    surface_pressure: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
}

interface WeatherResponse {
  source: "openmeteo";
  gpuFallback: true;
  current?: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    precipitation: number;
    pressure: number;
  };
  hourly?: Array<{
    time: string;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
  }>;
  daily?: Array<{
    time: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationSum: number;
    weatherCode: number;
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat") || searchParams.get("latitude");
  const lon = searchParams.get("lon") || searchParams.get("longitude");
  const type = searchParams.get("type") || "current"; // current, hourly, daily, all
  
  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Missing latitude/longitude parameters" },
      { status: 400 }
    );
  }

  try {
    // Build Open-Meteo URL based on requested type
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      timezone: "auto",
    });

    // Always include current for quick reference
    params.append("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation,surface_pressure");
    
    if (type === "hourly" || type === "all") {
      params.append("hourly", "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code");
      params.append("forecast_hours", "168"); // 7 days
    }
    
    if (type === "daily" || type === "all") {
      params.append("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code");
      params.append("forecast_days", "16");
    }

    const response = await fetch(`${OPEN_METEO_BASE}/forecast?${params.toString()}`, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(`[Open-Meteo] API returned status ${response.status}`);
      return NextResponse.json(
        { 
          error: "Open-Meteo API unavailable",
          source: "openmeteo",
          gpuFallback: true,
          status: "unavailable"
        },
        { status: 503 }
      );
    }

    const data: OpenMeteoForecast = await response.json();
    
    // Transform to our standard format
    const result: WeatherResponse = {
      source: "openmeteo",
      gpuFallback: true,
    };

    if (data.current) {
      result.current = {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        weatherCode: data.current.weather_code,
        precipitation: data.current.precipitation,
        pressure: data.current.surface_pressure,
      };
    }

    if (data.hourly?.time) {
      result.hourly = data.hourly.time.map((time, i) => ({
        time,
        temperature: data.hourly!.temperature_2m[i],
        humidity: data.hourly!.relative_humidity_2m[i],
        precipitation: data.hourly!.precipitation[i],
        windSpeed: data.hourly!.wind_speed_10m[i],
        windDirection: data.hourly!.wind_direction_10m[i],
        weatherCode: data.hourly!.weather_code[i],
      }));
    }

    if (data.daily?.time) {
      result.daily = data.daily.time.map((time, i) => ({
        time,
        temperatureMax: data.daily!.temperature_2m_max[i],
        temperatureMin: data.daily!.temperature_2m_min[i],
        precipitationSum: data.daily!.precipitation_sum[i],
        weatherCode: data.daily!.weather_code[i],
      }));
    }

    return NextResponse.json({
      ...result,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Open-Meteo] Failed to fetch weather data:", error);
    
    // Return empty state - NO MOCK DATA per Mycosoft policy
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch weather",
        source: "openmeteo",
        gpuFallback: true,
        status: "error",
      },
      { status: 500 }
    );
  }
}
