"""
Power Grid Data Collector

Fetches U.S. power grid infrastructure data from HIFLD and EIA ArcGIS services:
- Transmission lines (HIFLD) — 69kV to 765kV high-voltage lines
- Electric substations (HIFLD) — taps, substations, switching stations
- Power plants (EIA) — operable generating plants >= 1MW

Data Sources:
- HIFLD: https://hifld-geoplatform.opendata.arcgis.com/
- EIA US Energy Atlas: https://atlas.eia.gov/
- OpenGridWorks layers: tx, datacenters, hpoints, rowTx, rowSubs
"""

import os
import asyncio
from datetime import datetime
from typing import Any

import httpx
import uvicorn

from base_collector import BaseCollector


# ---------------------------------------------------------------------------
# ArcGIS Feature Service endpoints
# ---------------------------------------------------------------------------

HIFLD_TRANSMISSION_LINES = (
    "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/"
    "US_Electric_Power_Transmission_Lines/FeatureServer/0/query"
)

HIFLD_SUBSTATIONS = (
    "https://services.arcgis.com/G4S1dGvn7PIgYd6Y/ArcGIS/rest/services/"
    "HIFLD_electric_power_substations/FeatureServer/0/query"
)

EIA_POWER_PLANTS = (
    "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/"
    "Power_Plants/FeatureServer/0/query"
)

# Max records per ArcGIS page (service limit is 2000)
PAGE_SIZE = 2000
MAX_PAGES = 25  # safety cap: 50,000 features per layer

# Fields to request per layer (minimise payload)
TX_FIELDS = "OBJECTID,ID,TYPE,STATUS,OWNER,VOLTAGE,VOLT_CLASS,SUB_1,SUB_2"
SUB_FIELDS = "OBJECTID,ID,NAME,CITY,STATE,TYPE,STATUS,LINES,MAX_VOLT,MIN_VOLT,LATITUDE,LONGITUDE"
PLANT_FIELDS = "OBJECTID,Plant_Code,Plant_Name,Utility_Na,PrimSource,Total_MW,Latitude,Longitude,State,County,Sector_Nam"


class PowerGridCollector(BaseCollector):
    """Collector for U.S. power grid infrastructure via HIFLD & EIA ArcGIS."""

    def __init__(self):
        super().__init__()
        self.collect_interval = int(os.getenv("COLLECT_INTERVAL", "3600"))
        self._bbox = os.getenv(
            "GRID_BBOX",
            "-125.0,24.0,-66.0,50.0"  # CONUS default
        )

    def get_service_name(self) -> str:
        return "power-grid"

    # ------------------------------------------------------------------
    # ArcGIS paginated fetcher
    # ------------------------------------------------------------------

    async def _fetch_arcgis_layer(
        self,
        url: str,
        out_fields: str,
        where: str = "1=1",
        return_geometry: bool = True,
    ) -> list[dict]:
        """Page through an ArcGIS FeatureServer query endpoint."""
        all_features: list[dict] = []
        offset = 0

        async with httpx.AsyncClient(timeout=60.0) as client:
            for _ in range(MAX_PAGES):
                params: dict[str, Any] = {
                    "where": where,
                    "outFields": out_fields,
                    "returnGeometry": str(return_geometry).lower(),
                    "f": "geojson",
                    "resultRecordCount": PAGE_SIZE,
                    "resultOffset": offset,
                }

                # Add bbox envelope filter
                if self._bbox:
                    west, south, east, north = self._bbox.split(",")
                    params["geometry"] = f"{west},{south},{east},{north}"
                    params["geometryType"] = "esriGeometryEnvelope"
                    params["spatialRel"] = "esriSpatialRelIntersects"
                    params["inSR"] = "4326"
                    params["outSR"] = "4326"

                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                features = data.get("features", [])
                if not features:
                    break

                all_features.extend(features)
                self.logger.info(
                    "arcgis_page",
                    url=url.split("/rest/")[1][:60],
                    offset=offset,
                    count=len(features),
                    total=len(all_features),
                )

                if len(features) < PAGE_SIZE:
                    break
                offset += PAGE_SIZE

        return all_features

    # ------------------------------------------------------------------
    # Collect
    # ------------------------------------------------------------------

    async def collect_data(self) -> list[dict]:
        """Fetch transmission lines, substations, and power plants in parallel."""
        tx_task = self._fetch_arcgis_layer(
            HIFLD_TRANSMISSION_LINES,
            TX_FIELDS,
            where="STATUS='IN SERVICE'",
        )
        sub_task = self._fetch_arcgis_layer(
            HIFLD_SUBSTATIONS,
            SUB_FIELDS,
            where="STATUS='IN SERVICE'",
        )
        plant_task = self._fetch_arcgis_layer(
            EIA_POWER_PLANTS,
            PLANT_FIELDS,
            where="1=1",
            return_geometry=True,
        )

        tx_features, sub_features, plant_features = await asyncio.gather(
            tx_task, sub_task, plant_task
        )

        self.logger.info(
            "collection_summary",
            transmission_lines=len(tx_features),
            substations=len(sub_features),
            power_plants=len(plant_features),
        )

        return [
            {"layer": "transmission_lines", "features": tx_features},
            {"layer": "substations", "features": sub_features},
            {"layer": "power_plants", "features": plant_features},
        ]

    # ------------------------------------------------------------------
    # Transform
    # ------------------------------------------------------------------

    def transform_data(self, raw_data: list[dict]) -> list[dict]:
        """Normalise all layers into CREP unified entity format."""
        result: list[dict] = []

        for layer_data in raw_data:
            layer = layer_data["layer"]
            features = layer_data["features"]

            for feat in features:
                try:
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})

                    if layer == "transmission_lines":
                        result.append(self._transform_tx_line(props, geom))
                    elif layer == "substations":
                        result.append(self._transform_substation(props, geom))
                    elif layer == "power_plants":
                        result.append(self._transform_plant(props, geom))
                except Exception as e:
                    self.logger.warning("transform_error", layer=layer, error=str(e))
                    continue

        return result

    def _transform_tx_line(self, props: dict, geom: dict) -> dict:
        coords = geom.get("coordinates", [])
        voltage = props.get("VOLTAGE", -999999)
        if voltage == -999999:
            voltage = None

        return {
            "id": f"tx-{props.get('ID', props.get('OBJECTID'))}",
            "type": "infrastructure",
            "subtype": "transmission_line",
            "location": {
                "type": geom.get("type", "LineString"),
                "coordinates": coords,
            },
            "properties": {
                "name": f"{props.get('OWNER', 'Unknown')} — {props.get('VOLT_CLASS', '')}",
                "owner": props.get("OWNER"),
                "voltage_kv": voltage,
                "volt_class": props.get("VOLT_CLASS"),
                "line_type": props.get("TYPE"),
                "status": props.get("STATUS"),
                "sub_1": props.get("SUB_1"),
                "sub_2": props.get("SUB_2"),
            },
            "timestamp": datetime.utcnow().isoformat(),
            "source": "hifld",
            "source_url": "https://hifld-geoplatform.opendata.arcgis.com/datasets/electric-power-transmission-lines",
        }

    def _transform_substation(self, props: dict, geom: dict) -> dict:
        coords = geom.get("coordinates", [0, 0]) if geom else [0, 0]
        lat = props.get("LATITUDE", coords[1] if len(coords) > 1 else 0)
        lng = props.get("LONGITUDE", coords[0] if len(coords) > 0 else 0)

        return {
            "id": f"sub-{props.get('ID', props.get('OBJECTID'))}",
            "type": "infrastructure",
            "subtype": "grid_substation",
            "location": {
                "latitude": lat,
                "longitude": lng,
                "type": "Point",
            },
            "properties": {
                "name": props.get("NAME", "Unknown Substation"),
                "city": props.get("CITY"),
                "state": props.get("STATE"),
                "sub_type": props.get("TYPE"),
                "status": props.get("STATUS"),
                "lines": props.get("LINES"),
                "max_volt_kv": props.get("MAX_VOLT"),
                "min_volt_kv": props.get("MIN_VOLT"),
            },
            "timestamp": datetime.utcnow().isoformat(),
            "source": "hifld",
            "source_url": "https://hifld-geoplatform.opendata.arcgis.com/",
        }

    def _transform_plant(self, props: dict, geom: dict) -> dict:
        coords = geom.get("coordinates", [0, 0]) if geom else [0, 0]
        lat = props.get("Latitude", coords[1] if len(coords) > 1 else 0)
        lng = props.get("Longitude", coords[0] if len(coords) > 0 else 0)

        return {
            "id": f"pp-{props.get('Plant_Code', props.get('OBJECTID'))}",
            "type": "infrastructure",
            "subtype": "grid_power_plant",
            "location": {
                "latitude": lat,
                "longitude": lng,
                "type": "Point",
            },
            "properties": {
                "name": props.get("Plant_Name", "Unknown Plant"),
                "utility": props.get("Utility_Na"),
                "primary_source": props.get("PrimSource"),
                "total_mw": props.get("Total_MW"),
                "state": props.get("State"),
                "county": props.get("County"),
                "sector": props.get("Sector_Nam"),
            },
            "timestamp": datetime.utcnow().isoformat(),
            "source": "eia",
            "source_url": "https://atlas.eia.gov/datasets/eia::power-plants",
        }


# ---------------------------------------------------------------------------
# Additional query endpoints
# ---------------------------------------------------------------------------

collector = PowerGridCollector()
app = collector.app


@app.get("/transmission-lines")
async def get_transmission_lines(
    bbox: str | None = None,
    min_voltage: int = 0,
    limit: int = 5000,
    offset: int = 0,
):
    """Return cached transmission lines, optionally filtered by bbox/voltage."""
    items = [
        i for i in collector._cached_data
        if i.get("subtype") == "transmission_line"
    ]
    if min_voltage > 0:
        items = [
            i for i in items
            if (i["properties"].get("voltage_kv") or 0) >= min_voltage
        ]
    if bbox:
        west, south, east, north = [float(v) for v in bbox.split(",")]
        items = _filter_bbox_lines(items, west, south, east, north)
    return {
        "total": len(items),
        "items": items[offset : offset + limit],
    }


@app.get("/substations")
async def get_substations(
    bbox: str | None = None,
    limit: int = 5000,
    offset: int = 0,
):
    """Return cached substations."""
    items = [
        i for i in collector._cached_data
        if i.get("subtype") == "grid_substation"
    ]
    if bbox:
        west, south, east, north = [float(v) for v in bbox.split(",")]
        items = _filter_bbox_points(items, west, south, east, north)
    return {
        "total": len(items),
        "items": items[offset : offset + limit],
    }


@app.get("/power-plants")
async def get_power_plants(
    bbox: str | None = None,
    source: str | None = None,
    limit: int = 5000,
    offset: int = 0,
):
    """Return cached power plants, optionally filtered by energy source."""
    items = [
        i for i in collector._cached_data
        if i.get("subtype") == "grid_power_plant"
    ]
    if source:
        items = [
            i for i in items
            if (i["properties"].get("primary_source") or "").lower() == source.lower()
        ]
    if bbox:
        west, south, east, north = [float(v) for v in bbox.split(",")]
        items = _filter_bbox_points(items, west, south, east, north)
    return {
        "total": len(items),
        "items": items[offset : offset + limit],
    }


@app.get("/summary")
async def get_summary():
    """Return aggregate statistics for the power grid data."""
    tx = [i for i in collector._cached_data if i.get("subtype") == "transmission_line"]
    subs = [i for i in collector._cached_data if i.get("subtype") == "grid_substation"]
    plants = [i for i in collector._cached_data if i.get("subtype") == "grid_power_plant"]

    voltage_classes: dict[str, int] = {}
    for line in tx:
        vc = line["properties"].get("volt_class", "Unknown")
        voltage_classes[vc] = voltage_classes.get(vc, 0) + 1

    energy_sources: dict[str, int] = {}
    total_capacity_mw = 0.0
    for plant in plants:
        src = plant["properties"].get("primary_source", "Unknown")
        energy_sources[src] = energy_sources.get(src, 0) + 1
        total_capacity_mw += plant["properties"].get("total_mw", 0) or 0

    return {
        "transmission_lines": len(tx),
        "substations": len(subs),
        "power_plants": len(plants),
        "voltage_classes": voltage_classes,
        "energy_sources": energy_sources,
        "total_capacity_mw": round(total_capacity_mw, 1),
        "last_collection": collector._last_collection.isoformat() if collector._last_collection else None,
    }


# ---------------------------------------------------------------------------
# Bbox helpers
# ---------------------------------------------------------------------------

def _filter_bbox_points(items: list[dict], west: float, south: float, east: float, north: float) -> list[dict]:
    result = []
    for item in items:
        loc = item.get("location", {})
        lat = loc.get("latitude", 0)
        lng = loc.get("longitude", 0)
        if south <= lat <= north and west <= lng <= east:
            result.append(item)
    return result


def _filter_bbox_lines(items: list[dict], west: float, south: float, east: float, north: float) -> list[dict]:
    """Quick check: include line if any coordinate falls within bbox."""
    result = []
    for item in items:
        coords = item.get("location", {}).get("coordinates", [])
        for coord in coords:
            if isinstance(coord, (list, tuple)) and len(coord) >= 2:
                lng, lat = coord[0], coord[1]
                if south <= lat <= north and west <= lng <= east:
                    result.append(item)
                    break
    return result


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    await collector.start()


@app.on_event("shutdown")
async def shutdown():
    await collector.stop()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8207"))
    uvicorn.run(app, host="0.0.0.0", port=port)
