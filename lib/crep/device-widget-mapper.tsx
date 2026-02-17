/**
 * Device Type to Widget Mapper
 * February 12, 2026
 * 
 * Maps MycoBrain device types to appropriate visualization widgets and icons.
 * Different device roles (mushroom1, sporebase, gateway, science_comms, etc.)
 * get specialized visualizations based on their capabilities.
 * 
 * NO MOCK DATA - all device data comes from real MAS device registry
 */

import React from "react";
import {
  Radio,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Microscope,
  Wifi,
  Router,
  Cpu,
  Leaf,
  Bug,
  Beaker,
  Globe,
  Satellite,
  Gauge,
  Zap,
} from "lucide-react";

// Device role types from MycoBrain firmware variants
export type MycoBrainDeviceRole = 
  | "mushroom1"    // Primary fungal monitoring device
  | "sporebase"    // Spore collection/analysis
  | "gateway"      // LoRa/WiFi gateway hub
  | "science_comms" // Scientific communication relay
  | "side_a"       // Multi-chamber side A
  | "side_b"       // Multi-chamber side B
  | "portable"     // Portable field unit
  | "standalone"   // Generic standalone device
  | "unknown";

// Sensor capability flags
export interface DeviceCapabilities {
  hasBME688: boolean;      // Environmental sensor (temp, humidity, pressure, gas)
  hasBME690: boolean;      // Advanced environmental + AI
  hasLoRa: boolean;        // LoRa radio communication
  hasWiFi: boolean;        // WiFi connectivity
  hasBluetooth: boolean;   // Bluetooth connectivity
  hasCamera: boolean;      // Camera for imaging
  hasUV: boolean;          // UV sterilization/analysis
  hasSpectroscopy: boolean; // Spectral analysis
  hasMotion: boolean;      // Motion/vibration sensor
  hasGPS: boolean;         // GPS location
}

// Widget configuration for each device type
export interface DeviceWidgetConfig {
  icon: React.ReactNode;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  label: string;
  description: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  capabilities: Partial<DeviceCapabilities>;
}

// Device role to widget configuration mapping
export const DEVICE_WIDGET_CONFIG: Record<MycoBrainDeviceRole, DeviceWidgetConfig> = {
  mushroom1: {
    icon: <Leaf className="w-3 h-3" />,
    emoji: "🍄",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500",
    glowColor: "#22c55e",
    label: "Mushroom Monitor",
    description: "Primary fungal cultivation monitor",
    primaryMetric: "iaq",
    secondaryMetrics: ["temperature", "humidity", "co2Equivalent"],
    capabilities: {
      hasBME688: true,
      hasWiFi: true,
    },
  },
  sporebase: {
    icon: <Bug className="w-3 h-3" />,
    emoji: "🦠",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500",
    glowColor: "#a855f7",
    label: "SporeBase",
    description: "Spore collection and analysis unit",
    primaryMetric: "sporeCount",
    secondaryMetrics: ["humidity", "temperature", "airflow"],
    capabilities: {
      hasBME688: true,
      hasSpectroscopy: true,
      hasWiFi: true,
    },
  },
  gateway: {
    icon: <Router className="w-3 h-3" />,
    emoji: "📡",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500",
    glowColor: "#06b6d4",
    label: "Gateway Hub",
    description: "LoRa/WiFi network gateway",
    primaryMetric: "connectedDevices",
    secondaryMetrics: ["signalStrength", "uptime", "bandwidth"],
    capabilities: {
      hasLoRa: true,
      hasWiFi: true,
      hasBluetooth: true,
    },
  },
  science_comms: {
    icon: <Satellite className="w-3 h-3" />,
    emoji: "🛰️",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500",
    glowColor: "#3b82f6",
    label: "Science Relay",
    description: "Scientific data relay station",
    primaryMetric: "dataRate",
    secondaryMetrics: ["latency", "packetLoss", "range"],
    capabilities: {
      hasLoRa: true,
      hasWiFi: true,
      hasGPS: true,
    },
  },
  side_a: {
    icon: <Beaker className="w-3 h-3" />,
    emoji: "🧪",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500",
    glowColor: "#f59e0b",
    label: "Chamber A",
    description: "Multi-chamber system - Side A",
    primaryMetric: "temperature",
    secondaryMetrics: ["humidity", "co2", "lightLevel"],
    capabilities: {
      hasBME688: true,
      hasUV: true,
      hasWiFi: true,
    },
  },
  side_b: {
    icon: <Microscope className="w-3 h-3" />,
    emoji: "🔬",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500",
    glowColor: "#ec4899",
    label: "Chamber B",
    description: "Multi-chamber system - Side B",
    primaryMetric: "temperature",
    secondaryMetrics: ["humidity", "co2", "lightLevel"],
    capabilities: {
      hasBME688: true,
      hasCamera: true,
      hasWiFi: true,
    },
  },
  portable: {
    icon: <Radio className="w-3 h-3" />,
    emoji: "📻",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500",
    glowColor: "#22c55e",
    label: "Portable Unit",
    description: "Mobile field monitoring device",
    primaryMetric: "battery",
    secondaryMetrics: ["temperature", "humidity", "gps"],
    capabilities: {
      hasBME688: true,
      hasLoRa: true,
      hasGPS: true,
      hasBluetooth: true,
    },
  },
  standalone: {
    icon: <Cpu className="w-3 h-3" />,
    emoji: "🖥️",
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    borderColor: "border-gray-500",
    glowColor: "#6b7280",
    label: "Standalone",
    description: "Generic MycoBrain device",
    primaryMetric: "temperature",
    secondaryMetrics: ["humidity", "uptime"],
    capabilities: {
      hasBME688: true,
      hasWiFi: true,
    },
  },
  unknown: {
    icon: <Activity className="w-3 h-3" />,
    emoji: "❓",
    color: "text-gray-500",
    bgColor: "bg-gray-600/20",
    borderColor: "border-gray-600",
    glowColor: "#4b5563",
    label: "Unknown Device",
    description: "Unrecognized device type",
    primaryMetric: "status",
    secondaryMetrics: [],
    capabilities: {},
  },
};

/**
 * Parse device type string into a normalized role
 */
export function parseDeviceRole(deviceType?: string): MycoBrainDeviceRole {
  if (!deviceType) return "standalone";
  
  const normalized = deviceType.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Match known roles
  if (normalized.includes("mushroom") || normalized === "mushroom1") return "mushroom1";
  if (normalized.includes("spore") || normalized === "sporebase") return "sporebase";
  if (normalized.includes("gateway") || normalized === "gateway") return "gateway";
  if (normalized.includes("science") || normalized.includes("comms") || normalized === "sciencecomms") return "science_comms";
  if (normalized.includes("sidea") || normalized === "sidea") return "side_a";
  if (normalized.includes("sideb") || normalized === "sideb") return "side_b";
  if (normalized.includes("portable") || normalized.includes("mobile") || normalized.includes("field")) return "portable";
  if (normalized.includes("standalone") || normalized.includes("generic")) return "standalone";
  
  return "unknown";
}

/**
 * Get widget configuration for a device based on its type
 */
export function getDeviceWidgetConfig(deviceType?: string): DeviceWidgetConfig {
  const role = parseDeviceRole(deviceType);
  return DEVICE_WIDGET_CONFIG[role];
}

/**
 * Get the appropriate icon component for a device
 */
export function getDeviceIcon(deviceType?: string): React.ReactNode {
  return getDeviceWidgetConfig(deviceType).icon;
}

/**
 * Get the appropriate emoji for a device marker
 */
export function getDeviceEmoji(deviceType?: string): string {
  return getDeviceWidgetConfig(deviceType).emoji;
}

/**
 * Get marker style for a device
 */
export function getDeviceMarkerStyle(deviceType?: string, isOnline: boolean = true) {
  const config = getDeviceWidgetConfig(deviceType);
  return {
    backgroundColor: isOnline ? config.bgColor : "bg-red-500/20",
    borderColor: isOnline ? config.borderColor : "border-red-500",
    glowColor: isOnline ? config.glowColor : "#ef4444",
    textColor: isOnline ? config.color : "text-red-400",
  };
}

/**
 * Format sensor value with unit
 */
export function formatSensorValue(metric: string, value?: number): string {
  if (value === undefined || value === null) return "N/A";
  
  switch (metric) {
    case "temperature":
      return `${value.toFixed(1)}°C`;
    case "humidity":
      return `${value.toFixed(0)}%`;
    case "pressure":
      return `${value.toFixed(0)} hPa`;
    case "iaq":
      return `IAQ ${value.toFixed(0)}`;
    case "co2Equivalent":
    case "co2":
      return `${value.toFixed(0)} ppm`;
    case "vocEquivalent":
    case "voc":
      return `${value.toFixed(0)} ppb`;
    case "gasResistance":
      return `${(value / 1000).toFixed(1)} kΩ`;
    case "battery":
      return `${value.toFixed(0)}%`;
    case "uptime":
      return formatUptime(value);
    case "signalStrength":
      return `${value.toFixed(0)} dBm`;
    case "dataRate":
      return `${value.toFixed(1)} kbps`;
    case "connectedDevices":
      return `${value.toFixed(0)} devices`;
    default:
      return `${value}`;
  }
}

/**
 * Format uptime in seconds to human readable
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Get quality label for IAQ value
 */
export function getIAQQuality(iaq?: number): { label: string; color: string } {
  if (!iaq) return { label: "N/A", color: "text-gray-400" };
  if (iaq <= 50) return { label: "Excellent", color: "text-green-400" };
  if (iaq <= 100) return { label: "Good", color: "text-emerald-400" };
  if (iaq <= 150) return { label: "Moderate", color: "text-yellow-400" };
  if (iaq <= 200) return { label: "Poor", color: "text-orange-400" };
  return { label: "Hazardous", color: "text-red-400" };
}

/**
 * Determine which specialized widget to render for a device
 */
export type DeviceWidgetType = 
  | "environmental"   // Temperature, humidity, pressure, gas
  | "spore-analysis"  // Spore counting and analysis
  | "network"         // Gateway/connectivity stats
  | "scientific"      // Scientific instruments
  | "chamber"         // Cultivation chamber controls
  | "portable"        // Battery-powered field device
  | "basic";          // Basic status only

export function getDeviceWidgetType(deviceType?: string): DeviceWidgetType {
  const role = parseDeviceRole(deviceType);
  
  switch (role) {
    case "mushroom1":
    case "standalone":
      return "environmental";
    case "sporebase":
      return "spore-analysis";
    case "gateway":
      return "network";
    case "science_comms":
      return "scientific";
    case "side_a":
    case "side_b":
      return "chamber";
    case "portable":
      return "portable";
    default:
      return "basic";
  }
}
