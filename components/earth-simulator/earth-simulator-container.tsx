"use client";

import { useState, useCallback, ReactNode } from "react";
import { CesiumGlobe } from "./cesium-globe";
import { ComprehensiveSidePanel } from "./comprehensive-side-panel";
import { LayerControls } from "./layer-controls";
import { Controls } from "./controls";
import { HUD } from "./hud";
import { EarthSimulatorErrorBoundary } from "./error-boundary";
import { ChevronDown, ChevronUp, X } from "lucide-react";

// Collapsible Control Panel Component
interface ControlPanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  closable?: boolean;
  onClose?: () => void;
  badge?: number | string;
}

function ControlPanel({ title, children, defaultOpen = true, closable = false, onClose, badge }: ControlPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-white text-sm font-medium hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge !== undefined && (
            <span className="bg-green-500/20 text-green-400 text-xs px-1.5 py-0.5 rounded">
              {badge}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {closable && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose?.(); }}
              className="p-0.5 hover:bg-red-500/20 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 text-white text-sm">
          {children}
        </div>
      )}
    </div>
  );
}

interface GridTile {
  id: string;
  lat: number;
  lon: number;
  latEnd: number;
  lonEnd: number;
  centerLat: number;
  centerLon: number;
  region?: string;
  isLand: boolean;
  areaKm2: number;
}

interface EarthSimulatorContainerProps {
  className?: string;
}

export function EarthSimulatorContainer({ className = "" }: EarthSimulatorContainerProps) {
  const [selectedCell, setSelectedCell] = useState<{
    cellId: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [selectedTile, setSelectedTile] = useState<GridTile | null>(null);
  const [viewport, setViewport] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [showLandGrid, setShowLandGrid] = useState(false);
  const [gridTileSize, setGridTileSize] = useState(0.5);
  const [layers, setLayers] = useState({
    // PRIORITY LAYERS - Fungal data first
    fungi: true,      // PRIMARY: Fungal observations from MINDEX/iNat/GBIF - ON by default
    devices: true,    // PRIMARY: MycoBrain devices - ON by default
    organisms: true,  // iNaturalist organism data - ON by default
    // Secondary layers (now enabled - stub tile servers implemented)
    mycelium: false,  // Can be enabled - stub tile server available
    heat: false,      // Can be enabled - stub tile server available
    weather: false,    // Can be enabled - stub tile server available
    // Future integrations (OFF by default)
    inat: true,       // iNaturalist observations
    wind: false,
    precipitation: false,
    ndvi: false,      // Vegetation index (coming soon)
    nlm: false,       // Nature Learning Model predictions (coming soon)
  });

  const handleCellClick = useCallback((cellId: string, lat: number, lon: number) => {
    setSelectedCell({ cellId, lat, lon });
  }, []);

  const handleTileClick = useCallback((tile: GridTile) => {
    setSelectedTile(tile);
    // Also set as selected cell for the side panel
    setSelectedCell({ 
      cellId: tile.id, 
      lat: tile.centerLat, 
      lon: tile.centerLon 
    });
  }, []);

  const handleViewportChange = useCallback(
    (newViewport: { north: number; south: number; east: number; west: number }) => {
      setViewport(newViewport);
    },
    []
  );

  return (
    <EarthSimulatorErrorBoundary>
      <div className={`earth-simulator-container w-full h-screen relative flex ${className}`}>
      {/* Left Side Panel - Always Visible */}
      <div className="w-96 flex-shrink-0 z-20">
        <ComprehensiveSidePanel
          viewport={viewport}
          selectedCell={selectedCell}
          layers={layers}
          onCloseCell={() => setSelectedCell(null)}
        />
      </div>

      {/* Main Globe Area */}
      <div className="flex-1 relative">
        {/* WebGL Globe */}
        <div className="absolute inset-0">
          <CesiumGlobe 
            onCellClick={handleCellClick} 
            onViewportChange={handleViewportChange} 
            onTileClick={handleTileClick}
            showLandGrid={showLandGrid}
            gridTileSize={gridTileSize}
            layers={layers} 
          />
        </div>

        {/* Unified Control Panel - Right Side (Non-overlapping, Scrollable) */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-h-[calc(100vh-6rem)] w-64 earth-sim-controls">
          {/* HUD - Viewport Info - Collapsible */}
          <ControlPanel title="Viewport" defaultOpen={false}>
            <HUD viewport={viewport} />
          </ControlPanel>

          {/* Layer Controls - Collapsible */}
          <ControlPanel title="Layers" defaultOpen={true} badge={Object.values(layers).filter(Boolean).length}>
            <LayerControls layers={layers} onLayersChange={setLayers} />
          </ControlPanel>

          {/* Grid Controls - Collapsible */}
          <ControlPanel title="Land Grid" defaultOpen={false}>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded px-2 py-1 -mx-2">
                <input 
                  type="checkbox" 
                  checked={showLandGrid} 
                  onChange={(e) => setShowLandGrid(e.target.checked)}
                  className="w-4 h-4 rounded accent-green-500"
                />
                <span className="text-sm">Show 24×24 Grid</span>
              </label>
              <div className="text-xs text-gray-400 mb-1">Resolution:</div>
              <select 
                value={gridTileSize} 
                onChange={(e) => setGridTileSize(parseFloat(e.target.value))}
                className="bg-gray-800/80 text-white rounded px-2 py-1.5 w-full text-xs border border-white/10 focus:border-green-500 focus:outline-none"
              >
                <option value="1.0">Coarse (1° ~111km)</option>
                <option value="0.5">Medium (0.5° ~55km)</option>
                <option value="0.1">Fine (0.1° ~11km)</option>
              </select>
            </div>
          </ControlPanel>
        </div>

        {/* Selected Tile Info */}
        {selectedTile && (
          <div className="absolute bottom-20 left-4 z-10 bg-black/80 rounded-lg p-4 text-white max-w-sm">
            <div className="font-bold text-lg mb-2">Tile: {selectedTile.id}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Region:</div>
              <div>{selectedTile.region || "Unknown"}</div>
              <div className="text-gray-400">Center:</div>
              <div>{selectedTile.centerLat.toFixed(2)}°, {selectedTile.centerLon.toFixed(2)}°</div>
              <div className="text-gray-400">Area:</div>
              <div>{selectedTile.areaKm2.toFixed(0)} km²</div>
              <div className="text-gray-400">Bounds:</div>
              <div className="text-xs">
                {selectedTile.lat.toFixed(2)}° to {selectedTile.latEnd.toFixed(2)}°
              </div>
            </div>
            <button 
              onClick={() => setSelectedTile(null)}
              className="mt-3 w-full bg-red-600 hover:bg-red-700 rounded py-1 text-sm"
            >
              Close
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 right-4 z-10">
          <Controls />
        </div>
      </div>
    </div>
    </EarthSimulatorErrorBoundary>
  );
}
