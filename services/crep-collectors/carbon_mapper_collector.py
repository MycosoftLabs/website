"""
Carbon Mapper Data Collector

Fetches methane and CO2 plume data from Carbon Mapper API.
Source: https://data.carbonmapper.org/

Data includes:
- Methane plume locations and concentrations
- CO2 emission sources
- Temporal emission estimates
- Source attribution (oil/gas, landfill, agriculture, etc.)
"""

import os
import asyncio
from datetime import datetime
from typing import Any

import httpx
import uvicorn

from base_collector import BaseCollector


class CarbonMapperCollector(BaseCollector):
    """Collector for Carbon Mapper methane/CO2 plume data."""
    
    def __init__(self):
        super().__init__()
        self.api_base = os.getenv(
            "CARBONMAPPER_API_URL",
            "https://api.carbonmapper.org/api/v1"
        )
        # Fallback data URL (public GeoJSON)
        self.geojson_url = "https://data.carbonmapper.org/api/v1/plumes/geojson"
    
    def get_service_name(self) -> str:
        return "carbon-mapper"
    
    async def collect_data(self) -> list[dict]:
        """Fetch plume data from Carbon Mapper."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Try the API endpoint first
                response = await client.get(
                    f"{self.api_base}/plumes",
                    params={
                        "limit": 5000,
                        "format": "geojson"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    features = data.get("features", [])
                    self.logger.info("api_fetch_success", plumes=len(features))
                    return features
                    
            except Exception as e:
                self.logger.warning("api_fetch_failed", error=str(e))
            
            # Fallback to public GeoJSON
            try:
                response = await client.get(self.geojson_url)
                if response.status_code == 200:
                    data = response.json()
                    features = data.get("features", [])
                    self.logger.info("geojson_fetch_success", plumes=len(features))
                    return features
            except Exception as e:
                self.logger.error("geojson_fetch_failed", error=str(e))
                raise
        
        return []
    
    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Transform GeoJSON features to CREP format."""
        result = []
        
        for feature in raw_data:
            try:
                props = feature.get("properties", {})
                geometry = feature.get("geometry", {})
                coords = geometry.get("coordinates", [0, 0])
                
                # Handle Point or Polygon geometries
                if geometry.get("type") == "Point":
                    lng, lat = coords[0], coords[1] if len(coords) > 1 else (0, 0)
                elif geometry.get("type") == "Polygon":
                    # Use centroid of polygon
                    all_coords = coords[0] if coords else [[0, 0]]
                    lng = sum(c[0] for c in all_coords) / len(all_coords)
                    lat = sum(c[1] for c in all_coords) / len(all_coords)
                else:
                    lng, lat = 0, 0
                
                transformed = {
                    "id": f"cm-{props.get('plume_id', hash(str(feature)))}",
                    "type": "emission",
                    "subtype": props.get("gas_type", "methane").lower(),
                    "location": {
                        "latitude": lat,
                        "longitude": lng,
                        "type": geometry.get("type", "Point")
                    },
                    "properties": {
                        "gas": props.get("gas_type", "CH4"),
                        "concentration_ppm": props.get("concentration", None),
                        "emission_rate_kg_hr": props.get("emission_rate", None),
                        "source_type": props.get("source_type", "unknown"),
                        "sector": props.get("sector", "unknown"),
                        "confidence": props.get("confidence", None),
                        "plume_area_m2": props.get("plume_area", None),
                    },
                    "timestamp": props.get("observation_date", datetime.utcnow().isoformat()),
                    "source": "carbon-mapper",
                    "source_url": f"https://data.carbonmapper.org/#/plume/{props.get('plume_id', '')}",
                }
                
                # Only include if we have valid coordinates
                if lat != 0 or lng != 0:
                    result.append(transformed)
                    
            except Exception as e:
                self.logger.warning("transform_error", error=str(e), feature_id=feature.get("id"))
                continue
        
        return result


# Create collector instance
collector = CarbonMapperCollector()
app = collector.app


@app.on_event("startup")
async def startup():
    await collector.start()


@app.on_event("shutdown")
async def shutdown():
    await collector.stop()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8201"))
    uvicorn.run(app, host="0.0.0.0", port=port)
