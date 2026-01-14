"use client";

/**
 * KingdomStatsRow - Compact row of species/observations/images stats for a kingdom
 * 
 * 50% scaled version of the main fungal stats for other kingdoms:
 * - Plants (Plantae)
 * - Birds (Aves)
 * - Insects (Insecta)
 * - Animals (Animalia)
 * - Marine (Ocean life)
 * - Mammals (Mammalia)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RollingNumber } from "@/components/widgets/rolling-number";
import { DataSourceMarquee, type DataSource } from "@/components/widgets/data-source-marquee";
import { cn } from "@/lib/utils";
import {
  Leaf,
  Bird,
  Bug,
  PawPrint,
  Fish,
  Database,
  Eye,
  Image,
} from "lucide-react";

export interface KingdomData {
  species: {
    total: number;
    sources: Record<string, number>;
    delta: number;
  };
  observations: {
    total: number;
    sources: Record<string, number>;
    delta: number;
  };
  images: {
    total: number;
    sources: Record<string, number>;
    delta: number;
  };
}

export interface KingdomStatsRowProps {
  kingdom: "plants" | "birds" | "insects" | "animals" | "marine" | "mammals";
  data: KingdomData;
  className?: string;
}

const KINGDOM_CONFIG = {
  plants: {
    label: "Plant",
    icon: Leaf,
    color: "emerald",
    colorClass: "text-emerald-400",
    bgClass: "from-emerald-500/10 to-emerald-600/5",
    borderClass: "border-emerald-500/20",
  },
  birds: {
    label: "Bird",
    icon: Bird,
    color: "sky",
    colorClass: "text-sky-400",
    bgClass: "from-sky-500/10 to-sky-600/5",
    borderClass: "border-sky-500/20",
  },
  insects: {
    label: "Insect",
    icon: Bug,
    color: "amber",
    colorClass: "text-amber-400",
    bgClass: "from-amber-500/10 to-amber-600/5",
    borderClass: "border-amber-500/20",
  },
  animals: {
    label: "Animal",
    icon: PawPrint,
    color: "rose",
    colorClass: "text-rose-400",
    bgClass: "from-rose-500/10 to-rose-600/5",
    borderClass: "border-rose-500/20",
  },
  marine: {
    label: "Marine",
    icon: Fish,
    color: "cyan",
    colorClass: "text-cyan-400",
    bgClass: "from-cyan-500/10 to-cyan-600/5",
    borderClass: "border-cyan-500/20",
  },
  mammals: {
    label: "Mammal",
    icon: PawPrint,
    color: "orange",
    colorClass: "text-orange-400",
    bgClass: "from-orange-500/10 to-orange-600/5",
    borderClass: "border-orange-500/20",
  },
};

function sourcesToMarquee(sources: Record<string, number>): DataSource[] {
  const sourceLabels: Record<string, string> = {
    gbif: "GBIF",
    inaturalist: "iNat",
    plantsDatabase: "PLANTS DB",
    ebird: "eBird",
    obis: "OBIS",
  };

  return Object.entries(sources).map(([key, count]) => ({
    name: sourceLabels[key] || key,
    count,
    status: "online" as const,
  }));
}

export function KingdomStatsRow({ kingdom, data, className }: KingdomStatsRowProps) {
  const config = KINGDOM_CONFIG[kingdom];
  const Icon = config.icon;

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {/* Species Card */}
      <Card className={cn(
        "bg-gradient-to-br",
        config.bgClass,
        config.borderClass,
        "relative overflow-hidden"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1">
          <CardTitle className="text-[10px] font-medium truncate">
            {config.label} Species
          </CardTitle>
          <Database className={cn("h-3 w-3", config.colorClass)} />
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-1">
          <RollingNumber
            value={data.species.total}
            color={config.color as any}
            size="sm"
            showDelta
            deltaValue={data.species.delta}
            staggering
            diff
          />
          <div className="h-4 overflow-hidden">
            <DataSourceMarquee
              sources={sourcesToMarquee(data.species.sources)}
              speed={25}
              showStatus={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observations Card */}
      <Card className={cn(
        "bg-gradient-to-br",
        config.bgClass,
        config.borderClass,
        "relative overflow-hidden"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1">
          <CardTitle className="text-[10px] font-medium truncate">
            {config.label} Obs
          </CardTitle>
          <Eye className={cn("h-3 w-3", config.colorClass)} />
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-1">
          <RollingNumber
            value={data.observations.total}
            color={config.color as any}
            size="sm"
            showDelta
            deltaValue={data.observations.delta}
            staggering
            diff
          />
          <div className="h-4 overflow-hidden">
            <DataSourceMarquee
              sources={sourcesToMarquee(data.observations.sources)}
              speed={25}
              showStatus={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Images Card */}
      <Card className={cn(
        "bg-gradient-to-br",
        config.bgClass,
        config.borderClass,
        "relative overflow-hidden"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1">
          <CardTitle className="text-[10px] font-medium truncate">
            {config.label} Images
          </CardTitle>
          <Image className={cn("h-3 w-3", config.colorClass)} />
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-1">
          <RollingNumber
            value={data.images.total}
            color={config.color as any}
            size="sm"
            showDelta
            deltaValue={data.images.delta}
            staggering
            diff
          />
          <div className="h-4 overflow-hidden">
            <DataSourceMarquee
              sources={sourcesToMarquee(data.images.sources)}
              speed={25}
              showStatus={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
