"use client";

import { MyceliumLayer } from "./mycelium-layer";
import { HeatLayer } from "./heat-layer";
import { OrganismLayer } from "./organism-layer";
import { WeatherLayer } from "./weather-layer";
import { DeviceMarkers } from "./device-markers";
import { FungalLayer } from "./fungal-layer";

interface LayerManagerProps {
  zoom: number;
  viewport?: { north: number; south: number; east: number; west: number };
  layers?: {
    fungi: boolean;     // PRIORITY: Fungal observations from MINDEX/iNat/GBIF
    mycelium: boolean;
    heat: boolean;
    organisms: boolean;
    weather: boolean;
    devices: boolean;
  };
}

export interface LayerState {
  fungi: boolean;
  mycelium: boolean;
  heat: boolean;
  organisms: boolean;
  weather: boolean;
  devices: boolean;
}

export function LayerManager({ zoom, viewport, layers }: LayerManagerProps) {
  const defaultLayers: LayerState = {
    fungi: true,       // ON by default - PRIORITY LAYER
    mycelium: false,   // Disabled until tile server is available
    heat: false,
    organisms: true,   // iNaturalist organism data
    weather: false,
    devices: true,     // MycoBrain devices ON by default
  };
  
  const activeLayers = layers || defaultLayers;

  return (
    <>
      {/* PRIORITY: Fungal Layer - Always rendered first when enabled */}
      {activeLayers.fungi && (
        <FungalLayer 
          zoom={zoom} 
          viewport={viewport} 
          showHeatmap={true}
          showMarkers={true}
        />
      )}
      {activeLayers.mycelium && <MyceliumLayer zoom={zoom} viewport={viewport} />}
      {activeLayers.heat && <HeatLayer zoom={zoom} viewport={viewport} />}
      {activeLayers.organisms && <OrganismLayer zoom={zoom} viewport={viewport} />}
      {activeLayers.weather && <WeatherLayer zoom={zoom} viewport={viewport} />}
      {activeLayers.devices && <DeviceMarkers zoom={zoom} />}
    </>
  );
}
