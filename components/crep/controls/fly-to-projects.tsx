"use client"

/**
 * Fly-To Mycosoft Projects — Apr 21, 2026
 *
 * Morgan: "make a fly to projects also project oyster, project goffs, ect".
 *
 * Quick-navigation strip for active Mycosoft projects. Clicking a chip
 * flies the map to the project's site (with site-appropriate zoom +
 * pitch) AND toggles the relevant CREP layers ON so the user lands on
 * a fully-painted view of that project's data.
 *
 * New projects get added to MYCOSOFT_PROJECTS below — the chip row
 * picks them up automatically.
 */

import { cn } from "@/lib/utils"

export interface MycosoftProject {
  /** Stable id used for DOM keys + analytics */
  id: string
  /** Brand code shown on chip (short) */
  code: string
  /** Full human-readable label for the tooltip */
  label: string
  /** One-line pitch for hover */
  pitch: string
  /** Map center [lng, lat] */
  center: [number, number]
  /** Target zoom */
  zoom: number
  /** Optional pitch for dramatic site arrival */
  pitch3d?: number
  /** Optional bearing rotation */
  bearing?: number
  /** CREP layer ids to auto-enable on fly-to */
  layersOn?: string[]
  /** Tailwind accent classes for the chip border + hover glow */
  accent: string
}

export const MYCOSOFT_PROJECTS: MycosoftProject[] = [
  {
    id: "project-oyster",
    code: "OYSTER",
    label: "Project Oyster — Tijuana Estuary",
    pitch: "MYCODAO + MYCOSOFT bivalve restoration over the Tijuana River Valley. H₂S hotspot + IBWC discharge + beach closures + Navy training waters + oyster sites.",
    // TJ Estuary mouth — between IB Pier and the international border
    center: [-117.12, 32.55],
    zoom: 12,
    pitch3d: 55,
    bearing: -18,
    layersOn: [
      // Apr 21, 2026 v2: chip now enables all 18 Oyster sub-layers
      "tijuanaEstuary", "projectOysterPerimeter", "projectOysterSites",
      "h2sHotspot", "tjRiverFlow", "tjBeachClosures",
      "tjNavyTraining", "tjEstuaryMonitors",
      "oysterCameras", "oysterBroadcast", "oysterCell",
      "oysterPower", "oysterNature", "oysterRails",
      "oysterCaves", "oysterGovernment", "oysterTourism",
      "oysterSensors", "oysterHeatmap",
    ],
    accent: "border-teal-500/50 hover:border-teal-400 hover:bg-teal-500/15 text-teal-200 hover:text-teal-100",
  },
  {
    id: "project-goffs",
    code: "GOFFS",
    label: "Project Goffs — Mojave National Preserve",
    pitch: "MYCOSOFT biz-dev vertical thesis site. Historic Route 66 community, east Mojave desert ecology adjacent to NPS MOJA — Joshua trees, desert tortoise, creosote, bighorn. Cameras, power, rails, caves, government, tourism, sensors + heatmap overlay.",
    // Goffs, CA — 34.9244°N, -115.0736°W (MYCOSOFT project anchor)
    center: [-115.074, 34.924],
    zoom: 10,
    pitch3d: 50,
    bearing: 12,
    layersOn: [
      // Apr 21, 2026 v2: chip now enables all 15 Goffs sub-layers
      "mojavePreserve", "mojaveGoffs", "mojaveWilderness",
      "mojaveClimate", "mojaveINat",
      "mojaveCameras", "mojaveBroadcast", "mojaveCell",
      "mojavePower", "mojaveRails", "mojaveCaves",
      "mojaveGovernment", "mojaveTourism", "mojaveSensors",
      "mojaveHeatmap",
    ],
    accent: "border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/15 text-cyan-200 hover:text-cyan-100",
  },
  // Apr 23, 2026 — Morgan: "i dont see any fly to buttons for anything
  // but goffs and oyster fix that now" + "i also want just like goffs
  // and osyer a fly to and layers od detaisl perimeters and special
  // icon locations for dc and new york".
  {
    id: "project-nyc",
    code: "NYC",
    label: "Project NYC — 5 boroughs + NJ approach",
    pitch: "Urban intelligence test zone. Manhattan anchor + perimeter over 5 boroughs. MTA subway + rail, LaGuardia + JFK + Newark, 400+ hospitals, 530 cell towers, UN + consulates, Statue of Liberty, WTC, Central Park, 10k iNat observations.",
    center: [-74.006, 40.7128],
    zoom: 11,
    pitch3d: 45,
    bearing: 0,
    layersOn: [
      "projectNyc",
      "nycHospitals", "nycPolice", "nycSewage", "nycCellTowers",
      "nycAmFmAntennas", "nycMilitary", "nycDataCenters",
      "nycTransitSubway", "nycTransitRail", "nycAirports",
      "nycGovtEmbassy", "nycInat",
    ],
    accent: "border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/15 text-cyan-200 hover:text-cyan-100",
  },
  {
    id: "project-dc",
    code: "DC",
    label: "Project DC — National Capital Region",
    pitch: "Proving CREP to Mil/Gov/IC. White House, Capitol, Pentagon, CIA HQ, Walter Reed, JB Andrews, Ft Meade, NSA, Arlington Cemetery. WMATA + MARC + VRE + Amtrak. 82 embassies + 530 cell towers + 10k iNat obs.",
    center: [-77.0365, 38.8977],
    zoom: 11,
    pitch3d: 45,
    bearing: 0,
    layersOn: [
      "projectDc",
      "dcHospitals", "dcPolice", "dcSewage", "dcCellTowers",
      "dcAmFmAntennas", "dcMilitary", "dcDataCenters",
      "dcTransitSubway", "dcTransitRail", "dcAirports",
      "dcGovtEmbassy", "dcInat",
    ],
    accent: "border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/15 text-amber-200 hover:text-amber-100",
  },
]

// Apr 23, 2026 — Morgan: "every single environmental sensor and data
// source tool in nyc and cd and san diego los angeles and san francisco
// and chicago and austin houston texas and miami florida and denver
// colorado and salt lake city and other large cities in the us need to
// be on crep in map no questions asked".
// Fly-to targets for top US metros — even when their coverage layers
// aren't baked yet, the user can still jump the map to the city and
// the global layers (CREP live entities, HIFLD infra, AIS, etc.) paint.
// New city bakes (bake-us-major-cities.mjs) wire their own toggles in
// later; this list is the navigation baseline.
export const US_MAJOR_CITIES: MycosoftProject[] = [
  { id: "fly-sd",       code: "SD",   label: "San Diego + Tijuana",       pitch: "SDG&E zone, Project Oyster, Mexican border, Navy fleet, Camp Pendleton.", center: [-117.1611, 32.7157], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-la",       code: "LA",   label: "Los Angeles",              pitch: "LA Metro, Port of LA/Long Beach, LAX, CalGuard, wildfires + traffic.",   center: [-118.2437, 34.0522], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-sf",       code: "SF",   label: "San Francisco Bay",        pitch: "BART + Caltrain, Presidio, Mission Bay, Port of Oakland, 49 Mile route.", center: [-122.4194, 37.7749], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-chicago",  code: "CHI",  label: "Chicago",                  pitch: "CTA L, ORD + MDW, Lake Michigan, Ft Sheridan.",                         center: [-87.6298, 41.8781], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-austin",   code: "AUS",  label: "Austin, TX",               pitch: "Capital, SXSW, semi fabs, Ft Hood approach.",                           center: [-97.7431, 30.2672], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-houston",  code: "HOU",  label: "Houston, TX",              pitch: "Port of Houston, Ship Channel, NASA JSC, oil refineries.",              center: [-95.3698, 29.7604], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-miami",    code: "MIA",  label: "Miami, FL",                pitch: "Port of Miami, MIA airport, Homestead AFB, Everglades.",                center: [-80.1918, 25.7617], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-denver",   code: "DEN",  label: "Denver, CO",               pitch: "RTD, Buckley SFB, Cheyenne Mtn approach, Rocky Mtn NP edge.",           center: [-104.9903, 39.7392], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-slc",      code: "SLC",  label: "Salt Lake City, UT",       pitch: "Hill AFB, Wasatch Front, Great Salt Lake.",                             center: [-111.8910, 40.7608], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-seattle",  code: "SEA",  label: "Seattle, WA",              pitch: "Sound Transit, JBLM, Elliott Bay, Boeing.",                             center: [-122.3321, 47.6062], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-boston",   code: "BOS",  label: "Boston, MA",               pitch: "MBTA T, Logan, Hanscom AFB, Harvard/MIT.",                              center: [-71.0589, 42.3601], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-philly",   code: "PHL",  label: "Philadelphia",             pitch: "SEPTA, PHL airport, Philly Navy Yard, DE Valley.",                      center: [-75.1652, 39.9526], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-atlanta",  code: "ATL",  label: "Atlanta, GA",              pitch: "MARTA, ATL, Dobbins ARB, CDC HQ.",                                      center: [-84.3880, 33.7490], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-phoenix",  code: "PHX",  label: "Phoenix, AZ",              pitch: "Luke AFB, Sky Harbor, Intel + TSMC fabs.",                              center: [-112.0740, 33.4484], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
  { id: "fly-dallas",   code: "DAL",  label: "Dallas-Fort Worth",        pitch: "DART, DFW, NAS JRB Ft Worth, Sheppard AFB.",                            center: [-96.7970, 32.7767], zoom: 10, accent: "border-orange-500/40 hover:border-orange-400 hover:bg-orange-500/10 text-orange-200" },
]

interface FlyToProjectsProps {
  /** Called with center+zoom+pitch+bearing when a project chip is clicked */
  onFlyTo: (target: { center: [number, number]; zoom: number; pitch?: number; bearing?: number }) => void
  /** Called with a list of layer ids to flip to enabled:true after the fly */
  onEnableLayers?: (layerIds: string[]) => void
  className?: string
  compact?: boolean
}

export function FlyToProjects({ onFlyTo, onEnableLayers, className, compact = false }: FlyToProjectsProps) {
  const chip = (p: MycosoftProject) => (
    <button
      key={p.id}
      onClick={() => {
        onFlyTo({ center: p.center, zoom: p.zoom, pitch: p.pitch3d, bearing: p.bearing })
        if (p.layersOn && p.layersOn.length && onEnableLayers) onEnableLayers(p.layersOn)
      }}
      className={cn(
        "rounded-lg border bg-black/40 backdrop-blur-sm transition-all font-mono tracking-wider",
        "active:scale-95",
        p.accent,
        compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
      )}
      title={`${p.label} — ${p.pitch}`}
      aria-label={p.label}
    >
      {p.code}
    </button>
  )

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div>
        <div className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-mono px-1 mb-1">
          Projects
        </div>
        <div className="flex gap-1 flex-wrap">
          {MYCOSOFT_PROJECTS.map(chip)}
        </div>
      </div>
      {/* Apr 23, 2026 — Morgan: "every single environmental sensor and
          data source tool in nyc and cd and san diego los angeles ... and
          other large cities in the us". US major-metros fly-to strip. */}
      <div>
        <div className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-mono px-1 mb-1">
          US metros
        </div>
        <div className="flex gap-1 flex-wrap">
          {US_MAJOR_CITIES.map(chip)}
        </div>
      </div>
    </div>
  )
}
