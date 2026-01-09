/**
 * Google Earth Engine Client Library
 * 
 * Server-side integration with Google Earth Engine REST API
 * Reference: https://developers.google.com/earth-engine/apidocs
 * 
 * This module handles:
 * - OAuth2 authentication with service account
 * - REST API calls to Earth Engine
 * - Tile generation for Cesium globe
 * - Dataset queries (Landsat, Sentinel, MODIS, etc.)
 * 
 * MycoEarthSim Service Account:
 * - Project: fiery-return-438409-r5
 * - Email: mycoearthsim@fiery-return-438409-r5.iam.gserviceaccount.com
 */

import { SignJWT, importPKCS8 } from 'jose';
import * as fs from 'fs';
import * as path from 'path';

// Try to load credentials from JSON file
function loadCredentials() {
  try {
    const keyPath = path.join(process.cwd(), 'keys', 'fiery-return-438409-r5-a72bf714b4a0.json');
    if (fs.existsSync(keyPath)) {
      const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
      return {
        projectId: keyData.project_id,
        serviceAccountEmail: keyData.client_email,
        privateKey: keyData.private_key,
        clientId: keyData.client_id,
      };
    }
  } catch (error) {
    console.warn('Failed to load GEE credentials from file:', error);
  }
  
  // Fallback to environment variables
  return {
    projectId: process.env.GEE_PROJECT_ID || 'fiery-return-438409-r5',
    serviceAccountEmail: process.env.GEE_SERVICE_ACCOUNT_EMAIL || 'mycoearthsim@fiery-return-438409-r5.iam.gserviceaccount.com',
    privateKey: process.env.GEE_PRIVATE_KEY,
    clientId: process.env.GEE_CLIENT_ID || '101255101032771422954',
  };
}

// Configuration from JSON file or environment
const GEE_CONFIG = loadCredentials();

// GEE REST API base URL
const GEE_API_BASE = 'https://earthengine.googleapis.com/v1';
const GEE_HIGHVOLUME_API = 'https://earthengine-highvolume.googleapis.com/v1';

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get OAuth2 access token using service account credentials
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  const privateKey = GEE_CONFIG.privateKey;
  const serviceEmail = GEE_CONFIG.serviceAccountEmail;

  if (!privateKey || !serviceEmail) {
    throw new Error('GEE service account credentials not configured. Set GEE_PRIVATE_KEY and GEE_SERVICE_ACCOUNT_EMAIL environment variables.');
  }

  try {
    // Create JWT for service account authentication
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const key = await importPKCS8(privateKey, 'RS256');
    
    const jwt = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/earthengine',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(serviceEmail)
      .setSubject(serviceEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt(now)
      .setExpirationTime(expiry)
      .sign(key);

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    accessToken = tokenData.access_token;
    tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

    return accessToken!;
  } catch (error) {
    console.error('GEE authentication error:', error);
    throw error;
  }
}

/**
 * Check if GEE is properly configured
 */
export function isGEEConfigured(): boolean {
  return !!(GEE_CONFIG.privateKey && GEE_CONFIG.serviceAccountEmail);
}

/**
 * Get available Earth Engine datasets
 */
export interface GEEDataset {
  id: string;
  name: string;
  description: string;
  type: 'IMAGE' | 'IMAGE_COLLECTION' | 'TABLE' | 'TABLE_COLLECTION';
  bands?: string[];
}

export const AVAILABLE_DATASETS: GEEDataset[] = [
  {
    id: 'COPERNICUS/S2_SR_HARMONIZED',
    name: 'Sentinel-2 SR',
    description: 'Sentinel-2 MSI: MultiSpectral Instrument, Level-2A',
    type: 'IMAGE_COLLECTION',
    bands: ['B2', 'B3', 'B4', 'B8', 'B11', 'B12'],
  },
  {
    id: 'LANDSAT/LC09/C02/T1_L2',
    name: 'Landsat 9',
    description: 'USGS Landsat 9 Level 2, Collection 2, Tier 1',
    type: 'IMAGE_COLLECTION',
    bands: ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
  },
  {
    id: 'MODIS/006/MOD13Q1',
    name: 'MODIS Vegetation',
    description: 'MODIS Vegetation Indices 16-Day Global 250m',
    type: 'IMAGE_COLLECTION',
    bands: ['NDVI', 'EVI'],
  },
  {
    id: 'USGS/SRTMGL1_003',
    name: 'SRTM Elevation',
    description: 'NASA SRTM Digital Elevation 30m',
    type: 'IMAGE',
    bands: ['elevation'],
  },
  {
    id: 'ESA/WorldCover/v200',
    name: 'ESA WorldCover',
    description: 'ESA WorldCover 10m v200',
    type: 'IMAGE_COLLECTION',
    bands: ['Map'],
  },
  {
    id: 'JAXA/ALOS/AW3D30/V3_2',
    name: 'ALOS World 3D',
    description: 'ALOS World 3D - 30m (AW3D30)',
    type: 'IMAGE',
    bands: ['DSM', 'MSK'],
  },
];

/**
 * Create a map visualization for a dataset
 */
export interface MapVisualization {
  mapId: string;
  tileUrlTemplate: string;
  expiresAt: number;
}

export async function createMapVisualization(
  datasetId: string,
  visParams: {
    bands?: string[];
    min?: number;
    max?: number;
    palette?: string[];
    region?: { north: number; south: number; east: number; west: number };
  }
): Promise<MapVisualization> {
  if (!isGEEConfigured()) {
    throw new Error('GEE not configured - using fallback imagery');
  }

  const token = await getAccessToken();
  const projectPath = `projects/${GEE_CONFIG.projectId}`;

  // Build Earth Engine expression
  const expression = {
    expression: {
      functionInvocationValue: {
        functionName: 'Image.visualize',
        arguments: {
          image: {
            functionInvocationValue: {
              functionName: 'Image.load',
              arguments: {
                id: { constantValue: datasetId },
              },
            },
          },
          bands: visParams.bands ? { arrayValue: { values: visParams.bands.map(b => ({ stringValue: b })) } } : undefined,
          min: visParams.min !== undefined ? { constantValue: visParams.min } : undefined,
          max: visParams.max !== undefined ? { constantValue: visParams.max } : undefined,
          palette: visParams.palette ? { arrayValue: { values: visParams.palette.map(c => ({ stringValue: c })) } } : undefined,
        },
      },
    },
  };

  // Create map
  const response = await fetch(`${GEE_API_BASE}/${projectPath}/maps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expression),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create GEE map: ${error}`);
  }

  const mapData = await response.json();
  
  return {
    mapId: mapData.name,
    tileUrlTemplate: `${GEE_API_BASE}/${mapData.name}/tiles/{z}/{x}/{y}`,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  };
}

/**
 * Get tile URL for a GEE map
 */
export async function getTileUrl(
  mapId: string,
  z: number,
  x: number,
  y: number
): Promise<string> {
  const token = await getAccessToken();
  return `${GEE_API_BASE}/${mapId}/tiles/${z}/${x}/${y}?access_token=${token}`;
}

/**
 * Compute statistics for a region
 */
export interface RegionStats {
  mean?: number;
  min?: number;
  max?: number;
  stdDev?: number;
  count?: number;
}

export async function computeRegionStats(
  datasetId: string,
  band: string,
  region: { north: number; south: number; east: number; west: number }
): Promise<RegionStats> {
  if (!isGEEConfigured()) {
    // Return mock data when not configured
    return {
      mean: 0.5,
      min: 0.1,
      max: 0.9,
      stdDev: 0.2,
      count: 1000,
    };
  }

  const token = await getAccessToken();
  const projectPath = `projects/${GEE_CONFIG.projectId}`;

  // Build computation expression
  const expression = {
    expression: {
      functionInvocationValue: {
        functionName: 'Image.reduceRegion',
        arguments: {
          image: {
            functionInvocationValue: {
              functionName: 'Image.load',
              arguments: {
                id: { constantValue: datasetId },
              },
            },
          },
          reducer: {
            functionInvocationValue: {
              functionName: 'Reducer.mean',
              arguments: {},
            },
          },
          geometry: {
            functionInvocationValue: {
              functionName: 'Geometry.Rectangle',
              arguments: {
                coords: {
                  arrayValue: {
                    values: [
                      { doubleValue: region.west },
                      { doubleValue: region.south },
                      { doubleValue: region.east },
                      { doubleValue: region.north },
                    ],
                  },
                },
              },
            },
          },
          scale: { constantValue: 1000 },
        },
      },
    },
  };

  const response = await fetch(`${GEE_API_BASE}/${projectPath}/value:compute`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expression),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to compute region stats: ${error}`);
  }

  const result = await response.json();
  return result.result || {};
}

/**
 * Fallback tile providers when GEE is not configured
 */
export const FALLBACK_TILE_PROVIDERS = {
  satellite: {
    name: 'ESRI World Imagery',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
  },
  terrain: {
    name: 'Stamen Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: 'Stadia Maps, Stamen Design',
  },
  openStreetMap: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
};

/**
 * Get the best available tile URL for a location
 */
export function getBestTileUrl(
  type: 'satellite' | 'terrain' | 'hybrid',
  z: number,
  x: number,
  y: number
): string {
  // When GEE is not configured, use fallback providers
  switch (type) {
    case 'satellite':
      return FALLBACK_TILE_PROVIDERS.satellite.url
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());
    case 'terrain':
      return FALLBACK_TILE_PROVIDERS.terrain.url
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());
    case 'hybrid':
    default:
      return FALLBACK_TILE_PROVIDERS.satellite.url
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());
  }
}
