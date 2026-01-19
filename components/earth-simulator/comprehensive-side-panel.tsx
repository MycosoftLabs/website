"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Database, Globe, Layers, MapPin, TrendingUp, Activity, Thermometer, Wind, Droplets, GripVertical, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Link from "next/link";
import { DataPanel } from "./data-panel";
import { Statistics } from "./statistics";
import { SpeciesList } from "./species-list";

interface ComprehensiveSidePanelProps {
  viewport: { north: number; south: number; east: number; west: number } | null;
  selectedCell: { cellId: string; lat: number; lon: number } | null;
  layers: {
    mycelium: boolean;
    heat: boolean;
    organisms: boolean;
    weather: boolean;
    [key: string]: boolean;
  };
  onCloseCell?: () => void;
}

// Collapsible widget component for the side panel
interface WidgetSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
}

function WidgetSection({ title, icon, defaultOpen = true, badge, children }: WidgetSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gray-800/80 border-gray-700 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-3 cursor-pointer hover:bg-gray-700/50 transition-colors">
            <CardTitle className="text-xs text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-gray-500 cursor-move" />
                {icon}
                <span className="uppercase tracking-wider">{title}</span>
                {badge !== undefined && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {badge}
                  </Badge>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3 text-sm">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ComprehensiveSidePanel({
  viewport,
  selectedCell,
  layers,
  onCloseCell,
}: ComprehensiveSidePanelProps) {
  const [viewData, setViewData] = useState<any>(null);
  const [cellData, setCellData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch viewport data
  useEffect(() => {
    if (!viewport) return;

    const fetchViewportData = async () => {
      setLoading(true);
      try {
        const [obsResponse, layersResponse] = await Promise.all([
          fetch(
            `/api/earth-simulator/inaturalist?action=bounds&nelat=${viewport.north}&nelng=${viewport.east}&swlat=${viewport.south}&swlng=${viewport.west}&per_page=200`
          ).catch(() => null),
          fetch(
            `/api/earth-simulator/layers?north=${viewport.north}&south=${viewport.south}&east=${viewport.east}&west=${viewport.west}&layers=mycelium,organisms,heat,weather`
          ).catch(() => null),
        ]);

        let obsData = { observations: [] };
        let layersData = null;
        
        if (obsResponse && obsResponse.ok) {
          try {
            obsData = await obsResponse.json();
          } catch (e) {
            console.warn("Failed to parse observations response");
          }
        }
        
        if (layersResponse && layersResponse.ok) {
          try {
            layersData = await layersResponse.json();
          } catch (e) {
            console.warn("Failed to parse layers response");
          }
        }

        setViewData({
          observations: obsData.observations || [],
          probabilities: [],
          layers: layersData?.layers || {},
        });
      } catch (error) {
        console.error("Error fetching viewport data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchViewportData();
  }, [viewport]);

  // Fetch cell-specific data
  useEffect(() => {
    if (!selectedCell) {
      setCellData(null);
      return;
    }

    const fetchCellData = async () => {
      setLoading(true);
      try {
        const [probResponse, obsResponse, cellResponse] = await Promise.all([
          fetch(
            `/api/earth-simulator/mycelium-probability?lat=${selectedCell.lat}&lon=${selectedCell.lon}&zoom=15`
          ),
          fetch(
            `/api/earth-simulator/inaturalist?action=fungi&lat=${selectedCell.lat}&lng=${selectedCell.lon}&radius=1000`
          ),
          fetch(`/api/earth-simulator/cell/${selectedCell.cellId}`).catch(() => null),
        ]);

        const probData = await probResponse.json();
        const obsData = await obsResponse.json();
        const cellDetailData = cellResponse ? await cellResponse.json() : null;

        setCellData({
          probability: probData,
          observations: obsData.observations || [],
          cellDetails: cellDetailData,
        });
      } catch (error) {
        console.error("Error fetching cell data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCellData();
  }, [selectedCell]);

  const observations = viewData?.observations || cellData?.observations || [];
  const uniqueSpecies = new Set(observations.map((obs: any) => obs.species).filter(Boolean)).size;
  const activeLayerCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="w-80 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 p-3 z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <Globe className="w-4 h-4 text-green-500" />
            Earth Simulator
          </h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/natureos">
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Link>
          </Button>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
          <span>•</span>
          <span>{activeLayerCount} layers</span>
          <span>•</span>
          <span>{observations.length} obs</span>
        </div>
      </div>

      {/* Widgets */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {/* Selected Cell Info */}
          {selectedCell && (
            <Card className="bg-green-900/30 border-green-500/30">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-green-400 uppercase tracking-wider font-bold">Selected Cell</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 hover:bg-red-500/20"
                    onClick={() => onCloseCell?.()}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>ID: {selectedCell.cellId}</div>
                  <div>Lat: {selectedCell.lat.toFixed(4)}°</div>
                  <div>Lon: {selectedCell.lon.toFixed(4)}°</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Viewport Widget */}
          <WidgetSection 
            title="Viewport" 
            icon={<MapPin className="w-3 h-3 text-blue-400" />}
            defaultOpen={true}
          >
            {viewport ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-700/50 rounded p-1.5">
                  <span className="text-gray-400 block text-[10px]">North</span>
                  <span className="text-white font-mono">{viewport.north.toFixed(2)}°</span>
                </div>
                <div className="bg-gray-700/50 rounded p-1.5">
                  <span className="text-gray-400 block text-[10px]">South</span>
                  <span className="text-white font-mono">{viewport.south.toFixed(2)}°</span>
                </div>
                <div className="bg-gray-700/50 rounded p-1.5">
                  <span className="text-gray-400 block text-[10px]">East</span>
                  <span className="text-white font-mono">{viewport.east.toFixed(2)}°</span>
                </div>
                <div className="bg-gray-700/50 rounded p-1.5">
                  <span className="text-gray-400 block text-[10px]">West</span>
                  <span className="text-white font-mono">{viewport.west.toFixed(2)}°</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-xs">No viewport data</div>
            )}
          </WidgetSection>

          {/* Active Layers Widget */}
          <WidgetSection 
            title="Layers" 
            icon={<Layers className="w-3 h-3 text-purple-400" />}
            badge={activeLayerCount}
          >
            <div className="space-y-1">
              {Object.entries(layers).map(([key, active]) => (
                <div key={key} className="flex items-center justify-between py-0.5">
                  <span className="text-gray-300 capitalize text-xs">{key}</span>
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-600'}`} />
                </div>
              ))}
            </div>
          </WidgetSection>

          {/* Quick Stats Widget */}
          <WidgetSection 
            title="Statistics" 
            icon={<Activity className="w-3 h-3 text-cyan-400" />}
            badge={observations.length}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Observations</span>
                <span className="text-white font-bold">{observations.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Unique Species</span>
                <span className="text-white font-bold">{uniqueSpecies}</span>
              </div>
              {viewData?.probabilities?.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Grid Cells</span>
                  <span className="text-white font-bold">{viewData.probabilities.length}</span>
                </div>
              )}
            </div>
          </WidgetSection>

          {/* Weather Widget (placeholder) */}
          <WidgetSection 
            title="Weather" 
            icon={<Wind className="w-3 h-3 text-yellow-400" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-700/50 rounded p-2">
                <Thermometer className="w-3 h-3 mx-auto mb-1 text-orange-400" />
                <div className="text-white font-bold text-sm">--°C</div>
                <div className="text-[10px] text-gray-400">Temp</div>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <Wind className="w-3 h-3 mx-auto mb-1 text-blue-400" />
                <div className="text-white font-bold text-sm">-- m/s</div>
                <div className="text-[10px] text-gray-400">Wind</div>
              </div>
              <div className="bg-gray-700/50 rounded p-2">
                <Droplets className="w-3 h-3 mx-auto mb-1 text-cyan-400" />
                <div className="text-white font-bold text-sm">--%</div>
                <div className="text-[10px] text-gray-400">Humidity</div>
              </div>
            </div>
          </WidgetSection>

          {/* iNaturalist Data Widget */}
          <WidgetSection 
            title="iNaturalist" 
            icon={<Database className="w-3 h-3 text-green-400" />}
            badge={observations.length}
            defaultOpen={observations.length > 0}
          >
            {loading ? (
              <div className="text-center py-4 text-gray-400 text-xs">Loading...</div>
            ) : observations.length > 0 ? (
              <div className="space-y-2">
                <SpeciesList observations={observations.slice(0, 10)} />
                {observations.length > 10 && (
                  <div className="text-center text-[10px] text-gray-500">
                    +{observations.length - 10} more
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-xs text-center py-2">
                No observations in viewport
              </div>
            )}
          </WidgetSection>

          {/* Mycelium Probability Widget */}
          {(cellData?.probability || viewData?.probabilities?.length > 0) && (
            <WidgetSection 
              title="Mycelium Probability" 
              icon={<TrendingUp className="w-3 h-3 text-emerald-400" />}
            >
              {cellData?.probability ? (
                <Statistics
                  probability={cellData.probability}
                  observations={cellData.observations}
                />
              ) : (
                <div className="space-y-1 max-h-32 overflow-auto">
                  {viewData?.probabilities?.slice(0, 5).map((prob: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                      <span className="text-gray-400">Cell {idx + 1}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {(prob.probability * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </WidgetSection>
          )}

          {/* Selected Cell Data */}
          {selectedCell && cellData && (
            <WidgetSection 
              title="Cell Analysis" 
              icon={<MapPin className="w-3 h-3 text-amber-400" />}
            >
              <DataPanel
                cellId={selectedCell.cellId}
                lat={selectedCell.lat}
                lon={selectedCell.lon}
                probability={cellData.probability}
              />
            </WidgetSection>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-gray-700/50 p-2 bg-gray-900/95">
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Earth Simulator v2.0</span>
          <span>MINDEX + iNaturalist</span>
        </div>
      </div>
    </div>
  );
}
