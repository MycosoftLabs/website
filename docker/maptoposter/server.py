"""
maptoposter REST API Service

Generates minimalist map posters using OpenStreetMap data.
Uses OSMnx to fetch street network data and matplotlib for rendering.

Endpoints:
    POST /generate - Generate map poster
    GET /themes - List available themes
    GET /health - Health check
    GET / - API documentation
"""

import os
import io
import time
import base64
import logging
from datetime import datetime
from typing import Optional

import osmnx as ox
import matplotlib.pyplot as plt
from flask import Flask, request, jsonify, send_file
from themes import get_theme, list_themes, THEMES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('maptoposter-service')

# Configure OSMnx
ox.settings.use_cache = True
ox.settings.cache_folder = '/app/cache'

app = Flask(__name__)


def generate_map(
    location: str,
    theme_name: str = 'default',
    radius_km: float = 2.0,
    width: int = 1200,
    height: int = 1600,
    dpi: int = 150,
    title: Optional[str] = None,
    show_water: bool = True,
    show_parks: bool = True,
    show_buildings: bool = False
) -> dict:
    """Generate a map poster for the given location."""
    start_time = time.time()
    
    try:
        theme = get_theme(theme_name)
        
        # Get location coordinates
        logger.info(f"Geocoding location: {location}")
        point = ox.geocode(location)
        
        if not point:
            return {
                'success': False,
                'error': f'Could not find location: {location}'
            }
        
        lat, lon = point
        logger.info(f"Found coordinates: {lat}, {lon}")
        
        # Create figure with theme background
        fig, ax = plt.subplots(figsize=(width/dpi, height/dpi), dpi=dpi)
        ax.set_facecolor(theme['background'])
        fig.patch.set_facecolor(theme['background'])
        
        # Get and plot street network
        logger.info(f"Fetching street network (radius: {radius_km}km)")
        try:
            G = ox.graph_from_point(
                (lat, lon),
                dist=radius_km * 1000,
                network_type='drive',
                simplify=True
            )
            
            # Plot streets
            ox.plot_graph(
                G,
                ax=ax,
                node_size=0,
                edge_color=theme['streets'],
                edge_linewidth=0.5,
                bgcolor=theme['background'],
                show=False,
                close=False
            )
        except Exception as e:
            logger.warning(f"Could not get street network: {e}")
        
        # Get and plot water features
        if show_water:
            try:
                water = ox.features_from_point(
                    (lat, lon),
                    dist=radius_km * 1000,
                    tags={'natural': 'water'}
                )
                if not water.empty:
                    water.plot(ax=ax, facecolor=theme['water'], edgecolor='none')
            except Exception as e:
                logger.debug(f"No water features: {e}")
        
        # Get and plot parks
        if show_parks:
            try:
                parks = ox.features_from_point(
                    (lat, lon),
                    dist=radius_km * 1000,
                    tags={'leisure': 'park'}
                )
                if not parks.empty:
                    parks.plot(ax=ax, facecolor=theme['parks'], edgecolor='none', alpha=0.6)
            except Exception as e:
                logger.debug(f"No park features: {e}")
        
        # Get and plot buildings (optional, can be slow)
        if show_buildings:
            try:
                buildings = ox.features_from_point(
                    (lat, lon),
                    dist=radius_km * 500,  # Smaller radius for buildings
                    tags={'building': True}
                )
                if not buildings.empty:
                    buildings.plot(ax=ax, facecolor=theme['buildings'], edgecolor='none', alpha=0.4)
            except Exception as e:
                logger.debug(f"No building features: {e}")
        
        # Add title if provided
        if title:
            ax.set_title(
                title.upper(),
                fontsize=20,
                fontweight='bold',
                color=theme['streets'],
                pad=20
            )
        
        # Remove axes
        ax.axis('off')
        ax.set_aspect('equal')
        
        # Save to buffer
        buf = io.BytesIO()
        plt.savefig(
            buf,
            format='png',
            facecolor=theme['background'],
            edgecolor='none',
            bbox_inches='tight',
            pad_inches=0.1
        )
        plt.close(fig)
        buf.seek(0)
        
        # Encode to base64
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        
        processing_time = time.time() - start_time
        
        return {
            'success': True,
            'image': image_base64,
            'format': 'png',
            'width': width,
            'height': height,
            'location': {
                'query': location,
                'lat': lat,
                'lon': lon
            },
            'theme': theme_name,
            'radius_km': radius_km,
            'processing_time_ms': round(processing_time * 1000, 2)
        }
        
    except Exception as e:
        logger.error(f"Map generation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'processing_time_ms': round((time.time() - start_time) * 1000, 2)
        }


@app.route('/', methods=['GET'])
def index():
    """Return API documentation."""
    return jsonify({
        'name': 'maptoposter Service',
        'version': '1.0.0',
        'description': 'Generate minimalist map posters using OpenStreetMap data',
        'endpoints': {
            'POST /generate': {
                'description': 'Generate map poster',
                'content_type': 'application/json',
                'params': {
                    'location': 'City name or address (required)',
                    'theme': f'Theme name (default: default). Options: {list(THEMES.keys())}',
                    'radius_km': 'Radius in kilometers (default: 2.0)',
                    'width': 'Image width in pixels (default: 1200)',
                    'height': 'Image height in pixels (default: 1600)',
                    'title': 'Optional title text',
                    'show_water': 'Show water features (default: true)',
                    'show_parks': 'Show parks (default: true)',
                    'show_buildings': 'Show buildings (default: false)'
                }
            },
            'GET /themes': {'description': 'List available themes'},
            'GET /health': {'description': 'Health check endpoint'}
        },
        'themes_count': len(THEMES),
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'maptoposter',
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/themes', methods=['GET'])
def themes():
    """List available themes."""
    return jsonify({
        'themes': list_themes(),
        'count': len(THEMES)
    })


@app.route('/generate', methods=['POST'])
def generate():
    """Generate map poster."""
    try:
        data = request.get_json()
        
        if not data or 'location' not in data:
            return jsonify({
                'success': False,
                'error': 'Location is required'
            }), 400
        
        result = generate_map(
            location=data['location'],
            theme_name=data.get('theme', 'default'),
            radius_km=float(data.get('radius_km', 2.0)),
            width=int(data.get('width', 1200)),
            height=int(data.get('height', 1600)),
            title=data.get('title'),
            show_water=data.get('show_water', True),
            show_parks=data.get('show_parks', True),
            show_buildings=data.get('show_buildings', False)
        )
        
        if result['success']:
            return jsonify(result)
        return jsonify(result), 500
        
    except Exception as e:
        logger.error(f"Generate failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('MAP_PORT', 8081))
    logger.info(f"Starting maptoposter service on port {port}")
    
    # Create cache directory
    os.makedirs('/app/cache', exist_ok=True)
    os.makedirs('/app/output', exist_ok=True)
    
    app.run(host='0.0.0.0', port=port, debug=True)
