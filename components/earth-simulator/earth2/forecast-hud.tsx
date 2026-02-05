"use client";

/**
 * Forecast HUD Component
 * February 5, 2026
 * 
 * Heads-up display for Earth-2 forecast information on Earth Simulator
 * Shows model run status, GPU utilization, and current forecast time
 */

import { useState, useEffect } from "react";
import { 
  Cloud, 
  Cpu, 
  Clock, 
  Activity, 
  Thermometer,
  Wind,
  Droplets,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEarth2, type Earth2Status } from "@/lib/earth2/client";
import { cn } from "@/lib/utils";

interface ForecastHUDProps {
  forecastHours: number;
  selectedModel: string;
  activeLayers?: string[];
  activeLayerCount?: number;
  onRefresh?: () => void;
}

export function ForecastHUD({
  forecastHours,
  selectedModel,
  activeLayers = [],
  activeLayerCount,
  onRefresh,
}: ForecastHUDProps) {
  const layerCount = activeLayerCount ?? activeLayers.length;
  const { status, loading, isOnline, refreshStatus } = useEarth2();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const forecastTime = new Date(currentTime.getTime() + forecastHours * 3600000);

  return (
    <div className="space-y-2">
      {/* Main Status Bar */}
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-emerald-500/30 overflow-hidden">
        <div className="px-3 py-2 border-b border-emerald-500/20 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            NVIDIA Earth-2
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 ml-auto",
              isOnline
                ? "border-emerald-500/30 text-emerald-300"
                : "border-yellow-500/30 text-yellow-300"
            )}
          >
            {loading ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : isOnline ? (
              <>
                <CheckCircle className="w-2.5 h-2.5 mr-1" />
                ONLINE
              </>
            ) : (
              <>
                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                OFFLINE
              </>
            )}
          </Badge>
        </div>

        <div className="p-3 space-y-2">
          {/* Model Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Model</span>
            <span className="text-white font-medium">{getModelDisplayName(selectedModel)}</span>
          </div>

          {/* Forecast Time */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Forecast
            </span>
            <div className="text-right">
              <div className="text-cyan-400 font-mono">+{forecastHours}h</div>
              <div className="text-[10px] text-gray-500">
                {forecastTime.toLocaleDateString()} {forecastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Active Layers */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Active Layers</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-[10px]">
              {layerCount}
            </Badge>
          </div>

          {/* Layer List */}
          {activeLayers.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {activeLayers.map((layer) => (
                <Badge 
                  key={layer} 
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] px-1"
                >
                  {layer}
                </Badge>
              ))}
            </div>
          )}

          {/* GPU Status */}
          {status && (
            <div className="pt-2 border-t border-emerald-500/20">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> GPU
                </span>
                <span className="text-purple-400">{status.gpuStatus.utilization}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                  style={{ width: `${status.gpuStatus.utilization}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <span>{status.gpuStatus.deviceName}</span>
                <span>{status.gpuStatus.temperature}°C</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-2">
        <QuickStat icon={Thermometer} label="Temp" value="24°C" color="orange" />
        <QuickStat icon={Wind} label="Wind" value="12 m/s" color="cyan" />
        <QuickStat icon={Droplets} label="Precip" value="2.5mm" color="blue" />
      </div>
    </div>
  );
}

function QuickStat({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
  };

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded border backdrop-blur-sm",
      colorClasses[color] || colorClasses.cyan
    )}>
      <Icon className="w-3 h-3" />
      <div className="text-[10px]">
        <div className="text-gray-400">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function getModelDisplayName(model: string): string {
  const names: Record<string, string> = {
    "atlas_era5": "Atlas ERA5",
    "atlas_gfs": "Atlas GFS",
    "stormscope": "StormScope",
    "corrdiff": "CorrDiff",
    "healda": "HealDA",
    "fourcastnet": "FourCastNet",
  };
  return names[model] || model;
}

export default ForecastHUD;
