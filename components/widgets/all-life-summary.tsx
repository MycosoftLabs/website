"use client";

/**
 * AllLifeSummary - Grand Total Environmental Intelligence Summary
 * 
 * Shows:
 * - Grand totals for species/observations/images (live updating)
 * - Global environmental impact summary (net CO2, total methane, water usage)
 * - Simple kingdom indicators showing live status
 * 
 * Individual kingdom details are now in each KingdomStatCard widget
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Globe,
  Activity,
  TrendingUp,
  Leaf,
  Bird,
  Bug,
  PawPrint,
  Fish,
  Cat,
  Microscope,
  CircleDot,
  Cloud,
  Flame,
  Droplets,
  Zap,
} from "lucide-react";

interface KingdomSummary {
  species: number;
  observations: number;
  images: number;
  speciesDelta: number;
  observationsDelta: number;
  imagesDelta: number;
}

export interface AllLifeSummaryProps {
  fungi: KingdomSummary;
  plants: KingdomSummary;
  birds: KingdomSummary;
  insects: KingdomSummary;
  animals: KingdomSummary;
  marine: KingdomSummary;
  mammals: KingdomSummary;
  protista?: KingdomSummary;
  bacteria?: KingdomSummary;
  archaea?: KingdomSummary;
  totals: {
    allSpecies: number;
    allObservations: number;
    allImages: number;
    speciesDelta: number;
    observationsDelta: number;
    imagesDelta: number;
    netCO2?: number;      // Gt/year
    totalMethane?: number; // Mt/year
    totalWater?: number;   // km³/day
  };
  className?: string;
}

// Kingdom indicators with icons and colors
const KINGDOM_INDICATORS = [
  { key: "fungi", icon: "🍄", color: "bg-green-500", label: "Fungi" },
  { key: "plants", icon: Leaf, color: "bg-emerald-500", label: "Plants" },
  { key: "birds", icon: Bird, color: "bg-sky-500", label: "Birds" },
  { key: "insects", icon: Bug, color: "bg-purple-500", label: "Insects" },
  { key: "animals", icon: PawPrint, color: "bg-orange-500", label: "Animals" },
  { key: "marine", icon: Fish, color: "bg-cyan-500", label: "Marine" },
  { key: "mammals", icon: Cat, color: "bg-rose-500", label: "Mammals" },
  { key: "protista", icon: Microscope, color: "bg-lime-500", label: "Protista" },
  { key: "bacteria", icon: CircleDot, color: "bg-pink-500", label: "Bacteria" },
  { key: "archaea", icon: CircleDot, color: "bg-indigo-500", label: "Archaea" },
] as const;

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatDelta(num: number): string {
  if (num >= 1e6) return `+${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `+${(num / 1e3).toFixed(0)}K`;
  return `+${num}`;
}

export function AllLifeSummary({
  fungi,
  plants,
  birds,
  insects,
  animals,
  marine,
  mammals,
  protista,
  bacteria,
  archaea,
  totals,
  className,
}: AllLifeSummaryProps) {
  return (
    <Card className={cn(
      "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/30",
      className
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            All Life on Earth
          </CardTitle>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-green-500/30 text-green-400">
            <Activity className="h-2.5 w-2.5 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Grand Totals - Species/Observations/Images */}
        <div className="grid grid-cols-3 gap-2 p-2 rounded-md bg-slate-800/50 border border-slate-700/50">
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground mb-0.5">Species</p>
            <p className="text-sm font-bold text-blue-400">{formatNumber(totals.allSpecies)}</p>
            <p className="text-[8px] text-green-500">{formatDelta(totals.speciesDelta)}/hr</p>
          </div>
          <div className="text-center border-x border-slate-700/50">
            <p className="text-[9px] text-muted-foreground mb-0.5">Observations</p>
            <p className="text-sm font-bold text-purple-400">{formatNumber(totals.allObservations)}</p>
            <p className="text-[8px] text-green-500">{formatDelta(totals.observationsDelta)}/hr</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground mb-0.5">Images</p>
            <p className="text-sm font-bold text-amber-400">{formatNumber(totals.allImages)}</p>
            <p className="text-[8px] text-green-500">{formatDelta(totals.imagesDelta)}/hr</p>
          </div>
        </div>

        {/* Global Environmental Impact */}
        <div className="p-2 rounded-md bg-slate-800/30 border border-slate-700/30">
          <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Global Environmental Impact
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <Cloud className={cn(
                "h-4 w-4 mx-auto mb-0.5",
                totals.netCO2 && totals.netCO2 < 0 ? "text-green-400" : "text-red-400"
              )} />
              <p className={cn(
                "text-xs font-bold",
                totals.netCO2 && totals.netCO2 < 0 ? "text-green-400" : "text-red-400"
              )}>
                {totals.netCO2 ? (totals.netCO2 > 0 ? "+" : "") + totals.netCO2.toFixed(1) : "—"}
              </p>
              <p className="text-[8px] text-muted-foreground">Gt CO₂/yr</p>
            </div>
            <div className="border-x border-slate-700/30">
              <Flame className="h-4 w-4 mx-auto mb-0.5 text-amber-400" />
              <p className="text-xs font-bold text-amber-400">
                {totals.totalMethane ? totals.totalMethane.toFixed(0) : "—"}
              </p>
              <p className="text-[8px] text-muted-foreground">Mt CH₄/yr</p>
            </div>
            <div>
              <Droplets className="h-4 w-4 mx-auto mb-0.5 text-blue-400" />
              <p className="text-xs font-bold text-blue-400">
                {totals.totalWater ? totals.totalWater.toFixed(1) : "—"}
              </p>
              <p className="text-[8px] text-muted-foreground">km³ H₂O/d</p>
            </div>
          </div>
        </div>

        {/* Kingdom Status Grid - Simple indicators */}
        <div className="p-2 rounded-md bg-slate-800/20">
          <p className="text-[9px] text-muted-foreground mb-2">Kingdom Monitoring Status</p>
          <div className="grid grid-cols-5 gap-1.5">
            {KINGDOM_INDICATORS.map((kingdom) => {
              const IconComponent = typeof kingdom.icon === "string" ? null : kingdom.icon;
              return (
                <div 
                  key={kingdom.key} 
                  className="flex flex-col items-center p-1 rounded bg-black/20"
                  title={kingdom.label}
                >
                  {IconComponent ? (
                    <IconComponent className="h-3 w-3 text-foreground/80" />
                  ) : (
                    <span className="text-xs">{kingdom.icon}</span>
                  )}
                  <span className="relative mt-0.5">
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full animate-pulse",
                      kingdom.color
                    )} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-center gap-2 pt-1 text-[9px] text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span>MINDEX Biodiversity Intelligence Active</span>
        </div>
      </CardContent>
    </Card>
  );
}
