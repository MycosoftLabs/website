"use client";

/**
 * LiveMapContent - Live device map using MapLibre GL
 * 
 * Simplified version that avoids deck.gl SSR/build issues
 * Uses MapLibre GL for mapping instead of deck.gl
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Layers, RefreshCw, Radio, MapPin, Loader2 } from "lucide-react";

// Device colors
const DEVICE_COLORS: Record<string, string> = {
  mycobrain: "#00d4ff",
  sporebase: "#7fffcc",
  alarm: "#ff6b9d",
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  online: "#00ff88",
  offline: "#ff4466",
  degraded: "#ffad14",
};

interface Device {
  device_id: string;
  device_type: "mycobrain" | "sporebase" | "alarm";
  position: [number, number];
  status: "online" | "offline" | "degraded";
  timestamp: number;
}

interface Alert {
  id: string;
  timestamp: number;
  level: "info" | "warning" | "critical";
  message: string;
  device_id?: string;
}

// Generate mock device data
function generateMockDevices(): Device[] {
  const now = Date.now() / 1000;
  return [
    {
      device_id: "myco-001",
      device_type: "mycobrain",
      position: [-117.16, 32.72],
      status: "online",
      timestamp: now,
    },
    {
      device_id: "myco-002",
      device_type: "mycobrain",
      position: [-117.14, 32.73],
      status: "online",
      timestamp: now,
    },
    {
      device_id: "spore-001",
      device_type: "sporebase",
      position: [-117.18, 32.71],
      status: "online",
      timestamp: now,
    },
    {
      device_id: "spore-002",
      device_type: "sporebase",
      position: [-117.15, 32.74],
      status: "degraded",
      timestamp: now - 120,
    },
    {
      device_id: "alarm-001",
      device_type: "alarm",
      position: [-117.17, 32.70],
      status: "offline",
      timestamp: now - 600,
    },
  ];
}

export function LiveMapContent() {
  const [mounted, setMounted] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    setDevices(generateMockDevices());

    // Dynamically import MapLibre
    import("maplibre-gl").then((maplibregl) => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new maplibregl.default.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: '© <a href="https://carto.com/">CARTO</a>',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: [-117.16, 32.72],
        zoom: 11,
        pitch: 0,
      });

      mapRef.current = map;

      // Add device markers after map loads
      map.on("load", () => {
        const mockDevices = generateMockDevices();
        mockDevices.forEach((device) => {
          const el = document.createElement("div");
          el.className = "device-marker";
          el.style.width = "16px";
          el.style.height = "16px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor = STATUS_COLORS[device.status];
          el.style.border = `3px solid ${DEVICE_COLORS[device.device_type]}`;
          el.style.cursor = "pointer";
          el.style.boxShadow = `0 0 10px ${DEVICE_COLORS[device.device_type]}`;

          el.addEventListener("click", () => {
            setSelectedDevice(device.device_id);
          });

          new maplibregl.default.Marker({ element: el })
            .setLngLat(device.position)
            .addTo(map);
        });
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setDevices(generateMockDevices());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-dvh bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const selectedDeviceData = devices.find((d) => d.device_id === selectedDevice);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          <Link
            href="/natureos"
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              Live Device Map
            </h1>
            <p className="text-xs text-gray-400">Real-time fleet tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors"
            title="Refresh devices"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Device Legend */}
      <div className="absolute top-20 right-4 z-10 p-3 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
        <div className="text-xs font-medium text-gray-400 mb-2">Devices</div>
        <div className="space-y-2">
          {Object.entries(DEVICE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-300 capitalize">{type}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-white/10">
          <div className="text-xs font-medium text-gray-400 mb-2">Status</div>
          <div className="space-y-1">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-300 capitalize">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Device Info */}
      {selectedDevice && selectedDeviceData && (
        <div className="absolute top-20 left-4 z-10 p-4 rounded-lg bg-black/60 backdrop-blur-sm border border-cyan-500/30 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">{selectedDevice}</span>
            </div>
            <button
              onClick={() => setSelectedDevice(null)}
              className="text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-xs text-gray-300">
            <div>Type: <span className="capitalize">{selectedDeviceData.device_type}</span></div>
            <div>Status: <span className="capitalize">{selectedDeviceData.status}</span></div>
            <div>Position: {selectedDeviceData.position[1].toFixed(4)}, {selectedDeviceData.position[0].toFixed(4)}</div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Device Count Badge */}
      <div className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
        <span className="text-xs text-gray-400">
          {devices.filter((d) => d.status === "online").length}/{devices.length} devices online
        </span>
      </div>
    </div>
  );
}
