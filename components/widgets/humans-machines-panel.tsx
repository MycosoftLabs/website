"use client";

/**
 * HumansMachinesPanel - Human Population & Machine Intelligence Summary
 * 
 * Shows live telemetry and statistics for:
 * - Human population (births, deaths, live counter)
 * - Vehicles (cars, trucks, motorcycles)
 * - Aircraft (commercial, private, cargo - OpenSky Network)
 * - Ships & Vessels (cargo, tankers, fishing - AIS/AISstream.io)
 * - Drones & UAVs (registered, active, military)
 * - Environmental impact (CO2, fuel consumption, water usage)
 * 
 * Future integrations:
 * - OpenSky Network (aircraft tracking)
 * - AISstream.io (ship tracking)
 * - Global Fishing Watch APIs
 * - Open source drone intelligence
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Users,
  Activity,
  Car,
  Plane,
  Ship,
  Cpu,
  Baby,
  Skull,
  Fuel,
  Cloud,
  Droplets,
  Radio,
  MapPin,
  Anchor,
  Truck,
  Bike,
  CircleDot,
} from "lucide-react";

interface HumansMachinesPanelProps {
  className?: string;
}

// Simulated live data - will be replaced with real API data
const BASELINE_DATA = {
  population: {
    total: 8_123_456_789, // ~8.1 billion
    birthsPerSecond: 4.3,
    deathsPerSecond: 1.8,
    netGrowthPerDay: 216_000,
  },
  vehicles: {
    total: 1_446_000_000, // ~1.4 billion
    cars: 1_100_000_000,
    trucks: 280_000_000,
    motorcycles: 66_000_000,
    activeNow: 312_000_000, // ~21% on road at any moment
    co2PerDay: 18_500_000, // tonnes
  },
  aircraft: {
    total: 468_000, // registered aircraft globally
    commercial: 28_500,
    private: 315_000,
    cargo: 2_800,
    military: 55_000,
    activeNow: 18_500, // in flight right now
    flightsPerDay: 115_000,
    co2PerDay: 2_800_000, // tonnes
  },
  ships: {
    total: 108_000, // cargo/tanker ships
    cargo: 54_000,
    tankers: 16_000,
    fishing: 4_600_000, // fishing vessels
    container: 5_500,
    activeNow: 62_000, // at sea now
    co2PerDay: 3_200_000, // tonnes
  },
  drones: {
    registered: 2_800_000,
    commercial: 850_000,
    consumer: 1_800_000,
    military: 45_000,
    activeNow: 125_000,
  },
  environmental: {
    totalCO2PerDay: 136_000_000, // tonnes (all human activity)
    totalMethanePerDay: 1_500_000, // tonnes
    fuelConsumptionPerDay: 102_000_000, // barrels oil equivalent
    waterUsagePerDay: 4_200, // km³ (all human use)
  },
};

function formatNumber(num: number): string {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatCompact(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(0) + "K";
  return num.toLocaleString();
}

// Live counter hook with animated increment
function useLiveCounter(baseValue: number, incrementPerSecond: number) {
  const [value, setValue] = useState(baseValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(prev => prev + incrementPerSecond);
    }, 1000);
    return () => clearInterval(interval);
  }, [incrementPerSecond]);

  return value;
}

export function HumansMachinesPanel({ className }: HumansMachinesPanelProps) {
  // Live counters
  const population = useLiveCounter(BASELINE_DATA.population.total, BASELINE_DATA.population.birthsPerSecond - BASELINE_DATA.population.deathsPerSecond);
  const birthsToday = useLiveCounter(0, BASELINE_DATA.population.birthsPerSecond);
  const deathsToday = useLiveCounter(0, BASELINE_DATA.population.deathsPerSecond);
  
  // Simulated fluctuating values for active vehicles/aircraft/ships
  const [activeData, setActiveData] = useState({
    vehicles: BASELINE_DATA.vehicles.activeNow,
    aircraft: BASELINE_DATA.aircraft.activeNow,
    ships: BASELINE_DATA.ships.activeNow,
    drones: BASELINE_DATA.drones.activeNow,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveData({
        vehicles: BASELINE_DATA.vehicles.activeNow + Math.floor((Math.random() - 0.5) * 1000000),
        aircraft: BASELINE_DATA.aircraft.activeNow + Math.floor((Math.random() - 0.5) * 500),
        ships: BASELINE_DATA.ships.activeNow + Math.floor((Math.random() - 0.5) * 200),
        drones: BASELINE_DATA.drones.activeNow + Math.floor((Math.random() - 0.5) * 5000),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className={cn(
      "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-600/30",
      className
    )}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-400" />
            Humans & Machines
          </CardTitle>
          <Badge variant="outline" className="text-sm px-1.5 py-0 h-4 border-cyan-500/30 text-cyan-400">
            <Activity className="h-4 w-4 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-2">
        {/* Human Demographics */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base text-muted-foreground flex items-center gap-1">
              <Users className="h-5 w-5 text-blue-400" />
              Human Demographics
            </span>
            <span className="text-sm text-blue-400 font-medium tracking-tight">
              ~{formatCompact(BASELINE_DATA.population.total)} <span className="text-xs text-muted-foreground ml-1">across 195 Nations</span>
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mt-3">
            <div className="p-2 rounded bg-black/20">
              <span className="text-xs text-muted-foreground block mb-1">Gender</span>
              <div className="flex justify-center gap-2 items-end mb-1">
                 <span className="font-bold text-sky-300 text-sm">~50.4%</span>
                 <span className="font-bold text-pink-300 text-sm">~49.6%</span>
              </div>
              <span className="text-xs text-muted-foreground block opacity-70">Men / Women</span>
            </div>
            <div className="p-2 rounded bg-black/20">
               <span className="text-xs text-muted-foreground block mb-1">Youth 0-14</span>
               <span className="font-bold text-purple-300 text-base">{formatCompact(2_050_000_000)}</span>
               <span className="text-xs text-muted-foreground block mt-1 opacity-70">~25.3% globally</span>
            </div>
            <div className="p-2 rounded bg-black/20">
               <span className="text-xs text-muted-foreground block mb-1">Adult 15-64</span>
               <span className="font-bold text-blue-300 text-base">{formatCompact(5_300_000_000)}</span>
               <span className="text-xs text-muted-foreground block mt-1 opacity-70">~65.2% globally</span>
            </div>
            <div className="p-2 rounded bg-black/20 flex flex-col justify-center">
               <span className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-1">
                 <Plane className="h-3 w-3 text-cyan-400" />
                 In Transit
               </span>
               <span className="font-bold text-cyan-300 text-base animate-pulse">~46M</span>
               <span className="text-xs text-muted-foreground block mt-1 opacity-70">Traveling Now</span>
            </div>
          </div>
        </div>

        {/* Vehicles Section */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base text-muted-foreground flex items-center gap-1">
              <Car className="h-5 w-5 text-orange-400" />
              Land Vehicles
            </span>
            <span className="text-sm text-orange-400">{formatCompact(activeData.vehicles)} active</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-3 rounded bg-black/20">
              <Car className="h-5 w-5 mx-auto text-orange-300" />
              <span className="font-bold text-orange-300">{formatCompact(BASELINE_DATA.vehicles.cars)}</span>
              <span className="text-muted-foreground block text-xs">cars</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <Truck className="h-5 w-5 mx-auto text-amber-300" />
              <span className="font-bold text-amber-300">{formatCompact(BASELINE_DATA.vehicles.trucks)}</span>
              <span className="text-muted-foreground block text-xs">trucks</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <Bike className="h-5 w-5 mx-auto text-yellow-300" />
              <span className="font-bold text-yellow-300">{formatCompact(BASELINE_DATA.vehicles.motorcycles)}</span>
              <span className="text-muted-foreground block text-xs">motorcycles</span>
            </div>
          </div>
        </div>

        {/* Aircraft Section */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base text-muted-foreground flex items-center gap-1">
              <Plane className="h-5 w-5 text-sky-400" />
              Aircraft (OpenSky)
            </span>
            <span className="text-sm text-sky-400">{formatCompact(activeData.aircraft)} in flight</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-sky-300 text-base">{formatCompact(BASELINE_DATA.aircraft.commercial)}</span>
              <span className="text-muted-foreground block">commercial</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-cyan-300 text-base">{formatCompact(BASELINE_DATA.aircraft.private)}</span>
              <span className="text-muted-foreground block">private</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-blue-300 text-base">{formatCompact(BASELINE_DATA.aircraft.cargo)}</span>
              <span className="text-muted-foreground block">cargo</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-indigo-300 text-base">{formatCompact(BASELINE_DATA.aircraft.military)}</span>
              <span className="text-muted-foreground block">military</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>📡 {formatCompact(BASELINE_DATA.aircraft.flightsPerDay)} flights/day</span>
            <span className="text-red-400">{formatCompact(BASELINE_DATA.aircraft.co2PerDay)}t CO₂/d</span>
          </div>
        </div>

        {/* Ships & Vessels Section */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base text-muted-foreground flex items-center gap-1">
              <Ship className="h-5 w-5 text-teal-400" />
              Ships & Vessels (AIS)
            </span>
            <span className="text-sm text-teal-400">{formatCompact(activeData.ships)} at sea</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-teal-300 text-base">{formatCompact(BASELINE_DATA.ships.cargo)}</span>
              <span className="text-muted-foreground block">cargo</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-emerald-300 text-base">{formatCompact(BASELINE_DATA.ships.tankers)}</span>
              <span className="text-muted-foreground block">tankers</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-green-300 text-base">{formatCompact(BASELINE_DATA.ships.container)}</span>
              <span className="text-muted-foreground block">container</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-cyan-300 text-base">{formatCompact(BASELINE_DATA.ships.fishing)}</span>
              <span className="text-muted-foreground block">fishing</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>🌊 Global Fishing Watch integrated</span>
            <span className="text-red-400">{formatCompact(BASELINE_DATA.ships.co2PerDay)}t CO₂/d</span>
          </div>
        </div>

        {/* Drones & UAVs Section */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base text-muted-foreground flex items-center gap-1">
              <Radio className="h-5 w-5 text-purple-400" />
              Drones & UAVs
            </span>
            <span className="text-sm text-purple-400">{formatCompact(activeData.drones)} active</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-purple-300 text-base">{formatCompact(BASELINE_DATA.drones.commercial)}</span>
              <span className="text-muted-foreground block">commercial</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-pink-300 text-base">{formatCompact(BASELINE_DATA.drones.consumer)}</span>
              <span className="text-muted-foreground block">consumer</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <span className="font-bold text-rose-300 text-base">{formatCompact(BASELINE_DATA.drones.military)}</span>
              <span className="text-muted-foreground block">military</span>
            </div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <Cloud className="h-5 w-5 text-red-400" />
            Human & Machine Environmental Impact
          </p>
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded bg-black/20">
              <Cloud className="h-5 w-5 mx-auto text-red-400" />
              <span className="font-bold text-red-400 text-sm">{formatCompact(BASELINE_DATA.environmental.totalCO2PerDay)}</span>
              <span className="text-muted-foreground block text-[10px]">t CO₂/d</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <CircleDot className="h-5 w-5 mx-auto text-amber-400" />
              <span className="font-bold text-amber-400 text-sm">{formatCompact(BASELINE_DATA.environmental.totalMethanePerDay)}</span>
              <span className="text-muted-foreground block text-[10px]">t CH₄/d</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <Fuel className="h-5 w-5 mx-auto text-orange-400" />
              <span className="font-bold text-orange-400 text-sm">{formatCompact(BASELINE_DATA.environmental.fuelConsumptionPerDay)}</span>
              <span className="text-muted-foreground block text-[10px]">bbl/d</span>
            </div>
            <div className="p-3 rounded bg-black/20">
              <Droplets className="h-5 w-5 mx-auto text-blue-400" />
              <span className="font-bold text-blue-400 text-sm">{BASELINE_DATA.environmental.waterUsagePerDay.toFixed(1)}K</span>
              <span className="text-muted-foreground block text-[10px]">km³/d</span>
            </div>
          </div>
        </div>

        {/* Data Sources & Live Indicator */}
        <div className="pt-1 border-t border-slate-700/30 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-3 mb-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3 border-sky-500/30 text-sky-400">OpenSky</Badge>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3 border-teal-500/30 text-teal-400">AISstream</Badge>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3 border-green-500/30 text-green-400">GFW</Badge>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-3 border-purple-500/30 text-purple-400">OSINT</Badge>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>Anthropogenic Intelligence Active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
