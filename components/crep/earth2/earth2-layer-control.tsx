"use client";

/**
 * Earth-2 Layer Control Component
 * February 5, 2026
 * 
 * Full-featured control panel for NVIDIA Earth-2 weather layers on CREP Dashboard
 * Supports all models: Atlas, StormScope, CorrDiff, HealDA, FourCastNet
 */

import { useState, useEffect } from "react";
import {
  Cloud,
  Zap,
  Wind,
  Droplets,
  ThermometerSun,
  AlertTriangle,
  Radar,
  Leaf,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Circle,
  Loader2,
  Cpu,
  Gauge,
  Layers,
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Target,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export type Earth2Model = 
  | "atlas_era5"
  | "atlas_gfs" 
  | "stormscope"
  | "corrdiff"
  | "healda"
  | "fourcastnet";

export interface Earth2Filter {
  // Layer visibility
  showForecast: boolean;
  showNowcast: boolean;
  showSporeDispersal: boolean;
  showWind: boolean;
  showPrecipitation: boolean;
  showTemperature: boolean;
  showHumidity: boolean;
  showPressure: boolean;
  showStormCells: boolean;
  showClouds: boolean;
  showDownscaled: boolean;
  
  // Model configuration
  selectedModel: Earth2Model;
  ensembleMembers: number;
  forecastHours: number;
  stepHours: number;
  
  // Visualization
  opacity: number;
  windDensity: "low" | "medium" | "high";
  animated: boolean;
  
  // Spore settings
  sporeSpeciesFilter: string[];
  showSporeGradient: boolean;
  
  // Advanced
  showUncertainty: boolean;
  resolution: "native" | "1km" | "250m";
}

export const DEFAULT_EARTH2_FILTER: Earth2Filter = {
  showForecast: false,
  showNowcast: false,
  showSporeDispersal: false,
  showWind: false,
  showPrecipitation: false,
  showTemperature: false,
  showHumidity: false,
  showPressure: false,
  showStormCells: false,
  showClouds: false,
  showDownscaled: false,
  selectedModel: "atlas_era5",
  ensembleMembers: 1,
  forecastHours: 0,
  stepHours: 6,
  opacity: 0.7,
  windDensity: "medium",
  animated: true,
  sporeSpeciesFilter: [],
  showSporeGradient: true,
  showUncertainty: false,
  resolution: "native",
};

interface Earth2LayerControlProps {
  filter: Earth2Filter;
  onFilterChange: (filter: Partial<Earth2Filter>) => void;
  onRefresh: () => void;
  onRunForecast?: () => void;
  onRunNowcast?: () => void;
  isLoading?: boolean;
  serviceAvailable?: boolean;
  activeAlerts?: number;
  gpuUtilization?: number;
  lastRunId?: string;
}

// Model information
const MODEL_INFO: Record<Earth2Model, { name: string; description: string; maxHours: number; minStep: number }> = {
  atlas_era5: { name: "Atlas ERA5", description: "Medium-range forecast (0-15 days)", maxHours: 360, minStep: 6 },
  atlas_gfs: { name: "Atlas GFS", description: "Medium-range with GFS init", maxHours: 360, minStep: 6 },
  stormscope: { name: "StormScope", description: "High-res nowcasting (0-6 hours)", maxHours: 6, minStep: 0.25 },
  corrdiff: { name: "CorrDiff", description: "AI downscaling to 1km", maxHours: 168, minStep: 1 },
  healda: { name: "HealDA", description: "Data assimilation", maxHours: 0, minStep: 0 },
  fourcastnet: { name: "FourCastNet", description: "Legacy global forecast", maxHours: 168, minStep: 6 },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function Earth2LayerControl({
  filter,
  onFilterChange,
  onRefresh,
  onRunForecast,
  onRunNowcast,
  isLoading = false,
  serviceAvailable = false,
  activeAlerts = 0,
  gpuUtilization,
  lastRunId,
}: Earth2LayerControlProps) {
  const [expanded, setExpanded] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("layers");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setLastUpdate(new Date());
    }
  }, [isLoading]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const modelInfo = MODEL_INFO[filter.selectedModel];
      const nextHour = filter.forecastHours + filter.stepHours;
      
      if (nextHour > modelInfo.maxHours) {
        onFilterChange({ forecastHours: 0 });
      } else {
        onFilterChange({ forecastHours: nextHour });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, filter.forecastHours, filter.stepHours, filter.selectedModel, onFilterChange]);

  const activeLayerCount = [
    filter.showForecast,
    filter.showNowcast,
    filter.showSporeDispersal,
    filter.showWind,
    filter.showPrecipitation,
    filter.showTemperature,
    filter.showHumidity,
    filter.showPressure,
    filter.showStormCells,
    filter.showClouds,
    filter.showDownscaled,
  ].filter(Boolean).length;

  const modelInfo = MODEL_INFO[filter.selectedModel];

  return (
    <div className="bg-black/90 border border-emerald-500/30 rounded-lg overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-emerald-500/20 cursor-pointer hover:bg-emerald-500/5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            NVIDIA Earth-2
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              serviceAvailable
                ? "border-emerald-500/30 text-emerald-300"
                : "border-yellow-500/30 text-yellow-300"
            )}
          >
            {serviceAvailable ? "ONLINE" : "OFFLINE"}
          </Badge>
          {activeLayerCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 border-cyan-500/30 text-cyan-300"
            >
              {activeLayerCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gpuUtilization !== undefined && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0 h-4">
              <Cpu className="w-2.5 h-2.5 mr-1" />
              {gpuUtilization}%
            </Badge>
          )}
          {activeAlerts > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0 h-4">
              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
              {activeAlerts}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading}
            className="h-6 w-6 p-0 hover:bg-emerald-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 text-emerald-400" />
            )}
          </Button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Status Bar */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-emerald-500/20 bg-black/50">
            <div className="flex items-center gap-1 text-[10px]">
              <Circle
                className={cn(
                  "w-1.5 h-1.5",
                  serviceAvailable ? "fill-emerald-400" : "fill-yellow-400"
                )}
              />
              <span className="text-gray-400">
                {lastUpdate
                  ? `Updated ${lastUpdate.toLocaleTimeString()}`
                  : "Connecting..."}
              </span>
            </div>
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-0">
              {modelInfo.name}
            </Badge>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-black/50 border-b border-emerald-500/20 rounded-none h-8">
              <TabsTrigger value="layers" className="text-[10px] data-[state=active]:bg-emerald-500/20">
                <Layers className="w-3 h-3 mr-1" />
                Layers
              </TabsTrigger>
              <TabsTrigger value="model" className="text-[10px] data-[state=active]:bg-emerald-500/20">
                <Cpu className="w-3 h-3 mr-1" />
                Model
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-[10px] data-[state=active]:bg-emerald-500/20">
                <Settings className="w-3 h-3 mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[300px]">
              {/* Layers Tab */}
              <TabsContent value="layers" className="m-0 p-2 space-y-3">
                {/* Weather Layers */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-emerald-400/70 uppercase flex items-center gap-1">
                    <Cloud className="w-3 h-3" /> Weather Layers
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <LayerToggle
                      label="Forecast"
                      icon={<Cloud className="w-3 h-3" />}
                      checked={filter.showForecast}
                      onChange={(v) => onFilterChange({ showForecast: v })}
                      color="emerald"
                      hint="Atlas"
                    />
                    <LayerToggle
                      label="Nowcast"
                      icon={<Radar className="w-3 h-3" />}
                      checked={filter.showNowcast}
                      onChange={(v) => onFilterChange({ showNowcast: v })}
                      color="yellow"
                      hint="StormScope"
                    />
                    <LayerToggle
                      label="Temperature"
                      icon={<ThermometerSun className="w-3 h-3" />}
                      checked={filter.showTemperature}
                      onChange={(v) => onFilterChange({ showTemperature: v })}
                      color="orange"
                      hint="t2m"
                    />
                    <LayerToggle
                      label="Precipitation"
                      icon={<Droplets className="w-3 h-3" />}
                      checked={filter.showPrecipitation}
                      onChange={(v) => onFilterChange({ showPrecipitation: v })}
                      color="blue"
                      hint="tp"
                    />
                    <LayerToggle
                      label="Wind"
                      icon={<Wind className="w-3 h-3" />}
                      checked={filter.showWind}
                      onChange={(v) => onFilterChange({ showWind: v })}
                      color="cyan"
                      hint="u10/v10"
                    />
                    <LayerToggle
                      label="Humidity"
                      icon={<Activity className="w-3 h-3" />}
                      checked={filter.showHumidity}
                      onChange={(v) => onFilterChange({ showHumidity: v })}
                      color="teal"
                      hint="tcwv"
                    />
                    <LayerToggle
                      label="Cloud Cover"
                      icon={<Cloud className="w-3 h-3" />}
                      checked={filter.showClouds}
                      onChange={(v) => onFilterChange({ showClouds: v })}
                      color="gray"
                      hint="Clouds"
                    />
                    <LayerToggle
                      label="Pressure"
                      icon={<Gauge className="w-3 h-3" />}
                      checked={filter.showPressure}
                      onChange={(v) => onFilterChange({ showPressure: v })}
                      color="slate"
                      hint="MSLP"
                    />
                  </div>
                </div>

                {/* FUSARIUM Layers */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <span className="text-[10px] text-amber-400/70 uppercase flex items-center gap-1">
                    <Leaf className="w-3 h-3" /> FUSARIUM Layers
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <LayerToggle
                      label="Spore Dispersal"
                      icon={<Leaf className="w-3 h-3" />}
                      checked={filter.showSporeDispersal}
                      onChange={(v) => onFilterChange({ showSporeDispersal: v })}
                      color="amber"
                      hint="Combined"
                    />
                    <LayerToggle
                      label="Storm Cells"
                      icon={<Zap className="w-3 h-3" />}
                      checked={filter.showStormCells}
                      onChange={(v) => onFilterChange({ showStormCells: v })}
                      color="red"
                      hint="Nowcast"
                    />
                  </div>
                </div>

                {/* Advanced Layers */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <span className="text-[10px] text-purple-400/70 uppercase flex items-center gap-1">
                    <Target className="w-3 h-3" /> Advanced
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <LayerToggle
                      label="Hi-Res (CorrDiff)"
                      icon={<Target className="w-3 h-3" />}
                      checked={filter.showDownscaled}
                      onChange={(v) => onFilterChange({ showDownscaled: v })}
                      color="purple"
                      hint="1km"
                    />
                    <LayerToggle
                      label="Uncertainty"
                      icon={<TrendingUp className="w-3 h-3" />}
                      checked={filter.showUncertainty}
                      onChange={(v) => onFilterChange({ showUncertainty: v })}
                      color="pink"
                      hint="Ensemble"
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400/70 uppercase">
                      Forecast Time
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      +{filter.forecastHours}h
                    </span>
                  </div>
                  
                  {/* Playback controls */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-emerald-500/20"
                      onClick={() => onFilterChange({ forecastHours: 0 })}
                    >
                      <SkipBack className="w-3 h-3 text-emerald-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-emerald-500/20 rounded-full border border-emerald-500/30"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Play className="w-3 h-3 text-emerald-400 ml-0.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-emerald-500/20"
                      onClick={() => onFilterChange({ forecastHours: modelInfo.maxHours })}
                    >
                      <SkipForward className="w-3 h-3 text-emerald-400" />
                    </Button>
                  </div>

                  <Slider
                    min={0}
                    max={modelInfo.maxHours}
                    step={filter.stepHours}
                    value={[filter.forecastHours]}
                    onValueChange={([v]) => onFilterChange({ forecastHours: v })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>Now</span>
                    <span>{modelInfo.maxHours > 24 ? `${modelInfo.maxHours / 24}d` : `${modelInfo.maxHours}h`}</span>
                  </div>
                </div>

                {/* Opacity */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400/70">Layer Opacity</span>
                    <span className="text-[10px] text-emerald-400">{Math.round(filter.opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={[filter.opacity]}
                    onValueChange={([v]) => onFilterChange({ opacity: v })}
                    className="w-full"
                  />
                </div>
              </TabsContent>

              {/* Model Tab */}
              <TabsContent value="model" className="m-0 p-2 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-emerald-400/70 uppercase">AI Model</span>
                  <Select
                    value={filter.selectedModel}
                    onValueChange={(value) => onFilterChange({ selectedModel: value as Earth2Model })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/50 border-emerald-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODEL_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span>{info.name}</span>
                            <span className="text-[10px] text-gray-500">{info.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ensemble Members */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400/70">Ensemble Members</span>
                    <span className="text-[10px] text-emerald-400">{filter.ensembleMembers}</span>
                  </div>
                  <Slider
                    min={1}
                    max={50}
                    step={1}
                    value={[filter.ensembleMembers]}
                    onValueChange={([v]) => onFilterChange({ ensembleMembers: v })}
                    className="w-full"
                  />
                  <p className="text-[9px] text-gray-500">More members = better uncertainty estimation</p>
                </div>

                {/* Time Step */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-emerald-400/70">Time Step</span>
                  <Select
                    value={String(filter.stepHours)}
                    onValueChange={(value) => onFilterChange({ stepHours: Number(value) })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/50 border-emerald-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Resolution */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-emerald-400/70">Output Resolution</span>
                  <Select
                    value={filter.resolution}
                    onValueChange={(value) => onFilterChange({ resolution: value as Earth2Filter["resolution"] })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/50 border-emerald-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="native">Native (~25km)</SelectItem>
                      <SelectItem value="1km">High-Res (1km) - CorrDiff</SelectItem>
                      <SelectItem value="250m">Ultra-Res (250m) - CorrDiff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Run Buttons */}
                <div className="flex gap-2 pt-2 border-t border-emerald-500/20">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                    onClick={onRunForecast}
                    disabled={isLoading}
                  >
                    <Cloud className="w-3 h-3 mr-1" />
                    Run Forecast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                    onClick={onRunNowcast}
                    disabled={isLoading}
                  >
                    <Radar className="w-3 h-3 mr-1" />
                    Run Nowcast
                  </Button>
                </div>

                {lastRunId && (
                  <div className="text-[9px] text-gray-500 text-center">
                    Last run: {lastRunId}
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="m-0 p-2 space-y-3">
                {/* Wind Settings */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-emerald-400/70 uppercase">Wind Display</span>
                  <Select
                    value={filter.windDensity}
                    onValueChange={(value) => onFilterChange({ windDensity: value as Earth2Filter["windDensity"] })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/50 border-emerald-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Density</SelectItem>
                      <SelectItem value="medium">Medium Density</SelectItem>
                      <SelectItem value="high">High Density</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Animation */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400/70">Animate Wind</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-[10px]",
                      filter.animated ? "bg-emerald-500/20 text-emerald-400" : "text-gray-500"
                    )}
                    onClick={() => onFilterChange({ animated: !filter.animated })}
                  >
                    {filter.animated ? "ON" : "OFF"}
                  </Button>
                </div>

                {/* Spore Gradient */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400/70">Spore Concentration Gradient</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-[10px]",
                      filter.showSporeGradient ? "bg-amber-500/20 text-amber-400" : "text-gray-500"
                    )}
                    onClick={() => onFilterChange({ showSporeGradient: !filter.showSporeGradient })}
                  >
                    {filter.showSporeGradient ? "ON" : "OFF"}
                  </Button>
                </div>

                {/* GPU Status */}
                {gpuUtilization !== undefined && (
                  <div className="pt-2 border-t border-emerald-500/20 space-y-1.5">
                    <span className="text-[10px] text-purple-400/70 uppercase flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> GPU Status
                    </span>
                    <div className="bg-black/50 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">Utilization</span>
                        <span className="text-purple-400">{gpuUtilization}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${gpuUtilization}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-400">Device</span>
                        <span className="text-gray-300">NVIDIA A100</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface LayerToggleProps {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
  hint?: string;
}

function LayerToggle({ label, icon, checked, onChange, color, hint }: LayerToggleProps) {
  const colorClasses: Record<string, string> = {
    emerald: "border-emerald-500/50 bg-emerald-500/20 text-emerald-400",
    yellow: "border-yellow-500/50 bg-yellow-500/20 text-yellow-400",
    orange: "border-orange-500/50 bg-orange-500/20 text-orange-400",
    blue: "border-blue-500/50 bg-blue-500/20 text-blue-400",
    cyan: "border-cyan-500/50 bg-cyan-500/20 text-cyan-400",
    teal: "border-teal-500/50 bg-teal-500/20 text-teal-400",
    amber: "border-amber-500/50 bg-amber-500/20 text-amber-400",
    red: "border-red-500/50 bg-red-500/20 text-red-400",
    purple: "border-purple-500/50 bg-purple-500/20 text-purple-400",
    pink: "border-pink-500/50 bg-pink-500/20 text-pink-400",
  };

  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-1.5 rounded border transition-all px-2 py-1.5",
        checked
          ? colorClasses[color] || colorClasses.emerald
          : "border-gray-700 bg-transparent text-gray-500 hover:border-gray-600"
      )}
    >
      <div className="flex items-center justify-center w-4 h-4">{icon}</div>
      <div className="flex flex-col items-start">
        <span className="text-[10px] font-medium">{label}</span>
        {hint && <span className="text-[8px] text-gray-500">{hint}</span>}
      </div>
    </button>
  );
}

export default Earth2LayerControl;
