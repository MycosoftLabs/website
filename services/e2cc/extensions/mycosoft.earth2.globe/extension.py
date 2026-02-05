"""
Mycosoft Earth-2 Globe Extension - February 5, 2026

High-fidelity RTX globe rendering with:
- Volumetric cloud rendering
- Weather data overlays from Earth-2 models
- Real-time atmospheric effects
- Dynamic lighting based on sun position
"""

import asyncio
import math
from datetime import datetime
from typing import Dict, List, Optional
import omni.ext
import omni.ui as ui
import omni.usd
from pxr import Usd, UsdGeom, UsdShade, Gf, Sdf

# API endpoints
EARTH2_API_URL = "http://localhost:8210"
DFM_API_URL = "http://localhost:8310"


class GlobeExtension(omni.ext.IExt):
    """Earth-2 Globe Extension with RTX rendering"""
    
    def __init__(self):
        super().__init__()
        self._window = None
        self._globe = None
        self._atmosphere = None
        self._clouds = None
        self._weather_layers = {}
        self._current_time = datetime.utcnow()
    
    def on_startup(self, ext_id: str):
        print(f"[Mycosoft Globe] Starting extension: {ext_id}")
        
        # Initialize globe components
        stage = omni.usd.get_context().get_stage()
        if stage:
            self._create_globe(stage)
            self._create_atmosphere(stage)
            self._create_clouds(stage)
        
        # Create control window
        self._window = GlobeWindow(self)
    
    def on_shutdown(self):
        print("[Mycosoft Globe] Shutting down")
        if self._window:
            self._window.destroy()
    
    def _create_globe(self, stage: Usd.Stage):
        """Create the base Earth globe"""
        globe_path = Sdf.Path("/Earth2/Globe")
        
        # Create sphere for Earth
        sphere = UsdGeom.Sphere.Define(stage, globe_path.AppendChild("Surface"))
        sphere.GetRadiusAttr().Set(1.0)
        
        # Apply Earth texture material
        self._apply_earth_material(stage, sphere.GetPrim())
        
        self._globe = sphere.GetPrim()
    
    def _apply_earth_material(self, stage: Usd.Stage, prim: Usd.Prim):
        """Apply Earth surface material with PBR textures"""
        material_path = Sdf.Path("/Earth2/Materials/EarthSurface")
        material = UsdShade.Material.Define(stage, material_path)
        
        # Create shader
        shader_path = material_path.AppendChild("Shader")
        shader = UsdShade.Shader.Define(stage, shader_path)
        shader.CreateIdAttr("UsdPreviewSurface")
        
        # Set surface properties
        shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(
            Gf.Vec3f(0.1, 0.3, 0.6)  # Blue ocean default
        )
        shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
        shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.5)
        
        # Connect material
        material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
        
        # Bind to globe
        binding = UsdShade.MaterialBindingAPI(prim)
        binding.Bind(material)
    
    def _create_atmosphere(self, stage: Usd.Stage):
        """Create atmospheric scattering layer"""
        atmo_path = Sdf.Path("/Earth2/Globe/Atmosphere")
        
        # Slightly larger sphere for atmosphere
        sphere = UsdGeom.Sphere.Define(stage, atmo_path)
        sphere.GetRadiusAttr().Set(1.02)
        
        # Apply atmosphere material with transparency
        self._apply_atmosphere_material(stage, sphere.GetPrim())
        
        self._atmosphere = sphere.GetPrim()
    
    def _apply_atmosphere_material(self, stage: Usd.Stage, prim: Usd.Prim):
        """Apply atmospheric scattering material"""
        material_path = Sdf.Path("/Earth2/Materials/Atmosphere")
        material = UsdShade.Material.Define(stage, material_path)
        
        shader_path = material_path.AppendChild("Shader")
        shader = UsdShade.Shader.Define(stage, shader_path)
        shader.CreateIdAttr("UsdPreviewSurface")
        
        # Light blue with high transparency
        shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(
            Gf.Vec3f(0.4, 0.6, 1.0)
        )
        shader.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(0.1)
        
        material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
        
        binding = UsdShade.MaterialBindingAPI(prim)
        binding.Bind(material)
    
    def _create_clouds(self, stage: Usd.Stage):
        """Create volumetric cloud layer"""
        clouds_path = Sdf.Path("/Earth2/Globe/Clouds")
        
        # Cloud layer at slightly higher altitude
        sphere = UsdGeom.Sphere.Define(stage, clouds_path)
        sphere.GetRadiusAttr().Set(1.01)
        
        self._clouds = sphere.GetPrim()
    
    async def update_weather_data(self, model: str = "fcn3"):
        """Fetch and apply weather data from Earth-2 models"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{EARTH2_API_URL}/model/status/{model}"
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self._apply_weather_overlay(data)
        except Exception as e:
            print(f"[Globe] Weather update error: {e}")
    
    def _apply_weather_overlay(self, weather_data: Dict):
        """Apply weather data to globe visualization"""
        # Update cloud positions/density
        if "clouds" in weather_data:
            self._update_clouds(weather_data["clouds"])
        
        # Update temperature overlay
        if "temperature" in weather_data:
            self._update_temperature_layer(weather_data["temperature"])
        
        # Update wind vectors
        if "wind" in weather_data:
            self._update_wind_layer(weather_data["wind"])
    
    def _update_clouds(self, cloud_data: Dict):
        """Update cloud visualization based on weather data"""
        pass  # Implement volumetric cloud updates
    
    def _update_temperature_layer(self, temp_data: Dict):
        """Update temperature color overlay"""
        pass  # Implement temperature color mapping
    
    def _update_wind_layer(self, wind_data: Dict):
        """Update wind vector visualization"""
        pass  # Implement wind arrow/streamline visualization
    
    def set_time(self, time: datetime):
        """Set visualization time and update lighting"""
        self._current_time = time
        self._update_sun_position()
    
    def _update_sun_position(self):
        """Update sun position based on current time"""
        # Calculate sun position from time
        hour = self._current_time.hour + self._current_time.minute / 60.0
        sun_angle = (hour - 12) * 15  # degrees from noon
        
        # Update directional light in scene
        stage = omni.usd.get_context().get_stage()
        if stage:
            sun_path = Sdf.Path("/Earth2/Lights/Sun")
            sun = stage.GetPrimAtPath(sun_path)
            if sun.IsValid():
                xform = UsdGeom.Xformable(sun)
                # Rotate sun based on time


class GlobeWindow:
    """Control window for globe settings"""
    
    def __init__(self, extension: GlobeExtension):
        self._extension = extension
        self._window = ui.Window("Earth-2 Globe", width=350, height=500)
        self._build_ui()
    
    def _build_ui(self):
        with self._window.frame:
            with ui.VStack(spacing=10):
                ui.Label("Earth-2 Globe Controls", style={"font_size": 20})
                ui.Separator()
                
                # Time controls
                ui.Label("Time Control", style={"font_size": 16})
                with ui.HStack():
                    ui.Label("Current Time:")
                    self._time_label = ui.Label("--:--")
                
                with ui.HStack():
                    ui.Button("<<", clicked_fn=lambda: self._change_time(-6))
                    ui.Button("<", clicked_fn=lambda: self._change_time(-1))
                    ui.Button("Now", clicked_fn=self._set_now)
                    ui.Button(">", clicked_fn=lambda: self._change_time(1))
                    ui.Button(">>", clicked_fn=lambda: self._change_time(6))
                
                ui.Separator()
                
                # Layer controls
                ui.Label("Weather Layers", style={"font_size": 16})
                for layer in ["Clouds", "Temperature", "Pressure", "Wind", "Precipitation"]:
                    with ui.HStack():
                        ui.Label(layer)
                        ui.CheckBox()
                
                ui.Separator()
                
                # Model selection
                ui.Label("Weather Model", style={"font_size": 16})
                with ui.ComboBox(0):
                    ui.SimpleStringModel("FourCastNet3 (Global)")
                    ui.SimpleStringModel("StormScope (Nowcast)")
                    ui.SimpleStringModel("CorrDiff (1km)")
                
                ui.Separator()
                ui.Button("Refresh Weather Data", clicked_fn=self._refresh_weather)
    
    def _change_time(self, hours: int):
        """Change current time by hours"""
        pass
    
    def _set_now(self):
        """Set to current time"""
        self._extension.set_time(datetime.utcnow())
    
    def _refresh_weather(self):
        """Refresh weather data"""
        asyncio.create_task(self._extension.update_weather_data())
    
    def destroy(self):
        if self._window:
            self._window.destroy()
