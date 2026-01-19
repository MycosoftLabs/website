/**
 * Map Generation API Endpoint
 * 
 * Generates minimalist map posters for NatureOS Earth simulator
 * and CREP geographic visualizations.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateMapPoster,
  getThemes,
  checkServiceHealth,
  MAP_THEMES
} from '@/lib/maps/maptoposter-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'generate', ...params } = body;

    switch (action) {
      case 'generate': {
        if (!params.location) {
          return NextResponse.json(
            { error: 'Location is required' },
            { status: 400 }
          );
        }
        
        const result = await generateMapPoster({
          location: params.location,
          theme: params.theme,
          radiusKm: params.radiusKm || params.radius_km,
          width: params.width,
          height: params.height,
          title: params.title,
          showWater: params.showWater ?? params.show_water,
          showParks: params.showParks ?? params.show_parks,
          showBuildings: params.showBuildings ?? params.show_buildings
        });
        
        return NextResponse.json(result);
      }

      case 'themes': {
        const themes = await getThemes();
        return NextResponse.json(themes);
      }

      case 'health': {
        const health = await checkServiceHealth();
        return NextResponse.json(health);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Map generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Map generation failed' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check service availability
  const health = await checkServiceHealth();
  
  return NextResponse.json({
    name: 'Map Generation API',
    version: '1.0.0',
    description: 'Generate minimalist map posters using OpenStreetMap data',
    serviceAvailable: health.available,
    endpoints: {
      'POST /api/maps/generate': {
        actions: {
          generate: {
            description: 'Generate map poster',
            params: {
              location: 'City name or address (required)',
              theme: `Theme name. Options: ${MAP_THEMES.map(t => t.id).join(', ')}`,
              radiusKm: 'Radius in kilometers (default: 2.0)',
              width: 'Image width in pixels (default: 1200)',
              height: 'Image height in pixels (default: 1600)',
              title: 'Optional title text',
              showWater: 'Show water features (default: true)',
              showParks: 'Show parks (default: true)',
              showBuildings: 'Show buildings (default: false)'
            }
          },
          themes: {
            description: 'List available themes'
          },
          health: {
            description: 'Check maptoposter service health'
          }
        }
      }
    },
    themes: MAP_THEMES,
    useCases: [
      'NatureOS Earth simulator map backgrounds',
      'CREP geographic data overlays',
      'Species distribution visualizations',
      'MycoBrain device location mapping',
      'Custom poster generation for users'
    ]
  });
}
