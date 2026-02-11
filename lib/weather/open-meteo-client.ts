/**
 * Open-Meteo Weather Client for CREP
 * February 10, 2026
 *
 * Free weather API client - no API key required
 * Provides current weather, forecasts, and grid data for map visualization
 *
 * Endpoints:
 * - https://api.open-meteo.com/v1/forecast - Point forecasts
 * - https://api.open-meteo.com/v1/gfs - US GFS model grid data
 */

// Base URLs
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const GFS_API = "https://api.open-meteo.com/v1/gfs";

// Variable mappings from internal names to Open-Meteo parameter names
export const VARIABLE_MAPPING: Record<string, string> = {
  t2m: "temperature_2m",
  temperature: "temperature_2m",
  temp: "temperature_2m",
  wind: "wind_speed_10m",
  wind_speed: "wind_speed_10m",
  u10: "wind_speed_10m",
  wind_direction: "wind_direction_10m",
  v10: "wind_direction_10m",
  precipitation: "precipitation",
  rain: "precipitation",
  tp: "precipitation",
  clouds: "cloud_cover",
  cloud_cover: "cloud_cover",
  tcc: "cloud_cover",
  humidity: "relative_humidity_2m",
  rh: "relative_humidity_2m",
  pressure: "surface_pressure",
  sp: "surface_pressure",
  msl: "pressure_msl",
  dewpoint: "dew_point_2m",
  visibility: "visibility",
  snow: "snowfall",
  wind_gusts: "wind_gusts_10m",
  uv: "uv_index",
  cape: "cape",
  soil_temp: "soil_temperature_0cm",
  soil_moisture: "soil_moisture_0_to_1cm",
};

// Units for each variable
export const VARIABLE_UNITS: Record<string, string> = {
  temperature_2m: "°C",
  wind_speed_10m: "km/h",
  wind_direction_10m: "°",
  precipitation: "mm",
  cloud_cover: "%",
  relative_humidity_2m: "%",
  surface_pressure: "hPa",
  pressure_msl: "hPa",
  dew_point_2m: "°C",
  visibility: "m",
  snowfall: "cm",
  wind_gusts_10m: "km/h",
  uv_index: "",
  cape: "J/kg",
  soil_temperature_0cm: "°C",
  soil_moisture_0_to_1cm: "m³/m³",
};

// Types
export interface OpenMeteoCurrentWeather {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
}

export interface OpenMeteoHourlyForecast {
  time: string[];
  temperature_2m?: number[];
  relative_humidity_2m?: number[];
  dew_point_2m?: number[];
  apparent_temperature?: number[];
  precipitation_probability?: number[];
  precipitation?: number[];
  rain?: number[];
  showers?: number[];
  snowfall?: number[];
  snow_depth?: number[];
  weather_code?: number[];
  pressure_msl?: number[];
  surface_pressure?: number[];
  cloud_cover?: number[];
  cloud_cover_low?: number[];
  cloud_cover_mid?: number[];
  cloud_cover_high?: number[];
  visibility?: number[];
  evapotranspiration?: number[];
  wind_speed_10m?: number[];
  wind_speed_80m?: number[];
  wind_speed_120m?: number[];
  wind_direction_10m?: number[];
  wind_direction_80m?: number[];
  wind_direction_120m?: number[];
  wind_gusts_10m?: number[];
  uv_index?: number[];
  uv_index_clear_sky?: number[];
  cape?: number[];
  soil_temperature_0cm?: number[];
  soil_temperature_6cm?: number[];
  soil_moisture_0_to_1cm?: number[];
  [key: string]: string[] | number[] | undefined;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current?: OpenMeteoCurrentWeather;
  hourly?: OpenMeteoHourlyForecast;
  hourly_units?: Record<string, string>;
}

export interface WeatherGridPoint {
  lat: number;
  lon: number;
  value: number;
  variable: string;
  unit: string;
  time: string;
}

export interface WeatherGridData {
  grid: WeatherGridPoint[];
  variable: string;
  unit: string;
  timestamp: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  resolution: number;
  source: "open-meteo";
  model: "gfs" | "forecast";
}

export interface CurrentWeatherData {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  current: {
    time: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    precipitation: number;
    cloud_cover: number;
    pressure: number;
    wind_speed: number;
    wind_direction: number;
    wind_gusts: number;
    weather_code: number;
    is_day: boolean;
  };
  source: "open-meteo";
}

export interface HourlyForecastData {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  hourly: Array<{
    time: string;
    temperature?: number;
    humidity?: number;
    precipitation?: number;
    precipitation_probability?: number;
    cloud_cover?: number;
    pressure?: number;
    wind_speed?: number;
    wind_direction?: number;
    wind_gusts?: number;
    weather_code?: number;
    uv_index?: number;
    visibility?: number;
    [key: string]: string | number | undefined;
  }>;
  units: Record<string, string>;
  source: "open-meteo";
}

// Weather code descriptions
export const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

/**
 * Open-Meteo Weather Client
 * Free API with no authentication required
 */
export class OpenMeteoClient {
  private timeout: number;

  constructor(options?: { timeout?: number }) {
    this.timeout = options?.timeout ?? 10000;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Map internal variable name to Open-Meteo parameter
   */
  private mapVariable(variable: string): string {
    return VARIABLE_MAPPING[variable.toLowerCase()] || variable;
  }

  /**
   * Get current weather conditions for a location
   */
  async getCurrentWeather(
    latitude: number,
    longitude: number
  ): Promise<CurrentWeatherData> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "surface_pressure",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
      timezone: "auto",
    });

    const response = await this.fetchWithTimeout(`${FORECAST_API}?${params}`);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoForecastResponse = await response.json();

    if (!data.current) {
      throw new Error("No current weather data available");
    }

    return {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
        timezone: data.timezone,
      },
      current: {
        time: data.current.time,
        temperature: data.current.temperature_2m,
        feels_like: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        cloud_cover: data.current.cloud_cover,
        pressure: data.current.pressure_msl,
        wind_speed: data.current.wind_speed_10m,
        wind_direction: data.current.wind_direction_10m,
        wind_gusts: data.current.wind_gusts_10m,
        weather_code: data.current.weather_code,
        is_day: data.current.is_day === 1,
      },
      source: "open-meteo",
    };
  }

  /**
   * Get hourly forecast for a location
   */
  async getHourlyForecast(
    latitude: number,
    longitude: number,
    options?: {
      hours?: number;
      variables?: string[];
    }
  ): Promise<HourlyForecastData> {
    const forecastHours = options?.hours ?? 24;
    const requestedVariables = options?.variables ?? [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "precipitation_probability",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "weather_code",
      "uv_index",
      "visibility",
    ];

    // Map any internal variable names to Open-Meteo names
    const mappedVariables = requestedVariables.map((v) => this.mapVariable(v));

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: mappedVariables.join(","),
      forecast_hours: forecastHours.toString(),
      timezone: "auto",
    });

    const response = await this.fetchWithTimeout(`${FORECAST_API}?${params}`);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenMeteoForecastResponse = await response.json();

    if (!data.hourly) {
      throw new Error("No hourly forecast data available");
    }

    // Transform hourly data into array of time-indexed objects
    const hourlyArray: HourlyForecastData["hourly"] = data.hourly.time.map(
      (time, index) => {
        const hourData: HourlyForecastData["hourly"][0] = { time };

        for (const variable of mappedVariables) {
          const values = data.hourly?.[variable];
          if (Array.isArray(values) && typeof values[index] === "number") {
            hourData[variable] = values[index];
          }
        }

        return hourData;
      }
    );

    return {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        elevation: data.elevation,
        timezone: data.timezone,
      },
      hourly: hourlyArray,
      units: data.hourly_units || {},
      source: "open-meteo",
    };
  }

  /**
   * Get weather grid data for map visualization
   * Samples points within the bounding box at the specified resolution
   */
  async getWeatherGrid(options: {
    variable: string;
    hours?: number;
    north: number;
    south: number;
    east: number;
    west: number;
    resolution?: number;
  }): Promise<WeatherGridData> {
    const {
      variable,
      hours = 0,
      north,
      south,
      east,
      west,
      resolution = 2, // Default 2 degrees for reasonable API load
    } = options;

    const mappedVariable = this.mapVariable(variable);
    const unit = VARIABLE_UNITS[mappedVariable] || "";

    // Generate grid points
    const gridPoints: WeatherGridPoint[] = [];
    const fetchPromises: Promise<void>[] = [];

    // Limit resolution to avoid too many API calls
    const effectiveResolution = Math.max(resolution, 1);
    const maxPoints = 100; // Limit total API calls

    // Calculate number of points
    const latPoints = Math.ceil((north - south) / effectiveResolution);
    const lonPoints = Math.ceil((east - west) / effectiveResolution);
    const totalPoints = latPoints * lonPoints;

    // If too many points, increase resolution
    let adjustedResolution = effectiveResolution;
    if (totalPoints > maxPoints) {
      adjustedResolution = Math.sqrt(
        ((north - south) * (east - west)) / maxPoints
      );
    }

    // Build batch of coordinates
    const coordinates: Array<{ lat: number; lon: number }> = [];
    for (let lat = south; lat <= north; lat += adjustedResolution) {
      for (let lon = west; lon <= east; lon += adjustedResolution) {
        coordinates.push({ lat, lon });
      }
    }

    // Fetch data for each coordinate (batch where possible)
    // Open-Meteo supports multi-location queries for some endpoints
    const batchSize = 10;
    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize);

      const batchPromise = Promise.all(
        batch.map(async ({ lat, lon }) => {
          try {
            const params = new URLSearchParams({
              latitude: lat.toString(),
              longitude: lon.toString(),
              hourly: mappedVariable,
              forecast_hours: Math.max(hours + 1, 1).toString(),
              timezone: "UTC",
            });

            const response = await this.fetchWithTimeout(`${FORECAST_API}?${params}`);

            if (response.ok) {
              const data: OpenMeteoForecastResponse = await response.json();
              const values = data.hourly?.[mappedVariable];
              const times = data.hourly?.time;

              if (
                Array.isArray(values) &&
                Array.isArray(times) &&
                hours < values.length
              ) {
                gridPoints.push({
                  lat: data.latitude,
                  lon: data.longitude,
                  value: values[hours] as number,
                  variable: mappedVariable,
                  unit,
                  time: times[hours] as string,
                });
              }
            }
          } catch {
            // Skip failed points silently
          }
        })
      );

      fetchPromises.push(batchPromise.then(() => {}));
    }

    await Promise.all(fetchPromises);

    return {
      grid: gridPoints,
      variable: mappedVariable,
      unit,
      timestamp: new Date().toISOString(),
      bounds: { north, south, east, west },
      resolution: adjustedResolution,
      source: "open-meteo",
      model: "forecast",
    };
  }

  /**
   * Get weather grid using GFS model (better for US region)
   */
  async getGFSGrid(options: {
    variable: string;
    hours?: number;
    north: number;
    south: number;
    east: number;
    west: number;
    resolution?: number;
  }): Promise<WeatherGridData> {
    const {
      variable,
      hours = 0,
      north,
      south,
      east,
      west,
      resolution = 2,
    } = options;

    const mappedVariable = this.mapVariable(variable);
    const unit = VARIABLE_UNITS[mappedVariable] || "";

    const gridPoints: WeatherGridPoint[] = [];

    // Limit resolution for API load
    const effectiveResolution = Math.max(resolution, 0.5);
    const maxPoints = 100;

    const latPoints = Math.ceil((north - south) / effectiveResolution);
    const lonPoints = Math.ceil((east - west) / effectiveResolution);
    const totalPoints = latPoints * lonPoints;

    let adjustedResolution = effectiveResolution;
    if (totalPoints > maxPoints) {
      adjustedResolution = Math.sqrt(
        ((north - south) * (east - west)) / maxPoints
      );
    }

    // Fetch data points
    const coordinates: Array<{ lat: number; lon: number }> = [];
    for (let lat = south; lat <= north; lat += adjustedResolution) {
      for (let lon = west; lon <= east; lon += adjustedResolution) {
        coordinates.push({ lat, lon });
      }
    }

    // Fetch in parallel with rate limiting
    const batchSize = 10;
    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ({ lat, lon }) => {
          try {
            const params = new URLSearchParams({
              latitude: lat.toString(),
              longitude: lon.toString(),
              hourly: mappedVariable,
              forecast_hours: Math.max(hours + 1, 1).toString(),
              timezone: "UTC",
            });

            const response = await this.fetchWithTimeout(`${GFS_API}?${params}`);

            if (response.ok) {
              const data: OpenMeteoForecastResponse = await response.json();
              const values = data.hourly?.[mappedVariable];
              const times = data.hourly?.time;

              if (
                Array.isArray(values) &&
                Array.isArray(times) &&
                hours < values.length
              ) {
                gridPoints.push({
                  lat: data.latitude,
                  lon: data.longitude,
                  value: values[hours] as number,
                  variable: mappedVariable,
                  unit,
                  time: times[hours] as string,
                });
              }
            }
          } catch {
            // Skip failed points
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < coordinates.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      grid: gridPoints,
      variable: mappedVariable,
      unit,
      timestamp: new Date().toISOString(),
      bounds: { north, south, east, west },
      resolution: adjustedResolution,
      source: "open-meteo",
      model: "gfs",
    };
  }

  /**
   * Get weather description from weather code
   */
  static getWeatherDescription(code: number): string {
    return WEATHER_CODES[code] || "Unknown";
  }
}

// Singleton instance for convenience
let clientInstance: OpenMeteoClient | null = null;

export function getOpenMeteoClient(options?: { timeout?: number }): OpenMeteoClient {
  if (!clientInstance) {
    clientInstance = new OpenMeteoClient(options);
  }
  return clientInstance;
}

// Export default instance
export default OpenMeteoClient;
