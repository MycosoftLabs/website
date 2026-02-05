"use client";

/**
 * Earth-2 Hybrid View Component - February 5, 2026
 *
 * Combines base map (Mapbox/Cesium) with RTX overlay from Omniverse.
 * Supports multiple rendering modes:
 * - Full RTX (pure Omniverse stream)
 * - Hybrid (RTX overlay on base map)
 * - Map Only (traditional web map)
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import Earth2RTXStream, { useEarth2Stream } from "./Earth2RTXStream";
import Earth2Controls from "./Earth2Controls";

type RenderMode = "rtx" | "hybrid" | "map";

interface ViewBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Earth2HybridViewProps {
  initialMode?: RenderMode;
  mapboxToken?: string;
  onBoundsChange?: (bounds: ViewBounds) => void;
  className?: string;
  showControls?: boolean;
}

export default function Earth2HybridView({
  initialMode = "hybrid",
  mapboxToken,
  onBoundsChange,
  className = "",
  showControls = true,
}: Earth2HybridViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>(initialMode);
  const [bounds, setBounds] = useState<ViewBounds>({
    north: 60,
    south: 20,
    east: -60,
    west: -130,
  });
  const [rtxOpacity, setRtxOpacity] = useState(0.8);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [rtxConnected, setRtxConnected] = useState(false);

  const { setBounds: setStreamBounds } = useEarth2Stream();

  // Initialize base map (simplified - actual implementation would use Mapbox/Cesium)
  useEffect(() => {
    if (!mapRef.current || renderMode === "rtx") return;

    // Placeholder for map initialization
    // In production, this would initialize Mapbox GL or Cesium
    console.log("[Hybrid] Initializing base map");
    setMapLoaded(true);

    return () => {
      console.log("[Hybrid] Cleaning up base map");
    };
  }, [renderMode]);

  // Sync bounds between map and RTX stream
  const handleBoundsChange = useCallback(
    (newBounds: ViewBounds) => {
      setBounds(newBounds);
      setStreamBounds(newBounds);
      onBoundsChange?.(newBounds);
    },
    [setStreamBounds, onBoundsChange]
  );

  // Handle RTX connection state
  const handleRTXConnected = useCallback(() => {
    console.log("[Hybrid] RTX stream connected");
    setRtxConnected(true);
  }, []);

  const handleRTXDisconnected = useCallback(() => {
    console.log("[Hybrid] RTX stream disconnected");
    setRtxConnected(false);
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Base Map Layer */}
      {renderMode !== "rtx" && (
        <div
          ref={mapRef}
          className="absolute inset-0 bg-gray-900"
          style={{ zIndex: 0 }}
        >
          {/* Placeholder for base map - replace with actual map component */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">🗺️</div>
              <div>Base Map Layer</div>
              <div className="text-xs text-gray-600">
                (Mapbox/Cesium integration)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RTX Stream Layer */}
      {renderMode !== "map" && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            opacity: renderMode === "hybrid" ? rtxOpacity : 1,
            pointerEvents: renderMode === "hybrid" ? "none" : "auto",
          }}
        >
          <Earth2RTXStream
            autoConnect={true}
            onConnected={handleRTXConnected}
            onDisconnected={handleRTXDisconnected}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Mode Selector */}
      <div className="absolute top-4 left-4 z-10 flex gap-1 bg-gray-900/90 rounded p-1">
        {[
          { mode: "rtx" as RenderMode, label: "RTX", icon: "🎮" },
          { mode: "hybrid" as RenderMode, label: "Hybrid", icon: "🔀" },
          { mode: "map" as RenderMode, label: "Map", icon: "🗺️" },
        ].map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setRenderMode(mode)}
            className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
              renderMode === mode
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Hybrid Mode Controls */}
      {renderMode === "hybrid" && (
        <div className="absolute top-16 left-4 z-10 bg-gray-900/90 rounded p-3 w-48">
          <div className="text-xs text-gray-400 mb-2">RTX Overlay Opacity</div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={rtxOpacity}
            onChange={(e) => setRtxOpacity(parseFloat(e.target.value))}
            className="w-full accent-green-500"
          />
          <div className="text-right text-xs text-gray-500">
            {Math.round(rtxOpacity * 100)}%
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-gray-900/90 rounded px-3 py-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            rtxConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-xs text-gray-400">
          RTX: {rtxConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <div className="absolute bottom-4 right-4 z-10 w-72">
          <Earth2Controls
            onLayerToggle={(layer, enabled) => {
              console.log(`[Hybrid] Layer ${layer}: ${enabled}`);
            }}
            onModelRun={(model) => {
              console.log(`[Hybrid] Running model: ${model}`);
            }}
          />
        </div>
      )}

      {/* Bounds Display */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/90 rounded px-3 py-2 text-xs text-gray-400 font-mono">
        <div>N: {bounds.north.toFixed(2)}°</div>
        <div>S: {bounds.south.toFixed(2)}°</div>
        <div>E: {bounds.east.toFixed(2)}°</div>
        <div>W: {bounds.west.toFixed(2)}°</div>
      </div>
    </div>
  );
}
