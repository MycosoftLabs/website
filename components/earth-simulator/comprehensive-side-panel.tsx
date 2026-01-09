"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Database, Globe, Layers, MapPin, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  };
  onCloseCell?: () => void;
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
  const [activeTab, setActiveTab] = useState("overview");

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

        // Safely parse JSON responses
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

  return (
    <div className="w-96 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Earth Simulator
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/natureos">
              <ArrowLeft className="w-4 h-4 mr-2" />
              NatureOS
            </Link>
          </Button>
        </div>
        {selectedCell && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCloseCell?.()}
            className="w-full"
          >
            Clear Selection
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Viewport Stats */}
              {viewport && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Viewport
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">North:</span>
                      <span className="text-white">{viewport.north.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">South:</span>
                      <span className="text-white">{viewport.south.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">East:</span>
                      <span className="text-white">{viewport.east.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">West:</span>
                      <span className="text-white">{viewport.west.toFixed(4)}°</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Layer Status */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Active Layers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(layers).map(([key, active]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300 capitalize">{key}</span>
                      <Badge variant={active ? "default" : "outline"}>
                        {active ? "On" : "Off"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Observations</span>
                    <Badge variant="outline">{observations.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Unique Species</span>
                    <Badge variant="outline">{uniqueSpecies}</Badge>
                  </div>
                  {viewData?.probabilities && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Grid Cells</span>
                      <Badge variant="outline">{viewData.probabilities.length}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Tab */}
            <TabsContent value="data" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading data...</div>
              ) : selectedCell && cellData ? (
                <>
                  <DataPanel
                    cellId={selectedCell.cellId}
                    lat={selectedCell.lat}
                    lon={selectedCell.lon}
                    probability={cellData.probability}
                  />
                  <Statistics
                    probability={cellData.probability}
                    observations={cellData.observations}
                  />
                  <SpeciesList observations={cellData.observations} />
                </>
              ) : (
                <>
                  {/* Viewport-wide data */}
                  {viewData && (
                    <>
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            iNaturalist Observations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-300 mb-3">
                            {observations.length} observations in viewport
                          </div>
                          {observations.length > 0 && (
                            <SpeciesList observations={observations} />
                          )}
                        </CardContent>
                      </Card>

                      {viewData.probabilities && viewData.probabilities.length > 0 && (
                        <Card className="bg-gray-800 border-gray-700">
                          <CardHeader>
                            <CardTitle className="text-sm text-white flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Mycelium Probabilities
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-64">
                              <div className="space-y-2">
                                {viewData.probabilities.slice(0, 20).map((prob: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-2 bg-gray-700/50 rounded text-sm"
                                  >
                                    <div className="flex justify-between mb-1">
                                      <span className="text-gray-300">Cell {idx + 1}</span>
                                      <Badge>
                                        {(prob.probability * 100).toFixed(1)}%
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {prob.observationCount} observations
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
