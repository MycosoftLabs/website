/**
 * Maptoposter Client
 * 
 * Client for the maptoposter service that generates minimalist map posters.
 * Used in NatureOS Earth simulator and CREP dashboards for visualizing
 * geographic data with stylized map backgrounds.
 * 
 * @see https://github.com/originalankur/maptoposter
 */

export interface MapTheme {
  id: string;
  name: string;
}

export interface MapGenerationRequest {
  /** City name or full address */
  location: string;
  /** Theme name (default: 'default') */
  theme?: string;
  /** Radius in kilometers (default: 2.0) */
  radiusKm?: number;
  /** Image width in pixels (default: 1200) */
  width?: number;
  /** Image height in pixels (default: 1600) */
  height?: number;
  /** Optional title text */
  title?: string;
  /** Show water features (default: true) */
  showWater?: boolean;
  /** Show parks (default: true) */
  showParks?: boolean;
  /** Show buildings (default: false, can be slow) */
  showBuildings?: boolean;
}

export interface MapGenerationResult {
  success: boolean;
  /** Base64-encoded PNG image */
  image?: string;
  format?: string;
  width?: number;
  height?: number;
  location?: {
    query: string;
    lat: number;
    lon: number;
  };
  theme?: string;
  radiusKm?: number;
  processingTimeMs?: number;
  error?: string;
}

// Available themes (must match themes.py in the service)
export const MAP_THEMES: MapTheme[] = [
  { id: 'default', name: 'Default' },
  { id: 'midnight', name: 'Midnight' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'forest', name: 'Forest' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'monochrome', name: 'Monochrome' },
  { id: 'paper', name: 'Paper' },
  { id: 'nordic', name: 'Nordic' },
  { id: 'candy', name: 'Candy' },
  { id: 'desert', name: 'Desert' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'neon', name: 'Neon' },
  { id: 'arctic', name: 'Arctic' },
  { id: 'lavender', name: 'Lavender' },
  { id: 'autumn', name: 'Autumn' },
  { id: 'matrix', name: 'Matrix' },
  { id: 'mycosoft', name: 'Mycosoft' }
];

/**
 * Generate a map poster using the maptoposter service
 */
export async function generateMapPoster(
  request: MapGenerationRequest,
  serviceUrl?: string
): Promise<MapGenerationResult> {
  const endpoint = serviceUrl || process.env.MAPTOPOSTER_SERVICE_URL || 'http://localhost:8081';
  
  try {
    const response = await fetch(`${endpoint}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: request.location,
        theme: request.theme || 'default',
        radius_km: request.radiusKm || 2.0,
        width: request.width || 1200,
        height: request.height || 1600,
        title: request.title,
        show_water: request.showWater ?? true,
        show_parks: request.showParks ?? true,
        show_buildings: request.showBuildings ?? false
      })
    });
    
    const data = await response.json();
    
    return {
      success: data.success,
      image: data.image,
      format: data.format,
      width: data.width,
      height: data.height,
      location: data.location,
      theme: data.theme,
      radiusKm: data.radius_km,
      processingTimeMs: data.processing_time_ms,
      error: data.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate map'
    };
  }
}

/**
 * Get the list of available themes from the service
 */
export async function getThemes(
  serviceUrl?: string
): Promise<{ themes: MapTheme[]; count: number }> {
  const endpoint = serviceUrl || process.env.MAPTOPOSTER_SERVICE_URL || 'http://localhost:8081';
  
  try {
    const response = await fetch(`${endpoint}/themes`);
    const data = await response.json();
    return {
      themes: data.themes || MAP_THEMES,
      count: data.count || MAP_THEMES.length
    };
  } catch {
    // Return static themes if service is unavailable
    return {
      themes: MAP_THEMES,
      count: MAP_THEMES.length
    };
  }
}

/**
 * Check if the maptoposter service is available
 */
export async function checkServiceHealth(
  serviceUrl?: string
): Promise<{ available: boolean; status?: string }> {
  const endpoint = serviceUrl || process.env.MAPTOPOSTER_SERVICE_URL || 'http://localhost:8081';
  
  try {
    const response = await fetch(`${endpoint}/health`, { method: 'GET' });
    const data = await response.json();
    return {
      available: response.ok && data.status === 'healthy',
      status: data.status
    };
  } catch {
    return { available: false };
  }
}

/**
 * Convert base64 map image to data URL for use in <img> tags
 */
export function toDataUrl(base64Image: string, format = 'png'): string {
  return `data:image/${format};base64,${base64Image}`;
}

/**
 * Download map image as a file
 */
export function downloadMapImage(
  base64Image: string,
  filename = 'map-poster.png'
): void {
  const link = document.createElement('a');
  link.href = toDataUrl(base64Image);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default {
  generateMapPoster,
  getThemes,
  checkServiceHealth,
  toDataUrl,
  downloadMapImage,
  MAP_THEMES
};
