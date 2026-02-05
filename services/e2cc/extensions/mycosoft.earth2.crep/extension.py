"""
CREP Extension for Omniverse Kit - February 5, 2026

Provides visualization layers for CREP environmental data:
- Carbon monitoring (Carbon Mapper)
- Aviation tracking
- Maritime traffic
- Railway systems
- Satellite imagery
"""

import asyncio
from typing import Dict, List, Optional
import omni.ext
import omni.ui as ui
import omni.usd
from pxr import Usd, UsdGeom, Gf, Sdf

CREP_API_URL = "http://localhost:3010/api"


class CrepExtension(omni.ext.IExt):
    """CREP Integration Extension"""
    
    def __init__(self):
        super().__init__()
        self._window = None
        self._layers = {}
    
    def on_startup(self, ext_id: str):
        print(f"[Mycosoft CREP] Starting extension: {ext_id}")
        
        self._layers = {
            "carbon": CarbonLayer(),
            "aviation": AviationLayer(),
            "maritime": MaritimeLayer(),
            "railway": RailwayLayer(),
            "satellites": SatelliteLayer(),
        }
        
        self._window = CrepWindow(self)
    
    def on_shutdown(self):
        print("[Mycosoft CREP] Shutting down")
        if self._window:
            self._window.destroy()
    
    def toggle_layer(self, layer_name: str, visible: bool):
        if layer_name in self._layers:
            layer = self._layers[layer_name]
            if visible:
                layer.show()
            else:
                layer.hide()


class BaseLayer:
    def __init__(self, name: str):
        self.name = name
        self._visible = False
        self._prim = None
    
    def show(self):
        self._visible = True
    
    def hide(self):
        self._visible = False


class CarbonLayer(BaseLayer):
    """Carbon emissions visualization from Carbon Mapper"""
    
    def __init__(self):
        super().__init__("carbon")
    
    async def fetch_data(self):
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{CREP_API_URL}/crep/carbon/plumes") as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            print(f"[CREP] Carbon fetch error: {e}")
        return []


class AviationLayer(BaseLayer):
    """Real-time aviation traffic"""
    
    def __init__(self):
        super().__init__("aviation")
    
    async def fetch_data(self, bounds: Dict = None):
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{CREP_API_URL}/crep/flights") as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            print(f"[CREP] Aviation fetch error: {e}")
        return []


class MaritimeLayer(BaseLayer):
    """Maritime vessel tracking"""
    
    def __init__(self):
        super().__init__("maritime")
    
    async def fetch_data(self, bounds: Dict = None):
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{CREP_API_URL}/crep/marine/vessels") as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            print(f"[CREP] Maritime fetch error: {e}")
        return []


class RailwayLayer(BaseLayer):
    """Railway network visualization"""
    
    def __init__(self):
        super().__init__("railway")


class SatelliteLayer(BaseLayer):
    """Satellite positions"""
    
    def __init__(self):
        super().__init__("satellites")
    
    async def fetch_data(self):
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{CREP_API_URL}/crep/satellites") as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception as e:
            print(f"[CREP] Satellite fetch error: {e}")
        return []


class CrepWindow:
    """UI Window for CREP controls"""
    
    def __init__(self, extension: CrepExtension):
        self._extension = extension
        self._window = ui.Window("CREP Layers", width=300, height=450)
        self._build_ui()
    
    def _build_ui(self):
        with self._window.frame:
            with ui.VStack(spacing=10):
                ui.Label("CREP Environmental Data", style={"font_size": 18})
                ui.Separator()
                
                for layer_name, label in [
                    ("carbon", "Carbon Emissions"),
                    ("aviation", "Aviation Traffic"),
                    ("maritime", "Maritime Vessels"),
                    ("railway", "Railway Network"),
                    ("satellites", "Satellites"),
                ]:
                    with ui.HStack():
                        ui.Label(label)
                        ui.CheckBox(
                            on_clicked=lambda v, n=layer_name: self._extension.toggle_layer(n, v)
                        )
                
                ui.Separator()
                ui.Button("Refresh All", clicked_fn=self._refresh_all)
    
    def _refresh_all(self):
        print("[CREP] Refreshing all layers...")
    
    def destroy(self):
        if self._window:
            self._window.destroy()
