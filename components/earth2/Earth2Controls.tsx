"use client";

/**
 * Earth-2 Controls Component - February 5, 2026
 *
 * Control panel for Earth-2 RTX visualization layers and models.
 */

import React, { useState } from "react";
import { useEarth2Stream } from "./Earth2RTXStream";

interface Layer {
  id: string;
  name: string;
  category: "weather" | "fusarium" | "crep";
  enabled: boolean;
}

interface Model {
  id: string;
  name: string;
  description: string;
  status: "ready" | "loading" | "running" | "unavailable";
}

const DEFAULT_LAYERS: Layer[] = [
  // Weather layers
  { id: "clouds", name: "Volumetric Clouds", category: "weather", enabled: true },
  { id: "temperature", name: "Temperature", category: "weather", enabled: false },
  { id: "pressure", name: "Pressure", category: "weather", enabled: false },
  { id: "wind", name: "Wind Vectors", category: "weather", enabled: false },
  { id: "precipitation", name: "Precipitation", category: "weather", enabled: false },
  // FUSARIUM layers
  { id: "fungal_species", name: "Fungal Species", category: "fusarium", enabled: false },
  { id: "spore_dispersal", name: "Spore Dispersal", category: "fusarium", enabled: false },
  { id: "risk_zones", name: "Risk Zones", category: "fusarium", enabled: false },
  // CREP layers
  { id: "carbon", name: "Carbon Emissions", category: "crep", enabled: false },
  { id: "aviation", name: "Aviation", category: "crep", enabled: false },
  { id: "maritime", name: "Maritime", category: "crep", enabled: false },
  { id: "satellites", name: "Satellites", category: "crep", enabled: false },
];

const DEFAULT_MODELS: Model[] = [
  { id: "fcn3", name: "FourCastNet3", description: "Global 0.25° forecast", status: "ready" },
  { id: "stormscope", name: "StormScope", description: "2-hour nowcast", status: "ready" },
  { id: "corrdiff", name: "CorrDiff", description: "1km downscaling", status: "unavailable" },
  { id: "atlas", name: "Atlas", description: "ERA5 ensemble", status: "unavailable" },
];

interface Earth2ControlsProps {
  onLayerToggle?: (layerId: string, enabled: boolean) => void;
  onModelRun?: (modelId: string) => void;
  onTimeChange?: (time: string) => void;
  className?: string;
}

export default function Earth2Controls({
  onLayerToggle,
  onModelRun,
  onTimeChange,
  className = "",
}: Earth2ControlsProps) {
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS);
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());
  const [animating, setAnimating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"weather" | "fusarium" | "crep" | "models">("weather");

  const { toggleLayer, setTime, runModel } = useEarth2Stream();

  const handleLayerToggle = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, enabled: !layer.enabled } : layer
      )
    );
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      toggleLayer(layerId, !layer.enabled);
      onLayerToggle?.(layerId, !layer.enabled);
    }
  };

  const handleModelRun = (modelId: string) => {
    setModels((prev) =>
      prev.map((model) =>
        model.id === modelId ? { ...model, status: "running" } : model
      )
    );
    runModel(modelId);
    onModelRun?.(modelId);

    // Reset status after timeout
    setTimeout(() => {
      setModels((prev) =>
        prev.map((model) =>
          model.id === modelId && model.status === "running"
            ? { ...model, status: "ready" }
            : model
        )
      );
    }, 30000);
  };

  const handleTimeChange = (offset: number) => {
    const newTime = new Date(new Date(currentTime).getTime() + offset * 3600000);
    const isoTime = newTime.toISOString();
    setCurrentTime(isoTime);
    setTime(isoTime, animating);
    onTimeChange?.(isoTime);
  };

  const filteredLayers = layers.filter(
    (layer) => layer.category === activeCategory
  );

  return (
    <div className={`bg-gray-900/95 text-white p-4 rounded-lg ${className}`}>
      {/* Category tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-700 pb-2">
        {[
          { id: "weather", label: "Weather" },
          { id: "fusarium", label: "FUSARIUM" },
          { id: "crep", label: "CREP" },
          { id: "models", label: "Models" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as typeof activeCategory)}
            className={`px-3 py-1 text-sm rounded-t ${
              activeCategory === cat.id
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Layer controls */}
      {activeCategory !== "models" && (
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">
            Layers
          </h3>
          {filteredLayers.map((layer) => (
            <label
              key={layer.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={() => handleLayerToggle(layer.id)}
                className="w-4 h-4 accent-green-500"
              />
              <span className="text-sm">{layer.name}</span>
            </label>
          ))}
        </div>
      )}

      {/* Model controls */}
      {activeCategory === "models" && (
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">
            Earth-2 Models
          </h3>
          {models.map((model) => (
            <div
              key={model.id}
              className="flex items-center justify-between bg-gray-800/50 p-2 rounded"
            >
              <div>
                <div className="font-medium text-sm">{model.name}</div>
                <div className="text-xs text-gray-400">{model.description}</div>
              </div>
              <button
                onClick={() => handleModelRun(model.id)}
                disabled={model.status !== "ready"}
                className={`px-3 py-1 text-xs rounded ${
                  model.status === "ready"
                    ? "bg-green-600 hover:bg-green-700"
                    : model.status === "running"
                    ? "bg-yellow-600"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
              >
                {model.status === "running" ? "Running..." : "Run"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Time controls */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
          Time Control
        </h3>
        <div className="text-center mb-2 font-mono text-sm">
          {new Date(currentTime).toLocaleString()}
        </div>
        <div className="flex gap-1 justify-center">
          <button
            onClick={() => handleTimeChange(-6)}
            className="px-2 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
          >
            -6h
          </button>
          <button
            onClick={() => handleTimeChange(-1)}
            className="px-2 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
          >
            -1h
          </button>
          <button
            onClick={() => {
              setCurrentTime(new Date().toISOString());
              setTime(new Date().toISOString(), false);
            }}
            className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
          >
            Now
          </button>
          <button
            onClick={() => handleTimeChange(1)}
            className="px-2 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
          >
            +1h
          </button>
          <button
            onClick={() => handleTimeChange(6)}
            className="px-2 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
          >
            +6h
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={animating}
              onChange={(e) => setAnimating(e.target.checked)}
              className="accent-green-500"
            />
            Animate
          </label>
        </div>
      </div>
    </div>
  );
}
