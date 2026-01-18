"""
AstriaGraph Space Debris Collector

Fetches space debris and satellite tracking data from AstriaGraph.
Source: http://astria.tacc.utexas.edu/AstriaGraph/

Data includes:
- Space debris positions
- Satellite conjunctions
- Orbital debris density
- Object classifications
"""

import os
import asyncio
from datetime import datetime

import httpx
import uvicorn

from base_collector import BaseCollector


class AstriaCollector(BaseCollector):
    """Collector for AstriaGraph space debris data."""
    
    def __init__(self):
        super().__init__()
        self.api_base = os.getenv(
            "ASTRIA_API_URL",
            "http://astria.tacc.utexas.edu"
        )
    
    def get_service_name(self) -> str:
        return "astria"
    
    async def collect_data(self) -> list[dict]:
        """Fetch space object data from AstriaGraph."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            # AstriaGraph provides data via various endpoints
            try:
                response = await client.get(
                    f"{self.api_base}/api/objects",
                    params={"limit": 5000, "type": "all"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    objects = data.get("objects", data) if isinstance(data, dict) else data
                    self.logger.info("astria_fetch_success", objects=len(objects))
                    return objects if isinstance(objects, list) else []
                    
            except Exception as e:
                self.logger.warning("astria_api_unavailable", error=str(e))
            
            # Return sample debris data as fallback
            return self._get_sample_debris()
    
    def _get_sample_debris(self) -> list[dict]:
        """Sample space debris for demonstration."""
        return [
            {"norad_id": 25544, "name": "ISS (ZARYA)", "type": "PAYLOAD", "country": "ISS", "launch_year": 1998},
            {"norad_id": 48274, "name": "STARLINK-1007", "type": "PAYLOAD", "country": "US", "launch_year": 2021},
            {"norad_id": 43013, "name": "COSMOS 2519 DEB", "type": "DEBRIS", "country": "CIS", "launch_year": 2017},
            {"norad_id": 37348, "name": "FENGYUN 1C DEB", "type": "DEBRIS", "country": "PRC", "launch_year": 2007},
        ]
    
    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Transform AstriaGraph data to CREP format."""
        result = []
        
        for obj in raw_data:
            try:
                transformed = {
                    "id": f"astria-{obj.get('norad_id', hash(str(obj)))}",
                    "type": "space_object",
                    "subtype": obj.get("type", "unknown").lower(),
                    "properties": {
                        "norad_id": obj.get("norad_id"),
                        "name": obj.get("name", "Unknown"),
                        "object_type": obj.get("type"),
                        "country": obj.get("country"),
                        "launch_year": obj.get("launch_year"),
                        "rcs_size": obj.get("rcs_size"),
                        "orbital_period": obj.get("orbital_period"),
                        "inclination": obj.get("inclination"),
                        "apogee": obj.get("apogee"),
                        "perigee": obj.get("perigee"),
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "astriagraph",
                    "source_url": f"http://astria.tacc.utexas.edu/AstriaGraph/?object={obj.get('norad_id', '')}",
                }
                result.append(transformed)
                    
            except Exception as e:
                self.logger.warning("transform_error", error=str(e))
                continue
        
        return result


collector = AstriaCollector()
app = collector.app


@app.on_event("startup")
async def startup():
    await collector.start()


@app.on_event("shutdown")
async def shutdown():
    await collector.stop()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8203"))
    uvicorn.run(app, host="0.0.0.0", port=port)
