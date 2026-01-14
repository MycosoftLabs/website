"use client";

/**
 * Situational Awareness Widget
 * 
 * Defense-focused environmental intelligence widget displaying:
 * - ETA: Environmental Threat Assessment
 * - ESI: Environmental Stability Index
 * - BAR: Biological Anomaly Report
 * - RER: Remediation Effectiveness Report
 * - EEW: Environmental Early Warning
 * 
 * Connected to APIs, MINDEX, and NLM for actionable intelligence.
 * Uses military/intel terminology adapted for dual-use (defense + environmental).
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  AlertTriangle,
  Activity,
  Bug,
  BarChart3,
  Zap,
  RefreshCw,
  X,
  Maximize2,
  Minimize2,
  Target,
  ChevronRight,
} from "lucide-react";

type IntelReportType = "ETA" | "ESI" | "BAR" | "RER" | "EEW" | "eta" | "esi" | "bar" | "rer" | "eew";
type ThreatLevel = "green" | "yellow" | "orange" | "red" | "black";

interface IntelReport {
  id: string;
  type: IntelReportType;
  timestamp: Date | string;
  title: string;
  summary: string;
  threatLevel: ThreatLevel;
  confidence: number; // 0-100
  source: string;
  actionable: boolean;
  location?: string;
  recommendations?: string[];
  severity?: "info" | "low" | "medium" | "high" | "critical";
}

interface SituationalAwarenessProps {
  className?: string;
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

const REPORT_TYPES: Record<string, { name: string; icon: typeof AlertTriangle; color: string }> = {
  ETA: {
    name: "Environmental Threat Assessment",
    icon: AlertTriangle,
    color: "text-red-400 bg-red-500/20 border-red-500/30",
  },
  ESI: {
    name: "Environmental Stability Index",
    icon: Activity,
    color: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  },
  BAR: {
    name: "Biological Anomaly Report",
    icon: Bug,
    color: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  },
  RER: {
    name: "Remediation Effectiveness Report",
    icon: BarChart3,
    color: "text-green-400 bg-green-500/20 border-green-500/30",
  },
  EEW: {
    name: "Environmental Early Warning",
    icon: Zap,
    color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  },
  // Lowercase variants (from API)
  eta: {
    name: "Environmental Threat Assessment",
    icon: AlertTriangle,
    color: "text-red-400 bg-red-500/20 border-red-500/30",
  },
  esi: {
    name: "Environmental Stability Index",
    icon: Activity,
    color: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  },
  bar: {
    name: "Biological Anomaly Report",
    icon: Bug,
    color: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  },
  rer: {
    name: "Remediation Effectiveness Report",
    icon: BarChart3,
    color: "text-green-400 bg-green-500/20 border-green-500/30",
  },
  eew: {
    name: "Environmental Early Warning",
    icon: Zap,
    color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  },
};

const THREAT_COLORS = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  black: "bg-gray-900 border border-red-500",
};

const THREAT_LABELS = {
  green: "LOW",
  yellow: "GUARDED",
  orange: "ELEVATED",
  red: "HIGH",
  black: "SEVERE",
};

export function SituationalAwareness({
  className = "",
  onClose,
  onMaximize,
  isMaximized = false,
}: SituationalAwarenessProps) {
  const [reports, setReports] = useState<IntelReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overallThreat, setOverallThreat] = useState<ThreatLevel>("green");
  const [selectedReport, setSelectedReport] = useState<IntelReport | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      // Try to fetch from intelligence API
      const response = await fetch("/api/natureos/intel-reports");
      
      if (response.ok) {
        const data = await response.json();
        // Transform API response to match component's expected format
        const transformedReports: IntelReport[] = (data.reports || []).map((r: any) => ({
          id: r.id,
          type: r.type?.toUpperCase() as IntelReportType, // Normalize to uppercase
          timestamp: r.timestamp, // Keep as string, formatTimeAgo will handle it
          title: r.title,
          summary: r.summary,
          threatLevel: mapSeverityToThreatLevel(r.severity),
          confidence: r.confidence || 50,
          source: r.source,
          actionable: r.recommendations?.length > 0,
          location: typeof r.location === "object" ? r.location?.name : r.location,
          recommendations: r.recommendations,
        }));
        setReports(transformedReports);
        setOverallThreat(calculateOverallThreat(transformedReports));
      } else {
        // Use simulated data
        const simulated = generateSimulatedReports();
        setReports(simulated);
        setOverallThreat(calculateOverallThreat(simulated));
      }
    } catch (error) {
      console.error("Failed to fetch intel reports:", error);
      const simulated = generateSimulatedReports();
      setReports(simulated);
      setOverallThreat(calculateOverallThreat(simulated));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchReports]);

  const formatTimeAgo = (date: Date | string) => {
    const timestamp = typeof date === "string" ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const actionableReports = reports.filter(r => r.actionable);
  const criticalReports = reports.filter(r => r.threatLevel === "red" || r.threatLevel === "black");

  return (
    <Card className={`bg-gray-900/95 border-gray-700 ${className}`}>
      <CardHeader className="py-2 px-3 border-b border-gray-700 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
          <Shield className="h-4 w-4" />
          SITUATIONAL AWARENESS
          <div className={`w-3 h-3 rounded-full ${THREAT_COLORS[overallThreat]}`} />
        </CardTitle>
        <div className="flex items-center gap-1">
          {criticalReports.length > 0 && (
            <Badge variant="destructive" className="text-[10px] animate-pulse">
              {criticalReports.length} CRITICAL
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white"
            onClick={fetchReports}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {onMaximize && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={onMaximize}
            >
              {isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-red-400"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Overall Status Bar */}
        <div className="p-2 border-b border-gray-800 bg-gray-950/50">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">THREAT CONDITION</span>
            <span className={`font-bold ${overallThreat === "red" || overallThreat === "black" ? "text-red-400" : "text-gray-300"}`}>
              {THREAT_LABELS[overallThreat]}
            </span>
          </div>
          <div className="flex gap-1">
            {(["green", "yellow", "orange", "red", "black"] as ThreatLevel[]).map((level, i) => (
              <div
                key={level}
                className={`h-1.5 flex-1 rounded ${
                  i <= ["green", "yellow", "orange", "red", "black"].indexOf(overallThreat)
                    ? THREAT_COLORS[level]
                    : "bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Report Type Summary */}
        <div className="p-2 border-b border-gray-800 grid grid-cols-5 gap-1">
          {(["ETA", "ESI", "BAR", "RER", "EEW"] as const).map((type) => {
            const config = REPORT_TYPES[type];
            // Count both uppercase and lowercase versions
            const count = reports.filter(r => r.type?.toUpperCase() === type).length;
            const Icon = config.icon;
            return (
              <div
                key={type}
                className="text-center p-1.5 rounded bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer transition-colors"
                title={config.name}
              >
                <Icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-gray-400" />
                <div className="text-[10px] font-bold">{type}</div>
                <div className="text-[9px] text-gray-500">{count}</div>
              </div>
            );
          })}
        </div>

        <ScrollArea className={isMaximized ? "h-[500px]" : "h-[180px]"}>
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading intelligence reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No active reports
              </div>
            ) : (
              reports.map((report) => {
                const config = REPORT_TYPES[report.type] || REPORT_TYPES["ETA"]; // Fallback to ETA if type not found
                const Icon = config?.icon || AlertTriangle;

                return (
                  <div
                    key={report.id}
                    className={`p-2 rounded-lg border cursor-pointer transition-all hover:brightness-110 ${config.color}`}
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded-md bg-black/30">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                              {report.type}
                            </Badge>
                            <span className="text-xs font-medium truncate">{report.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${THREAT_COLORS[report.threatLevel]}`} />
                            <span className="text-[10px] text-gray-400">{formatTimeAgo(report.timestamp)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{report.summary}</p>
                        
                        {selectedReport?.id === report.id && (
                          <div className="mt-2 pt-2 border-t border-current/20 space-y-2">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-gray-500">Confidence:</span>
                              <Progress value={report.confidence} className="h-1.5 flex-1" />
                              <span>{report.confidence}%</span>
                            </div>
                            {report.location && (
                              <div className="text-[10px] text-gray-400">
                                <Target className="h-3 w-3 inline mr-1" />
                                {report.location}
                              </div>
                            )}
                            {report.recommendations && report.recommendations.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] text-gray-500 font-medium">RECOMMENDATIONS:</div>
                                {report.recommendations.map((rec, i) => (
                                  <div key={i} className="text-[10px] text-gray-400 flex items-start gap-1">
                                    <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" />
                                    {rec}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function mapSeverityToThreatLevel(severity?: string): ThreatLevel {
  switch (severity) {
    case "critical": return "red";
    case "high": return "orange";
    case "medium": return "yellow";
    case "low": return "green";
    case "info": return "green";
    default: return "green";
  }
}

function generateSimulatedReports(): IntelReport[] {
  const now = Date.now();
  return [
    {
      id: "eta-1",
      type: "ETA",
      timestamp: new Date(now - 10 * 60 * 1000),
      title: "PFAS Contamination Risk",
      summary: "Elevated PFAS levels detected near installation water source. Groundwater sampling recommended.",
      threatLevel: "orange",
      confidence: 85,
      source: "MINDEX Environmental",
      actionable: true,
      location: "Camp Pendleton, CA",
      recommendations: [
        "Initiate groundwater sampling protocol",
        "Review downstream water usage",
        "Coordinate with base environmental office",
      ],
    },
    {
      id: "esi-1",
      type: "ESI",
      timestamp: new Date(now - 30 * 60 * 1000),
      title: "Soil Stability Assessment",
      summary: "Northern sector showing 12% degradation in microbial activity. Infrastructure review advised.",
      threatLevel: "yellow",
      confidence: 72,
      source: "MycoNode Network",
      actionable: false,
      location: "Sector 7, Grid 4-C",
    },
    {
      id: "bar-1",
      type: "BAR",
      timestamp: new Date(now - 2 * 60 * 60 * 1000),
      title: "Fungal Bloom Detected",
      summary: "Aspergillus species concentration 3x baseline in HVAC Zone B. Air quality monitoring initiated.",
      threatLevel: "red",
      confidence: 94,
      source: "ALARM Sensors",
      actionable: true,
      location: "Building 42, HVAC Zone B",
      recommendations: [
        "Isolate affected HVAC zones",
        "Deploy air quality response team",
        "Sample and culture for species ID",
      ],
    },
    {
      id: "rer-1",
      type: "RER",
      timestamp: new Date(now - 4 * 60 * 60 * 1000),
      title: "Bioremediation Progress",
      summary: "Fuel spill remediation at 67% effectiveness. Microbial activity within target parameters.",
      threatLevel: "green",
      confidence: 88,
      source: "MINDEX Analytics",
      actionable: false,
      location: "Motor Pool Area",
    },
    {
      id: "eew-1",
      type: "EEW",
      timestamp: new Date(now - 6 * 60 * 60 * 1000),
      title: "Storm System Approaching",
      summary: "Category 2 storm expected within 72h. Prepare for potential flooding and sensor network disruption.",
      threatLevel: "yellow",
      confidence: 91,
      source: "NatureOS Weather",
      actionable: true,
      location: "Coastal Installations",
      recommendations: [
        "Secure outdoor sensor equipment",
        "Pre-position emergency response assets",
        "Activate storm protocols",
      ],
    },
  ];
}

function calculateOverallThreat(reports: IntelReport[]): ThreatLevel {
  const levels: ThreatLevel[] = ["green", "yellow", "orange", "red", "black"];
  let maxIndex = 0;
  
  for (const report of reports) {
    const index = levels.indexOf(report.threatLevel);
    if (index > maxIndex) maxIndex = index;
  }
  
  return levels[maxIndex];
}

export default SituationalAwareness;
