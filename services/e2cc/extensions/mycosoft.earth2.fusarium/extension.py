"""
FUSARIUM Extension for Omniverse Kit - February 5, 2026

Provides visualization layers for:
- Fungal species distribution
- Spore dispersal modeling
- Agricultural risk zones
"""

import asyncio
from typing import Dict, List, Optional, Any
import omni.ext
import omni.ui as ui
import omni.usd
from pxr import Usd, UsdGeom, Gf, Sdf

# FUSARIUM API endpoint
FUSARIUM_API_URL = "http://localhost:3010/api/fusarium"


class FusariumExtension(omni.ext.IExt):
    """FUSARIUM Integration Extension"""
    
    def __init__(self):
        super().__init__()
        self._window = None
        self._layers = {}
        self._visible_layers = set()
    
    def on_startup(self, ext_id: str):
        """Called when extension is loaded"""
        print(f"[Mycosoft FUSARIUM] Starting extension: {ext_id}")
        
        # Register layers
        self._layers = {
            "fungal_species": FungalSpeciesLayer(),
            "spore_dispersal": SporeDispersalLayer(),
            "risk_zones": RiskZonesLayer(),
        }
        
        # Create UI window
        self._window = FusariumWindow(self)
    
    def on_shutdown(self):
        """Called when extension is unloaded"""
        print("[Mycosoft FUSARIUM] Shutting down")
        if self._window:
            self._window.destroy()
            self._window = None
    
    def toggle_layer(self, layer_name: str, visible: bool):
        """Toggle layer visibility"""
        if layer_name in self._layers:
            layer = self._layers[layer_name]
            if visible:
                layer.show()
                self._visible_layers.add(layer_name)
            else:
                layer.hide()
                self._visible_layers.discard(layer_name)
    
    def get_visible_layers(self) -> set:
        return self._visible_layers.copy()


class BaseLayer:
    """Base class for visualization layers"""
    
    def __init__(self, name: str):
        self.name = name
        self._visible = False
        self._prim = None
    
    def show(self):
        """Show layer"""
        self._visible = True
        self._update_visibility()
    
    def hide(self):
        """Hide layer"""
        self._visible = False
        self._update_visibility()
    
    def _update_visibility(self):
        """Update USD prim visibility"""
        if self._prim and self._prim.IsValid():
            imageable = UsdGeom.Imageable(self._prim)
            if self._visible:
                imageable.MakeVisible()
            else:
                imageable.MakeInvisible()


class FungalSpeciesLayer(BaseLayer):
    """
    Fungal Species Distribution Layer
    
    Displays locations of identified fungal species
    from the FUSARIUM database.
    """
    
    def __init__(self):
        super().__init__("fungal_species")
        self._species_data = []
    
    async def fetch_data(self, bounds: Dict[str, float] = None):
        """Fetch fungal species data from FUSARIUM API"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                params = bounds if bounds else {}
                async with session.get(
                    f"{FUSARIUM_API_URL}/species",
                    params=params
                ) as resp:
                    if resp.status == 200:
                        self._species_data = await resp.json()
                        return self._species_data
        except Exception as e:
            print(f"[FUSARIUM] Error fetching species data: {e}")
        return []
    
    def create_visuals(self, stage: Usd.Stage):
        """Create USD visuals for fungal species"""
        root_path = Sdf.Path("/Earth2/FUSARIUM/FungalSpecies")
        
        # Create root prim
        self._prim = stage.DefinePrim(root_path, "Scope")
        
        for species in self._species_data:
            species_id = species.get("id", "unknown")
            lat = species.get("latitude", 0)
            lon = species.get("longitude", 0)
            name = species.get("name", "Unknown Species")
            
            # Convert lat/lon to 3D position
            pos = self._geo_to_position(lat, lon)
            
            # Create point prim
            point_path = root_path.AppendChild(f"Species_{species_id}")
            sphere = UsdGeom.Sphere.Define(stage, point_path)
            sphere.GetRadiusAttr().Set(0.001)  # Small sphere
            
            # Set position
            xform = UsdGeom.Xformable(sphere.GetPrim())
            xform.AddTranslateOp().Set(pos)
    
    def _geo_to_position(self, lat: float, lon: float, radius: float = 1.0):
        """Convert geographic coordinates to 3D position"""
        import math
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        
        x = radius * math.cos(lat_rad) * math.cos(lon_rad)
        y = radius * math.cos(lat_rad) * math.sin(lon_rad)
        z = radius * math.sin(lat_rad)
        
        return Gf.Vec3d(x, y, z)


class SporeDispersalLayer(BaseLayer):
    """
    Spore Dispersal Layer
    
    Visualizes spore dispersal patterns based on
    weather conditions and Earth-2 model outputs.
    """
    
    def __init__(self):
        super().__init__("spore_dispersal")
        self._dispersal_data = []
        self._particles = None
    
    async def fetch_data(self, time: str = None, bounds: Dict = None):
        """Fetch spore dispersal model data"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                params = {"time": time} if time else {}
                if bounds:
                    params.update(bounds)
                    
                async with session.get(
                    f"{FUSARIUM_API_URL}/dispersal",
                    params=params
                ) as resp:
                    if resp.status == 200:
                        self._dispersal_data = await resp.json()
                        return self._dispersal_data
        except Exception as e:
            print(f"[FUSARIUM] Error fetching dispersal data: {e}")
        return []
    
    def create_visuals(self, stage: Usd.Stage):
        """Create particle-based visualization for spore dispersal"""
        root_path = Sdf.Path("/Earth2/FUSARIUM/SporeDispersal")
        self._prim = stage.DefinePrim(root_path, "Scope")
        
        # Create particle system for each dispersal zone
        for i, zone in enumerate(self._dispersal_data):
            zone_path = root_path.AppendChild(f"Zone_{i}")
            self._create_dispersal_zone(stage, zone_path, zone)
    
    def _create_dispersal_zone(self, stage: Usd.Stage, path: Sdf.Path, zone: Dict):
        """Create visual for a dispersal zone"""
        # Create a sphere to represent dispersal area
        sphere = UsdGeom.Sphere.Define(stage, path)
        
        center_lat = zone.get("center_lat", 0)
        center_lon = zone.get("center_lon", 0)
        radius_km = zone.get("radius_km", 10)
        concentration = zone.get("concentration", 0.5)
        
        # Position
        pos = self._geo_to_position(center_lat, center_lon)
        xform = UsdGeom.Xformable(sphere.GetPrim())
        xform.AddTranslateOp().Set(pos)
        
        # Radius (convert km to scene units)
        sphere.GetRadiusAttr().Set(radius_km * 0.00001)
        
        # Set color based on concentration (yellow to red)
        sphere.GetDisplayColorAttr().Set([
            Gf.Vec3f(1.0, 1.0 - concentration, 0.0)
        ])
    
    def _geo_to_position(self, lat: float, lon: float, radius: float = 1.0):
        import math
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        x = radius * math.cos(lat_rad) * math.cos(lon_rad)
        y = radius * math.cos(lat_rad) * math.sin(lon_rad)
        z = radius * math.sin(lat_rad)
        return Gf.Vec3d(x, y, z)


class RiskZonesLayer(BaseLayer):
    """
    Agricultural Risk Zones Layer
    
    Shows high-risk areas for fungal infection based on
    weather conditions and species distribution.
    """
    
    def __init__(self):
        super().__init__("risk_zones")
        self._risk_data = []
    
    async def fetch_data(self, crop_type: str = None):
        """Fetch risk zone data"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                params = {"crop": crop_type} if crop_type else {}
                async with session.get(
                    f"{FUSARIUM_API_URL}/risk-zones",
                    params=params
                ) as resp:
                    if resp.status == 200:
                        self._risk_data = await resp.json()
                        return self._risk_data
        except Exception as e:
            print(f"[FUSARIUM] Error fetching risk data: {e}")
        return []
    
    def create_visuals(self, stage: Usd.Stage):
        """Create risk zone visualization"""
        root_path = Sdf.Path("/Earth2/FUSARIUM/RiskZones")
        self._prim = stage.DefinePrim(root_path, "Scope")
        
        for i, zone in enumerate(self._risk_data):
            zone_path = root_path.AppendChild(f"Risk_{i}")
            self._create_risk_zone(stage, zone_path, zone)
    
    def _create_risk_zone(self, stage: Usd.Stage, path: Sdf.Path, zone: Dict):
        """Create visual for a risk zone"""
        risk_level = zone.get("risk_level", 0.5)  # 0-1
        
        # Color based on risk: green -> yellow -> red
        if risk_level < 0.33:
            color = Gf.Vec3f(0.0, 1.0, 0.0)  # Green
        elif risk_level < 0.66:
            color = Gf.Vec3f(1.0, 1.0, 0.0)  # Yellow
        else:
            color = Gf.Vec3f(1.0, 0.0, 0.0)  # Red
        
        # Create mesh
        mesh = UsdGeom.Mesh.Define(stage, path)
        mesh.GetDisplayColorAttr().Set([color])


class FusariumWindow:
    """UI Window for FUSARIUM controls"""
    
    def __init__(self, extension: FusariumExtension):
        self._extension = extension
        self._window = ui.Window("FUSARIUM", width=300, height=400)
        self._build_ui()
    
    def _build_ui(self):
        with self._window.frame:
            with ui.VStack(spacing=10):
                ui.Label("FUSARIUM Layers", style={"font_size": 18})
                ui.Separator()
                
                # Layer toggles
                with ui.HStack():
                    ui.Label("Fungal Species")
                    ui.CheckBox(
                        on_clicked=lambda v: self._extension.toggle_layer("fungal_species", v)
                    )
                
                with ui.HStack():
                    ui.Label("Spore Dispersal")
                    ui.CheckBox(
                        on_clicked=lambda v: self._extension.toggle_layer("spore_dispersal", v)
                    )
                
                with ui.HStack():
                    ui.Label("Risk Zones")
                    ui.CheckBox(
                        on_clicked=lambda v: self._extension.toggle_layer("risk_zones", v)
                    )
                
                ui.Separator()
                ui.Button("Refresh Data", clicked_fn=self._refresh_data)
    
    def _refresh_data(self):
        """Refresh all layer data"""
        print("[FUSARIUM] Refreshing data...")
    
    def destroy(self):
        if self._window:
            self._window.destroy()
            self._window = None
