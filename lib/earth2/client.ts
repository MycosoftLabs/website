/**
 * NVIDIA Earth-2 Client Library
 * February 5, 2026
 * 
 * Full integration with MAS Earth-2 API
 * Supports all Earth-2 models: Atlas, StormScope, CorrDiff, HealDA, FourCastNet
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

export type Earth2Model = 
  | "atlas-era5"      // Medium-range forecast (0-15 days)
  | "stormscope"      // Nowcasting (0-6 hours)
  | "corrdiff"        // High-resolution downscaling
  | "healda"          // Data assimilation
  | "fourcastnet";    // Legacy forecast model

export type WeatherVariable = 
  | "t2m"     // 2m temperature
  | "u10"     // 10m U wind component
  | "v10"     // 10m V wind component
  | "sp"      // Surface pressure
  | "tp"      // Total precipitation
  | "tcwv"    // Total column water vapor
  | "msl"     // Mean sea level pressure
  | "z500"    // 500 hPa geopotential height
  | "t850"    // 850 hPa temperature
  | "q700";   // 700 hPa specific humidity

export interface GeoLocation {
  lat: number;
  lon: number;
  name?: string;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Forecast Types
export interface ForecastParams {
  model: Earth2Model;
  startTime?: string; // ISO timestamp
  forecastHours: number;
  stepHours?: number;
  variables: WeatherVariable[];
  ensembleMembers?: number;
  bounds?: GeoBounds;
  locations?: GeoLocation[];
}

export interface ForecastResult {
  runId: string;
  model: Earth2Model;
  startTime: string;
  endTime: string;
  variables: WeatherVariable[];
  steps: ForecastStep[];
  metadata: {
    resolution: string;
    ensembleMembers: number;
    computeTimeMs: number;
  };
}

export interface ForecastStep {
  validTime: string;
  forecastHour: number;
  data: Record<WeatherVariable, WeatherData>;
}

export interface WeatherData {
  grid?: number[][];        // 2D grid for raster visualization
  points?: PointData[];     // Point data for specific locations
  min: number;
  max: number;
  mean: number;
  unit: string;
}

export interface PointData {
  location: GeoLocation;
  value: number;
}

// Nowcast Types
export interface NowcastParams {
  startTime?: string;
  forecastMinutes: number;
  stepMinutes?: number;
  variables: WeatherVariable[];
  bounds?: GeoBounds;
  includeStormCells?: boolean;
}

export interface NowcastResult {
  runId: string;
  startTime: string;
  steps: NowcastStep[];
  stormCells?: StormCell[];
}

export interface NowcastStep {
  validTime: string;
  forecastMinutes: number;
  data: Record<WeatherVariable, WeatherData>;
}

export interface StormCell {
  id: string;
  lat: number;
  lon: number;
  intensity: "weak" | "moderate" | "strong" | "severe";
  type: "thunderstorm" | "supercell" | "squall_line" | "derecho";
  topAltitude: number;
  movementDirection: number;
  movementSpeed: number;
  hasHail: boolean;
  hasTornado: boolean;
  hasLightning: boolean;
  reflectivity: number;
  size: number; // Storm diameter in km
}

// Spore Dispersal Types
export interface SporeDispersalParams {
  species: string;
  originLat: number;
  originLon: number;
  originConcentration: number;
  forecastHours: number;
  releaseHeight?: number;
  particleCount?: number;
}

export interface SporeDispersalResult {
  runId: string;
  species: string;
  origin: GeoLocation;
  forecastHours: number;
  steps: SporeStep[];
  zones: SporeZone[];
}

export interface SporeStep {
  validTime: string;
  forecastHour: number;
  particles: SporeParticle[];
  concentrationGrid?: number[][];
}

export interface SporeParticle {
  id: string;
  lat: number;
  lon: number;
  altitude: number;
  concentration: number;
}

export interface SporeZone {
  id: string;
  lat: number;
  lon: number;
  radius: number;
  concentration: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  species: string;
}

// Downscaling Types
export interface DownscaleParams {
  sourceData: ForecastResult | NowcastResult;
  targetResolution: "1km" | "250m" | "100m";
  bounds: GeoBounds;
}

export interface DownscaleResult {
  runId: string;
  resolution: string;
  bounds: GeoBounds;
  data: Record<WeatherVariable, number[][]>;
}

// Model Run Status
export interface ModelRunStatus {
  runId: string;
  model: Earth2Model;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// API Status
export interface Earth2Status {
  available: boolean;
  status: "online" | "degraded" | "offline";
  models: Earth2ModelInfo[];
  gpuStatus: GpuStatus;
  lastUpdated: string;
  source?: "mas" | "cached_real" | "none";
  cached?: boolean;
  error?: string;
}

export interface Earth2ModelInfo {
  name: Earth2Model;
  displayName: string;
  description: string;
  available: boolean;
  maxForecastHours: number;
  minStepHours: number;
  supportedVariables: WeatherVariable[];
}

export interface GpuStatus {
  deviceName: string;
  memoryUsed: number;
  memoryTotal: number;
  utilization: number;
  temperature: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Earth-2 Client Class
// ═══════════════════════════════════════════════════════════════════════════════

export class Earth2Client {
  private baseUrl: string;

  constructor(baseUrl = "/api/earth2") {
    this.baseUrl = baseUrl;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Status & Health
  // ─────────────────────────────────────────────────────────────────────────────

  async getStatus(): Promise<Earth2Status> {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        cache: "no-store",
      });
      
      if (!response.ok) {
        return this.getUnavailableStatus(`Status API error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        available: data.available !== false,
        status: data.available ? "online" : "offline",
        models: Array.isArray(data.models) ? data.models : [],
        gpuStatus: this.normalizeGpuStatus(data.gpuStatus),
        lastUpdated: new Date().toISOString(),
        source: data.source ?? "mas",
        cached: data.cached === true,
        error: typeof data.error === "string" ? data.error : undefined,
      };
    } catch (error) {
      console.error("[Earth-2 Client] Status check failed:", error);
      return this.getUnavailableStatus(`Status request failed: ${String(error)}`);
    }
  }

  async getModels(): Promise<Earth2ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Models API error: ${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload) ? payload : (payload.models ?? []);
    } catch (error) {
      throw new Error(`[Earth-2 Client] Models unavailable: ${String(error)}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Forecasting
  // ─────────────────────────────────────────────────────────────────────────────

  async runForecast(params: ForecastParams): Promise<ForecastResult> {
    console.log("[Earth-2 Client] Running forecast:", params);
    
    try {
      const response = await fetch(`${this.baseUrl}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: params.model,
          start_time: params.startTime || new Date().toISOString(),
          forecast_hours: params.forecastHours,
          step_hours: params.stepHours || 6,
          variables: params.variables,
          ensemble_members: params.ensembleMembers || 1,
          bounds: params.bounds,
          locations: params.locations,
        }),
      });

      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`[Earth-2 Client] Forecast failed: ${String(error)}`);
    }
  }

  async getForecast(params: {
    model?: Earth2Model;
    forecastHours?: number;
    variables?: WeatherVariable[];
    bounds?: GeoBounds;
  }): Promise<ForecastResult> {
    return this.runForecast({
      model: params.model || "atlas-era5",
      forecastHours: params.forecastHours || 168,
      variables: params.variables || ["t2m", "tp", "u10", "v10"],
      bounds: params.bounds,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Nowcasting
  // ─────────────────────────────────────────────────────────────────────────────

  async runNowcast(params: NowcastParams): Promise<NowcastResult> {
    console.log("[Earth-2 Client] Running nowcast:", params);
    
    try {
      const response = await fetch(`${this.baseUrl}/nowcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_time: params.startTime || new Date().toISOString(),
          forecast_minutes: params.forecastMinutes,
          step_minutes: params.stepMinutes || 5,
          variables: params.variables,
          bounds: params.bounds,
          include_storm_cells: params.includeStormCells,
        }),
      });

      if (!response.ok) {
        throw new Error(`Nowcast API error: ${response.status}`);
      }

      return await response.json();
    } catch {
      throw new Error("[Earth-2 Client] Nowcast failed");
    }
  }

  async getNowcast(forecastMinutes = 60): Promise<NowcastResult> {
    return this.runNowcast({
      forecastMinutes,
      variables: ["tp", "t2m"],
      includeStormCells: true,
    });
  }

  async getStormCells(bounds?: GeoBounds): Promise<StormCell[]> {
    try {
      let url = `${this.baseUrl}/nowcast/storms`;
      if (bounds) {
        url += `?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`;
      }
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      // The API returns 'cells', not 'stormCells'
      return data.cells || data.stormCells || [];
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Spore Dispersal
  // ─────────────────────────────────────────────────────────────────────────────

  async runSporeDispersal(params: SporeDispersalParams): Promise<SporeDispersalResult> {
    console.log("[Earth-2 Client] Running spore dispersal:", params);
    
    try {
      const response = await fetch(`${this.baseUrl}/spore-dispersal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species: params.species,
          origin_lat: params.originLat,
          origin_lon: params.originLon,
          origin_concentration: params.originConcentration,
          forecast_hours: params.forecastHours,
          release_height: params.releaseHeight || 10,
          particle_count: params.particleCount || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Spore dispersal API error: ${response.status}`);
      }

      return await response.json();
    } catch {
      throw new Error("[Earth-2 Client] Spore dispersal failed");
    }
  }

  async getSporeZones(forecastHours = 24): Promise<SporeZone[]> {
    try {
      const response = await fetch(`${this.baseUrl}/spore-dispersal?hours=${forecastHours}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.zones || [];
    } catch {
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Downscaling (CorrDiff)
  // ─────────────────────────────────────────────────────────────────────────────

  async runDownscale(params: DownscaleParams): Promise<DownscaleResult> {
    console.log("[Earth-2 Client] Running downscaling:", params);
    
    try {
      const response = await fetch(`${this.baseUrl}/downscale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_run_id: (params.sourceData as ForecastResult).runId,
          target_resolution: params.targetResolution,
          bounds: params.bounds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Downscale API error: ${response.status}`);
      }

      return await response.json();
    } catch {
      throw new Error("[Earth-2 Client] Downscale failed");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Model Run Status
  // ─────────────────────────────────────────────────────────────────────────────

  async getRunStatus(runId: string): Promise<ModelRunStatus> {
    const response = await fetch(`${this.baseUrl}/runs/${runId}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`[Earth-2 Client] Run not found: ${runId} (${response.status})`);
    return await response.json();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Weather Data Layers (for map visualization)
  // ─────────────────────────────────────────────────────────────────────────────

  async getWeatherGrid(params: {
    variable: WeatherVariable;
    forecastHours: number;
    bounds: GeoBounds;
    resolution?: number;
  }): Promise<{ grid: number[][]; min: number; max: number }> {
    const response = await fetch(
      `${this.baseUrl}/layers/grid?` +
      `variable=${params.variable}&` +
      `hours=${params.forecastHours}&` +
      `north=${params.bounds.north}&` +
      `south=${params.bounds.south}&` +
      `east=${params.bounds.east}&` +
      `west=${params.bounds.west}&` +
      `resolution=${params.resolution || 0.25}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error(`[Earth-2 Client] Grid unavailable (${response.status})`);
    return await response.json();
  }

  async getWindVectors(params: {
    forecastHours: number;
    bounds: GeoBounds;
    resolution?: number;
  }): Promise<{ u: number[][]; v: number[][]; speed: number[][]; direction: number[][] }> {
    const response = await fetch(
      `${this.baseUrl}/layers/wind?` +
      `hours=${params.forecastHours}&` +
      `north=${params.bounds.north}&` +
      `south=${params.bounds.south}&` +
      `east=${params.bounds.east}&` +
      `west=${params.bounds.west}`,
      { cache: "no-store" },
    );
    if (!response.ok) throw new Error(`[Earth-2 Client] Wind unavailable (${response.status})`);
    return await response.json();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Availability helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private getUnavailableStatus(error: string): Earth2Status {
    return {
      available: false,
      status: "offline",
      models: [],
      gpuStatus: this.normalizeGpuStatus(undefined),
      lastUpdated: new Date().toISOString(),
      source: "none",
      cached: false,
      error,
    };
  }

  private normalizeGpuStatus(gpuStatus: unknown): GpuStatus {
    if (gpuStatus && typeof gpuStatus === "object") {
      const raw = gpuStatus as Partial<GpuStatus>;
      return {
        deviceName: raw.deviceName ?? "unavailable",
        memoryUsed: Number(raw.memoryUsed ?? 0),
        memoryTotal: Number(raw.memoryTotal ?? 0),
        utilization: Number(raw.utilization ?? 0),
        temperature: Number(raw.temperature ?? 0),
      };
    }

    return {
      deviceName: "unavailable",
      memoryUsed: 0,
      memoryTotal: 0,
      utilization: 0,
      temperature: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let clientInstance: Earth2Client | null = null;

export function getEarth2Client(): Earth2Client {
  if (!clientInstance) {
    clientInstance = new Earth2Client();
  }
  return clientInstance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";

export function useEarth2() {
  const [client] = useState(() => getEarth2Client());
  const [status, setStatus] = useState<Earth2Status | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    const s = await client.getStatus();
    setStatus(s);
    setLoading(false);
  }, [client]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 60000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    client,
    status,
    loading,
    refreshStatus,
    isOnline: status?.available ?? false,
  };
}
