"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Layers, 
  TreePine, 
  Thermometer, 
  Bug, 
  Cloud,
  Radio,
  MapPin,
  Eye,
  Leaf,
  Wind,
  Droplets,
  Satellite,
  Brain,
  Zap,
  Radar,
  CloudRain,
} from "lucide-react";

interface LayerState {
  [key: string]: boolean | undefined;
  // Core layers
  fungi?: boolean;
  mycelium?: boolean;
  heat?: boolean;
  organisms?: boolean;
  weather?: boolean;
  devices?: boolean;
  inat?: boolean;
  wind?: boolean;
  precipitation?: boolean;
  ndvi?: boolean;
  nlm?: boolean;
  // Earth-2 AI Weather layers
  earth2Forecast?: boolean;
  earth2Nowcast?: boolean;
  earth2SporeDisperal?: boolean;
  earth2WindField?: boolean;
  earth2StormCells?: boolean;
  earth2Clouds?: boolean;
}

interface LayerControlsProps {
  layers: LayerState;
  onLayersChange: (layers: LayerState) => void;
}

interface LayerItem {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  primary?: boolean;
  comingSoon?: boolean;
}

interface LayerGroup {
  name: string;
  icon: React.ElementType;
  isPrimary?: boolean;
  isEarth2?: boolean;
  layers: LayerItem[];
}

const layerGroups: LayerGroup[] = [
  {
    name: "🍄 Fungal Data (Primary)",
    icon: TreePine,
    isPrimary: true,
    layers: [
      { key: "fungi", label: "Fungal Observations", icon: TreePine, description: "MINDEX + iNat + GBIF data", primary: true },
      { key: "devices", label: "MycoBrain Devices", icon: Radio, description: "IoT sensor network", primary: true },
    ],
  },
  {
    name: "Biological Data",
    icon: Leaf,
    layers: [
      { key: "organisms", label: "iNaturalist Observations", icon: Eye, description: "Species sightings" },
      { key: "mycelium", label: "Mycelium Networks", icon: TreePine, description: "Fungal distribution" },
      { key: "heat", label: "Species Density", icon: Thermometer, description: "Heatmap overlay" },
    ],
  },
  {
    name: "Environmental",
    icon: Cloud,
    layers: [
      { key: "weather", label: "Weather Conditions", icon: Cloud, description: "Temperature & conditions" },
      { key: "wind", label: "Wind Patterns", icon: Wind, description: "Wind speed & direction" },
      { key: "precipitation", label: "Precipitation", icon: Droplets, description: "Rain & moisture" },
    ],
  },
  {
    name: "AI/Analysis",
    icon: Brain,
    layers: [
      { key: "nlm", label: "NLM Predictions", icon: Brain, description: "Nature Learning Model", comingSoon: true },
      { key: "ndvi", label: "Vegetation Index", icon: Satellite, description: "NDVI from satellites", comingSoon: true },
    ],
  },
  {
    name: "NVIDIA Earth-2",
    icon: Zap,
    isEarth2: true,
    layers: [
      { key: "earth2Forecast", label: "AI Forecast (Atlas)", icon: Cloud, description: "15-day medium-range forecast" },
      { key: "earth2Nowcast", label: "Nowcast (StormScope)", icon: Radar, description: "0-6 hour storm prediction" },
      { key: "earth2SporeDisperal", label: "Spore Dispersal", icon: Wind, description: "AI-powered spore tracking" },
      { key: "earth2WindField", label: "Wind Field 3D", icon: Wind, description: "3D wind vector arrows" },
      { key: "earth2StormCells", label: "Storm Cells", icon: CloudRain, description: "3D storm visualization" },
      { key: "earth2Clouds", label: "Volumetric Clouds", icon: Cloud, description: "3D cloud rendering" },
    ],
  },
];

export function LayerControls({ layers, onLayersChange }: LayerControlsProps) {
  const handleToggle = (layer: string) => {
    onLayersChange({
      ...layers,
      [layer]: !layers[layer as keyof typeof layers],
    });
  };

  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <Card className="w-72 bg-black/80 backdrop-blur-sm border-white/10 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-green-400" />
            Data Layers
          </span>
          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
            {activeCount} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto earth-sim-layer-scroll">
        {layerGroups.map((group, groupIdx) => (
          <div key={group.name}>
            {groupIdx > 0 && <Separator className="mb-3 bg-white/10" />}
            <div className="flex items-center gap-2 mb-2">
              <group.icon className={`h-3 w-3 ${group.isPrimary ? "text-green-400" : (group as any).isEarth2 ? "text-cyan-400" : "text-gray-400"}`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${group.isPrimary ? "text-green-400" : (group as any).isEarth2 ? "text-cyan-400" : "text-gray-400"}`}>
                {group.name}
              </span>
              {(group as any).isEarth2 && (
                <Badge variant="outline" className="text-[10px] py-0 px-1 border-cyan-500/50 text-cyan-400">
                  NVIDIA
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {group.layers.map((layer) => {
                const isEnabled = layers[layer.key as keyof typeof layers] ?? false;
                const LayerIcon = layer.icon;
                const isPrimary = layer.primary;
                
                return (
                  <div 
                    key={layer.key}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      layer.comingSoon 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-white/5 cursor-pointer"
                    } ${isPrimary && isEnabled ? "bg-green-500/10 border border-green-500/20" : layer.key.startsWith("earth2") && isEnabled ? "bg-cyan-500/10 border border-cyan-500/20" : ""}`}
                    onClick={() => !layer.comingSoon && handleToggle(layer.key)}
                  >
                    <div className="flex items-center gap-2">
                      <LayerIcon className={`h-4 w-4 ${isEnabled ? (isPrimary ? "text-green-400" : layer.key.startsWith("earth2") ? "text-cyan-400" : "text-green-400") : "text-gray-500"}`} />
                      <div>
                        <Label 
                          htmlFor={layer.key} 
                          className={`text-sm cursor-pointer ${isEnabled ? "text-white" : "text-gray-300"}`}
                        >
                          {layer.label}
                          {isPrimary && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 border-green-500/50 text-green-400">
                              Primary
                            </Badge>
                          )}
                          {layer.key.startsWith("earth2") && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 border-cyan-500/50 text-cyan-400">
                              AI
                            </Badge>
                          )}
                          {layer.comingSoon && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 border-yellow-500/50 text-yellow-500">
                              Soon
                            </Badge>
                          )}
                        </Label>
                        <p className="text-[10px] text-gray-500">{layer.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={layer.key}
                      checked={isEnabled}
                      onCheckedChange={() => !layer.comingSoon && handleToggle(layer.key)}
                      disabled={layer.comingSoon}
                      className={layer.key.startsWith("earth2") ? "data-[state=checked]:bg-cyan-500" : "data-[state=checked]:bg-green-500"}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
