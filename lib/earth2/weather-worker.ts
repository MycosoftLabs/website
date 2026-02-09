/**
 * Weather Processing Web Worker
 * February 4, 2026
 * 
 * Offloads heavy weather grid processing from the main thread
 * Handles GeoJSON generation, grid interpolation, and wind calculations
 */

// Type definitions for worker messages
interface WeatherWorkerRequest {
  type: "generateCloudGeoJSON" | "generatePrecipGeoJSON" | "generateWindVectors" | "interpolateGrid";
  id: string;
  data: any;
}

interface WeatherWorkerResponse {
  type: "result" | "error";
  id: string;
  data?: any;
  error?: string;
}

// Check if we're in a worker context
const isWorker = typeof self !== "undefined" && typeof (self as any).WorkerGlobalScope !== "undefined";

if (isWorker) {
  // Worker code
  self.onmessage = (event: MessageEvent<WeatherWorkerRequest>) => {
    const { type, id, data } = event.data;
    
    try {
      let result: any;
      
      switch (type) {
        case "generateCloudGeoJSON":
          result = generateCloudGeoJSONWorker(data);
          break;
        case "generatePrecipGeoJSON":
          result = generatePrecipGeoJSONWorker(data);
          break;
        case "generateWindVectors":
          result = generateWindVectorsWorker(data);
          break;
        case "interpolateGrid":
          result = interpolateGridWorker(data);
          break;
        default:
          throw new Error(`Unknown worker message type: ${type}`);
      }
      
      const response: WeatherWorkerResponse = { type: "result", id, data: result };
      self.postMessage(response);
    } catch (error) {
      const response: WeatherWorkerResponse = { 
        type: "error", 
        id, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
      self.postMessage(response);
    }
  };
}

// Worker functions
function generateCloudGeoJSONWorker(params: {
  grid: number[][];
  bounds: { north: number; south: number; east: number; west: number };
  min: number;
  max: number;
  phase: number;
}): GeoJSON.FeatureCollection {
  const { grid, bounds, min, max, phase } = params;
  const features: GeoJSON.Feature[] = [];
  const latSteps = grid.length;
  const lonSteps = grid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;
  const range = Math.max(1, max - min);

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = grid[i][j];
      const cloudDensity = Math.min(1, Math.max(0, (value - 20) / 45));
      
      if (cloudDensity < 0.15) continue;

      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;
      
      // Volumetric effect
      const variation = Math.sin(phase + value * 0.1) * 5;
      const volumetricPulse = Math.sin(phase * 2 + i * 0.3 + j * 0.4) * 0.05;
      const cloudOpacity = (0.3 + cloudDensity * 0.5 + volumetricPulse);
      
      let gray: number;
      if (cloudDensity > 0.8) gray = Math.floor(156 + variation);
      else if (cloudDensity > 0.6) gray = Math.floor(209 + variation);
      else if (cloudDensity > 0.4) gray = Math.floor(229 + variation);
      else gray = Math.floor(243 + variation);
      
      const color = `rgb(${gray}, ${gray + 2}, ${gray + 4})`;

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value * 10) / 10,
          color,
          cloudOpacity,
          density: Math.round(cloudDensity * 100),
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lon, lat],
            [lon + lonStep, lat],
            [lon + lonStep, lat + latStep],
            [lon, lat + latStep],
            [lon, lat],
          ]],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

function generatePrecipGeoJSONWorker(params: {
  precipGrid: number[][];
  tempGrid: number[][];
  bounds: { north: number; south: number; east: number; west: number };
}): GeoJSON.FeatureCollection {
  const { precipGrid, tempGrid, bounds } = params;
  const features: GeoJSON.Feature[] = [];
  const latSteps = precipGrid.length;
  const lonSteps = precipGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  const PRECIP_COLORS = [
    { value: 0, color: "rgba(0,0,0,0)" },
    { value: 0.1, color: "#a0d6a0" },
    { value: 0.5, color: "#50b850" },
    { value: 1, color: "#28a428" },
    { value: 2.5, color: "#ffff00" },
    { value: 5, color: "#ffc800" },
    { value: 10, color: "#ff9600" },
    { value: 15, color: "#ff0000" },
    { value: 25, color: "#c80000" },
    { value: 50, color: "#780078" },
    { value: 100, color: "#ff00ff" },
  ];

  const getPrecipColor = (value: number): string => {
    for (let i = PRECIP_COLORS.length - 1; i >= 0; i--) {
      if (value >= PRECIP_COLORS[i].value) return PRECIP_COLORS[i].color;
    }
    return PRECIP_COLORS[0].color;
  };

  const getSnowColor = (value: number): string => {
    if (value >= 15) return "#80c0ff";
    if (value >= 5) return "#a0d0ff";
    if (value >= 1) return "#c0e0ff";
    return "#e0f0ff";
  };

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lonSteps; j++) {
      const value = precipGrid[i][j];
      if (value < 0.1) continue;

      const temp = tempGrid[i]?.[j] ?? 10;
      const isSnow = temp <= 2;
      const color = isSnow ? getSnowColor(value) : getPrecipColor(value);
      const lat = bounds.south + i * latStep;
      const lon = bounds.west + j * lonStep;

      features.push({
        type: "Feature",
        properties: {
          value: Math.round(value * 10) / 10,
          color,
          isSnow,
          temp: Math.round(temp),
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lon, lat],
            [lon + lonStep, lat],
            [lon + lonStep, lat + latStep],
            [lon, lat + latStep],
            [lon, lat],
          ]],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

function generateWindVectorsWorker(params: {
  uGrid: number[][];
  vGrid: number[][];
  bounds: { north: number; south: number; east: number; west: number };
  density: number;
}): Array<{ lat: number; lon: number; direction: number; speed: number }> {
  const { uGrid, vGrid, bounds, density } = params;
  const vectors: Array<{ lat: number; lon: number; direction: number; speed: number }> = [];
  
  const latSteps = uGrid.length;
  const lonSteps = uGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;
  
  const step = Math.max(1, Math.floor(1 / density));

  for (let i = 0; i < latSteps; i += step) {
    for (let j = 0; j < lonSteps; j += step) {
      const u = uGrid[i][j];
      const v = vGrid[i]?.[j] ?? 0;
      
      const speed = Math.sqrt(u * u + v * v);
      if (speed < 0.5) continue; // Skip calm areas
      
      const direction = (Math.atan2(u, v) * 180 / Math.PI + 360) % 360;
      const lat = bounds.south + i * latStep + latStep / 2;
      const lon = bounds.west + j * lonStep + lonStep / 2;

      vectors.push({ lat, lon, direction, speed });
    }
  }

  return vectors;
}

function interpolateGridWorker(params: {
  grid: number[][];
  targetRows: number;
  targetCols: number;
}): number[][] {
  const { grid, targetRows, targetCols } = params;
  const srcRows = grid.length;
  const srcCols = grid[0]?.length || 1;
  
  if (srcRows === 0 || srcCols === 0) return grid;
  
  const result: number[][] = [];
  
  for (let i = 0; i < targetRows; i++) {
    const row: number[] = [];
    const srcI = (i / targetRows) * srcRows;
    const i0 = Math.floor(srcI);
    const i1 = Math.min(i0 + 1, srcRows - 1);
    const ti = srcI - i0;
    
    for (let j = 0; j < targetCols; j++) {
      const srcJ = (j / targetCols) * srcCols;
      const j0 = Math.floor(srcJ);
      const j1 = Math.min(j0 + 1, srcCols - 1);
      const tj = srcJ - j0;
      
      // Bilinear interpolation
      const v00 = grid[i0][j0];
      const v01 = grid[i0][j1];
      const v10 = grid[i1][j0];
      const v11 = grid[i1][j1];
      
      const v0 = v00 * (1 - tj) + v01 * tj;
      const v1 = v10 * (1 - tj) + v11 * tj;
      const value = v0 * (1 - ti) + v1 * ti;
      
      row.push(value);
    }
    result.push(row);
  }
  
  return result;
}

// Main thread helper class for communicating with the worker
export class WeatherWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
  private requestCounter: number = 0;

  constructor() {
    if (typeof Worker !== "undefined") {
      try {
        // Create worker from this file's URL or a blob
        const workerCode = `
          self.onmessage = ${self.onmessage?.toString() || "() => {}"};
          ${generateCloudGeoJSONWorker.toString()}
          ${generatePrecipGeoJSONWorker.toString()}
          ${generateWindVectorsWorker.toString()}
          ${interpolateGridWorker.toString()}
        `;
        const blob = new Blob([workerCode], { type: "application/javascript" });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (event: MessageEvent<WeatherWorkerResponse>) => {
          const { type, id, data, error } = event.data;
          const pending = this.pendingRequests.get(id);
          
          if (pending) {
            this.pendingRequests.delete(id);
            if (type === "error") {
              pending.reject(new Error(error));
            } else {
              pending.resolve(data);
            }
          }
        };
        
        this.worker.onerror = (error) => {
          console.error("[WeatherWorker] Error:", error);
        };
      } catch (error) {
        console.warn("[WeatherWorker] Failed to create worker, falling back to main thread:", error);
        this.worker = null;
      }
    }
  }

  private generateId(): string {
    return `req-${++this.requestCounter}-${Date.now()}`;
  }

  private sendRequest<T>(type: WeatherWorkerRequest["type"], data: any): Promise<T> {
    const id = this.generateId();
    
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to main thread processing
        try {
          let result: any;
          switch (type) {
            case "generateCloudGeoJSON":
              result = generateCloudGeoJSONWorker(data);
              break;
            case "generatePrecipGeoJSON":
              result = generatePrecipGeoJSONWorker(data);
              break;
            case "generateWindVectors":
              result = generateWindVectorsWorker(data);
              break;
            case "interpolateGrid":
              result = interpolateGridWorker(data);
              break;
            default:
              throw new Error(`Unknown type: ${type}`);
          }
          resolve(result);
        } catch (error) {
          reject(error);
        }
        return;
      }
      
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ type, id, data });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Worker request timed out"));
        }
      }, 10000);
    });
  }

  async generateCloudGeoJSON(params: {
    grid: number[][];
    bounds: { north: number; south: number; east: number; west: number };
    min: number;
    max: number;
    phase: number;
  }): Promise<GeoJSON.FeatureCollection> {
    return this.sendRequest("generateCloudGeoJSON", params);
  }

  async generatePrecipGeoJSON(params: {
    precipGrid: number[][];
    tempGrid: number[][];
    bounds: { north: number; south: number; east: number; west: number };
  }): Promise<GeoJSON.FeatureCollection> {
    return this.sendRequest("generatePrecipGeoJSON", params);
  }

  async generateWindVectors(params: {
    uGrid: number[][];
    vGrid: number[][];
    bounds: { north: number; south: number; east: number; west: number };
    density: number;
  }): Promise<Array<{ lat: number; lon: number; direction: number; speed: number }>> {
    return this.sendRequest("generateWindVectors", params);
  }

  async interpolateGrid(params: {
    grid: number[][];
    targetRows: number;
    targetCols: number;
  }): Promise<number[][]> {
    return this.sendRequest("interpolateGrid", params);
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Singleton instance
let workerClientInstance: WeatherWorkerClient | null = null;

export function getWeatherWorker(): WeatherWorkerClient {
  if (!workerClientInstance) {
    workerClientInstance = new WeatherWorkerClient();
  }
  return workerClientInstance;
}

export default WeatherWorkerClient;
