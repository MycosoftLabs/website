"use client";

/**
 * Alert Panel Component
 * February 4, 2026
 * 
 * Displays active weather and spore alerts from Earth-2 and n8n workflows
 */

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Cloud,
  Leaf,
  Zap,
  Wind,
  Droplets,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface Earth2Alert {
  id: string;
  type: "weather" | "spore" | "severe_weather" | "nowcast";
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  timestamp: string;
  expiresAt?: string;
  source: "workflow_48" | "workflow_49" | "workflow_50" | "manual";
  species?: string; // for spore alerts
  concentration?: number; // spores/m³
  windSpeed?: number; // m/s
  precipitation?: number; // mm/hr
}

interface AlertPanelProps {
  alerts: Earth2Alert[];
  onAlertClick?: (alert: Earth2Alert) => void;
  onDismiss?: (alertId: string) => void;
  maxHeight?: number;
  compact?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AlertPanel({
  alerts,
  onAlertClick,
  onDismiss,
  maxHeight = 300,
  compact = false,
}: AlertPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  const handleDismiss = (alertId: string) => {
    setDismissedIds((prev) => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const getAlertIcon = (type: Earth2Alert["type"]) => {
    switch (type) {
      case "weather":
        return <Cloud className="w-4 h-4" />;
      case "spore":
        return <Leaf className="w-4 h-4" />;
      case "severe_weather":
        return <Zap className="w-4 h-4" />;
      case "nowcast":
        return <Wind className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: Earth2Alert["severity"]) => {
    switch (severity) {
      case "low":
        return "border-blue-500/50 bg-blue-500/10 text-blue-400";
      case "moderate":
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
      case "high":
        return "border-orange-500/50 bg-orange-500/10 text-orange-400";
      case "critical":
        return "border-red-500/50 bg-red-500/10 text-red-400";
    }
  };

  const getSourceLabel = (source: Earth2Alert["source"]) => {
    switch (source) {
      case "workflow_48":
        return "Weather Auto";
      case "workflow_49":
        return "Spore Alert";
      case "workflow_50":
        return "Nowcast";
      case "manual":
        return "Manual";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  const criticalCount = visibleAlerts.filter(
    (a) => a.severity === "critical"
  ).length;
  const highCount = visibleAlerts.filter((a) => a.severity === "high").length;

  return (
    <div
      className={cn(
        "bg-black/90 border rounded-lg overflow-hidden backdrop-blur-sm",
        criticalCount > 0
          ? "border-red-500/50"
          : highCount > 0
          ? "border-orange-500/50"
          : "border-yellow-500/30"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 cursor-pointer",
          criticalCount > 0
            ? "bg-red-500/10"
            : highCount > 0
            ? "bg-orange-500/10"
            : "bg-yellow-500/10"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              "w-4 h-4",
              criticalCount > 0
                ? "text-red-400"
                : highCount > 0
                ? "text-orange-400"
                : "text-yellow-400"
            )}
          />
          <span className="text-xs font-medium text-white">
            Active Alerts
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              criticalCount > 0
                ? "border-red-500/50 text-red-400"
                : highCount > 0
                ? "border-orange-500/50 text-orange-400"
                : "border-yellow-500/50 text-yellow-400"
            )}
          >
            {visibleAlerts.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Alert List */}
      {expanded && (
        <ScrollArea style={{ maxHeight }}>
          <div className="p-2 space-y-2">
            {visibleAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "rounded border p-2 cursor-pointer transition-colors hover:bg-white/5",
                  getSeverityColor(alert.severity)
                )}
                onClick={() => onAlertClick?.(alert)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {alert.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[8px] px-1 py-0 h-3 shrink-0"
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      {!compact && (
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                          {alert.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {alert.location.name ||
                            `${alert.location.lat.toFixed(2)}, ${alert.location.lon.toFixed(2)}`}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeAgo(alert.timestamp)}
                        </span>
                      </div>
                      {!compact && alert.species && (
                        <div className="mt-1 text-[9px]">
                          <span className="text-amber-400">
                            {alert.species}
                          </span>
                          {alert.concentration && (
                            <span className="text-gray-500 ml-2">
                              {alert.concentration.toLocaleString()} spores/m³
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(alert.id);
                    }}
                    className="h-5 w-5 p-0 hover:bg-white/10 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Hook to fetch alerts from API
export function useEarth2Alerts(refreshInterval = 60000) {
  const [alerts, setAlerts] = useState<Earth2Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // In production, fetch from API
        // const response = await fetch('/api/earth2/alerts');
        // const data = await response.json();
        // setAlerts(data.alerts);

        // Simulated alerts for development
        setAlerts([
          {
            id: "alert-1",
            type: "spore",
            severity: "high",
            title: "High Fusarium Spore Count",
            description:
              "Elevated spore concentrations detected in the Midwest region. Agricultural areas may be at risk.",
            location: { lat: 41.5, lon: -93.0, name: "Central Iowa" },
            timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
            source: "workflow_49",
            species: "Fusarium graminearum",
            concentration: 2500,
          },
          {
            id: "alert-2",
            type: "nowcast",
            severity: "moderate",
            title: "Storm Cell Approaching",
            description:
              "Severe thunderstorm with potential hail moving northeast at 35 mph.",
            location: { lat: 40.0, lon: -89.5, name: "Central Illinois" },
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            source: "workflow_50",
            windSpeed: 25,
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { alerts, loading };
}

export default AlertPanel;
