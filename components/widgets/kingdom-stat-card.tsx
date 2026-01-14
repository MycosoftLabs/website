"use client";

/**
 * KingdomStatCard - Comprehensive biodiversity + environmental + unique stats widget
 * 
 * Shows ALL kingdom data in one widget:
 * - Species, Observations, Images (biodiversity metrics)
 * - CO2, Methane, Water (environmental metrics)
 * - Unique kingdom-specific stats (e.g., decomposition, migration, pollination)
 * - Live news ticker for each kingdom
 * 
 * Supports all 9 kingdoms: Plants, Birds, Insects, Animals, Marine, Mammals,
 * Protista, Bacteria, Archaea
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Leaf, Bird, Bug, PawPrint, Fish, Cat, Cloud, Flame, Droplets,
  Eye, Image, Database, Microscope, CircleDot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export type KingdomType = 
  | "plants" | "birds" | "insects" | "animals" | "marine" | "mammals"
  | "protista" | "bacteria" | "archaea";

export interface KingdomStatCardProps {
  kingdom: KingdomType;
  // Biodiversity metrics
  species: number;
  observations: number;
  images: number;
  speciesDelta: number;
  observationsDelta: number;
  imagesDelta: number;
  // Environmental metrics
  co2: number;           // tonnes/day (negative = absorption)
  methane: number;       // tonnes/day
  water: number;         // million liters/day
  co2Delta: number;
  methaneDelta: number;
  waterDelta: number;
  className?: string;
}

// High-quality background images for each kingdom (Unsplash)
const kingdomImages: Record<KingdomType, string> = {
  plants: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80", // Dense forest
  birds: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&q=80", // Flock of birds
  insects: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80", // Monarch butterfly
  animals: "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800&q=80", // Safari wildlife
  marine: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=800&q=80", // Underwater ocean
  mammals: "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&q=80", // Elephants herd
  protista: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&q=80", // Microscopic view
  bacteria: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80", // Petri dish cultures
  archaea: "https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=800&q=80", // Volcanic geothermal
};

// Complete kingdom configuration with unique stats and news
const kingdomConfig: Record<KingdomType, {
  name: string;
  icon: typeof Leaf;
  color: string;
  textColor: string;
  bgGradient: string;
  overlayColor: string;
  co2Label: string;
  isAbsorber: boolean;
  uniqueStats: { label: string; value: string; unit: string }[];
  news: string[];
}> = {
  plants: {
    name: "Plants",
    icon: Leaf,
    color: "text-emerald-500",
    textColor: "text-emerald-400",
    bgGradient: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    overlayColor: "bg-emerald-900/70",
    co2Label: "CO₂ Absorbed",
    isAbsorber: true,
    uniqueStats: [
      { label: "CO₂ Seq", value: "458M", unit: "t/d" },
      { label: "O₂ Prod", value: "420M", unit: "t/d" },
      { label: "Biomass", value: "450B", unit: "t" },
    ],
    news: [
      "Amazon rainforest shows unexpected carbon uptake surge",
      "Rare orchid population rebounds in Madagascar",
      "Seagrass restoration reaches 50,000 hectares globally",
      "Ancient bristlecone pine dated to 5,100 years old",
    ],
  },
  birds: {
    name: "Birds",
    icon: Bird,
    color: "text-sky-500",
    textColor: "text-sky-400",
    bgGradient: "from-sky-500/10 to-sky-600/5 border-sky-500/20",
    overlayColor: "bg-sky-900/70",
    co2Label: "CO₂ Output",
    isAbsorber: false,
    uniqueStats: [
      { label: "Migration", value: "2.1B", unit: "active" },
      { label: "Nesting", value: "890M", unit: "sites" },
      { label: "Fledging", value: "45K", unit: "/hr" },
    ],
    news: [
      "Arctic tern completes record 59,000 mile migration",
      "Bald eagle populations reach historic high in USA",
      "New songbird species identified in Papua New Guinea",
      "Flamingo super-colony forms in Kenya's Lake Nakuru",
    ],
  },
  insects: {
    name: "Insects",
    icon: Bug,
    color: "text-purple-500",
    textColor: "text-purple-400",
    bgGradient: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    overlayColor: "bg-purple-900/70",
    co2Label: "CO₂ Output",
    isAbsorber: false,
    uniqueStats: [
      { label: "Pollin.", value: "84B", unit: "events" },
      { label: "Colonies", value: "12M", unit: "active" },
      { label: "Metamorph", value: "320M", unit: "/hr" },
    ],
    news: [
      "Monarch butterfly migration arrives early in Mexico",
      "Bee colony collapse rates declining in Europe",
      "New firefly species discovered in Chinese caves",
      "Dragonfly population surge indicates wetland recovery",
    ],
  },
  animals: {
    name: "Animals",
    icon: PawPrint,
    color: "text-orange-500",
    textColor: "text-orange-400",
    bgGradient: "from-orange-500/10 to-orange-600/5 border-orange-500/20",
    overlayColor: "bg-orange-900/70",
    co2Label: "CO₂ Output",
    isAbsorber: false,
    uniqueStats: [
      { label: "Predation", value: "8.5M", unit: "/hr" },
      { label: "Territory", value: "120K", unit: "chg/d" },
      { label: "Births", value: "2.1M", unit: "/hr" },
    ],
    news: [
      "Wolf pack territory expansion in Yellowstone",
      "African elephant census shows 12% population increase",
      "Snow leopard sighted at record altitude in Himalayas",
      "Pangolin rescue center releases 500th rehabilitated animal",
    ],
  },
  marine: {
    name: "Marine",
    icon: Fish,
    color: "text-cyan-500",
    textColor: "text-cyan-400",
    bgGradient: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20",
    overlayColor: "bg-cyan-900/70",
    co2Label: "CO₂ Absorbed",
    isAbsorber: true,
    uniqueStats: [
      { label: "Temp Δ", value: "+0.8", unit: "°C/yr" },
      { label: "Coral", value: "72%", unit: "health" },
      { label: "Migrate", value: "450m", unit: "avg" },
    ],
    news: [
      "Great Barrier Reef shows coral regeneration signs",
      "Blue whale population recovering in Antarctic waters",
      "New deep-sea fish species found at 8,000m depth",
      "Humpback whale song patterns shifting with climate",
    ],
  },
  mammals: {
    name: "Mammals",
    icon: Cat,
    color: "text-rose-500",
    textColor: "text-rose-400",
    bgGradient: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
    overlayColor: "bg-rose-900/70",
    co2Label: "CO₂ Output",
    isAbsorber: false,
    uniqueStats: [
      { label: "Grazing", value: "95M", unit: "ha/d" },
      { label: "Herds", value: "1.2M", unit: "moving" },
      { label: "Calving", value: "85K", unit: "/hr" },
    ],
    news: [
      "Wildebeest migration crosses Mara River in record numbers",
      "Giant panda population upgrade from endangered to vulnerable",
      "Polar bear hunting range shifts 200km northward",
      "African wild dog reintroduction success in Mozambique",
    ],
  },
  protista: {
    name: "Protista",
    icon: Microscope,
    color: "text-lime-500",
    textColor: "text-lime-400",
    bgGradient: "from-lime-500/10 to-lime-600/5 border-lime-500/20",
    overlayColor: "bg-lime-900/70",
    co2Label: "CO₂ Mixed",
    isAbsorber: false,
    uniqueStats: [
      { label: "Blooms", value: "12K", unit: "active" },
      { label: "Plankton", value: "2.3B", unit: "t/km³" },
      { label: "Biolum", value: "45%", unit: "coverage" },
    ],
    news: [
      "Bioluminescent dinoflagellate bloom off California coast",
      "Harmful algal bloom warning issued for Gulf of Mexico",
      "Diatom populations recovering after volcanic event",
      "New amoeba species found in deep ocean vents",
    ],
  },
  bacteria: {
    name: "Bacteria",
    icon: CircleDot,
    color: "text-pink-500",
    textColor: "text-pink-400",
    bgGradient: "from-pink-500/10 to-pink-600/5 border-pink-500/20",
    overlayColor: "bg-pink-900/70",
    co2Label: "CO₂ Output",
    isAbsorber: false,
    uniqueStats: [
      { label: "Decomp", value: "85M", unit: "t/d" },
      { label: "N₂ Fix", value: "190M", unit: "t/yr" },
      { label: "Alerts", value: "23", unit: "active" },
    ],
    news: [
      "Antibiotic-resistant strain monitoring intensified in Asia",
      "Soil microbiome study reveals carbon sequestration boost",
      "Nitrogen-fixing bacteria engineered for crop enhancement",
      "New probiotic strains discovered in traditional ferments",
    ],
  },
  archaea: {
    name: "Archaea",
    icon: CircleDot,
    color: "text-indigo-500",
    textColor: "text-indigo-400",
    bgGradient: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20",
    overlayColor: "bg-indigo-900/70",
    co2Label: "CO₂ Mixed",
    isAbsorber: false,
    uniqueStats: [
      { label: "CH₄ Prod", value: "420K", unit: "t/d" },
      { label: "Extreme", value: "8.5K", unit: "sites" },
      { label: "Geo Act", value: "142", unit: "events" },
    ],
    news: [
      "Methanogen activity increases in thawing permafrost",
      "Thermophilic archaea found at new deep-sea vent",
      "Halophilic archaea bloom in Bonneville Salt Flats",
      "Ancient archaea genome sequenced from 2 billion year old rock",
    ],
  },
};

function formatCompact(num: number): string {
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(1) + "B";
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(1) + "M";
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(1) + "K";
  return absNum.toLocaleString();
}

// News ticker component
function NewsTicker({ news, color }: { news: string[]; color: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
        setFade(true);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [news.length]);

  return (
    <div 
      className={cn(
        "text-[10px] truncate transition-opacity duration-300 px-1",
        color,
        fade ? "opacity-80" : "opacity-0"
      )}
    >
      📰 {news[currentIndex]}
    </div>
  );
}

export function KingdomStatCard({
  kingdom,
  species,
  observations,
  images,
  speciesDelta,
  observationsDelta,
  imagesDelta,
  co2,
  methane,
  water,
  co2Delta,
  methaneDelta,
  waterDelta,
  className,
}: KingdomStatCardProps) {
  const config = kingdomConfig[kingdom];
  if (!config) return null;

  const Icon = config.icon;
  const isAbsorbing = co2 < 0;
  const co2Display = Math.abs(co2);

  const bgImageUrl = kingdomImages[kingdom];

  return (
    <Card className={cn("relative overflow-hidden", config.bgGradient, className)}>
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${bgImageUrl})` }}
      />
      {/* Color Overlay Layer */}
      <div className={cn("absolute inset-0", config.overlayColor)} />
      {/* Content Layer */}
      <div className="relative z-10">
      {/* Header with kingdom name and live indicator */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-1.5 px-3">
        <CardTitle className="text-[13px] font-semibold flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", config.color)} />
          {config.name}
        </CardTitle>
        <span className="text-[10px] text-green-500 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </CardHeader>
      
      <CardContent className="space-y-1.5 px-3 pb-2 pt-0">
        {/* Biodiversity Stats Row - Species, Observations, Images */}
        <div className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 rounded bg-black/20">
          <div className="flex items-center gap-1">
            <Database className={cn("h-3 w-3", config.color)} />
            <span className="font-bold text-foreground">{formatCompact(species)}</span>
            <span className="text-muted-foreground">sp</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-blue-400" />
            <span className="font-bold text-foreground">{formatCompact(observations)}</span>
            <span className="text-muted-foreground">obs</span>
          </div>
          <div className="flex items-center gap-1">
            <Image className="h-3 w-3 text-amber-400" />
            <span className="font-bold text-foreground">{formatCompact(images)}</span>
            <span className="text-muted-foreground">img</span>
          </div>
        </div>

        {/* Unique Kingdom Stats - 3 columns */}
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {config.uniqueStats.map((stat, i) => (
            <div key={i} className="flex flex-col items-center py-1 px-1.5 rounded bg-black/15">
              <span className="text-muted-foreground text-[9px]">{stat.label}</span>
              <span className={cn("font-bold", config.textColor)}>{stat.value}</span>
              <span className="text-muted-foreground text-[8px]">{stat.unit}</span>
            </div>
          ))}
        </div>

        {/* Environmental Metrics - CO2, Methane, Water */}
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {/* CO2 */}
          <div className="flex flex-col items-center py-1 px-1.5 rounded bg-black/10">
            <Cloud className={cn("h-3 w-3", isAbsorbing ? "text-green-400" : "text-red-400")} />
            <span className={cn("font-bold tabular-nums", isAbsorbing ? "text-green-400" : "text-red-400")}>
              {formatCompact(co2Display)}
            </span>
            <span className="text-muted-foreground text-[8px]">t CO₂/d</span>
          </div>
          
          {/* Methane */}
          <div className="flex flex-col items-center py-1 px-1.5 rounded bg-black/10">
            <Flame className="h-3 w-3 text-amber-400" />
            <span className="font-bold tabular-nums text-amber-400">
              {formatCompact(methane)}
            </span>
            <span className="text-muted-foreground text-[8px]">t CH₄/d</span>
          </div>
          
          {/* Water */}
          <div className="flex flex-col items-center py-1 px-1.5 rounded bg-black/10">
            <Droplets className="h-3 w-3 text-blue-400" />
            <span className="font-bold tabular-nums text-blue-400">
              {water > 0 ? formatCompact(water) : "—"}
            </span>
            <span className="text-muted-foreground text-[8px]">{water > 0 ? "ML H₂O" : "aquatic"}</span>
          </div>
        </div>

        {/* News Ticker */}
        <div className="pt-0.5 border-t border-white/5">
          <NewsTicker news={config.news} color={config.textColor} />
        </div>
      </CardContent>
      </div>
    </Card>
  );
}
