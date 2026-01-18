"use client";

/**
 * Fungal Observation Marker Component for CREP Dashboard
 * 
 * Displays fungal observations from MINDEX/iNaturalist/GBIF on the MapLibre map.
 * 
 * UPDATED: Attached popup widget that appears next to the marker (not centered modal)
 * The popup is connected to the icon and includes rich data display.
 * 
 * PERFORMANCE: Uses React.memo to prevent re-renders when props haven't changed
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertCircle, MapPin, Clock, User, Camera, 
  ExternalLink, Database, Leaf, Globe 
} from "lucide-react";
import Link from "next/link";

export interface FungalObservation {
  id: number | string;
  observed_on: string;
  latitude: number;
  longitude: number;
  species: string;
  taxon_id?: number;
  taxon?: {
    id: number;
    name: string;
    preferred_common_name?: string;
    rank: string;
    ancestry?: string;
  };
  photos?: Array<{
    id: number;
    url: string;
    license?: string;
  }>;
  quality_grade: string;
  user?: string;
  // Extended fields from MINDEX/GBIF
  source?: "MINDEX" | "iNaturalist" | "GBIF" | string;
  location?: string;
  habitat?: string;
  notes?: string;
  // Source URL for "View on iNaturalist" / "View on GBIF" links
  sourceUrl?: string;
  externalId?: string;
}

interface FungalMarkerProps {
  observation: FungalObservation;
  isSelected?: boolean;
  onClick?: () => void;
  onClose?: () => void;
}

// Get source info for display
function getSourceInfo(source?: string) {
  switch (source) {
    case "MINDEX": return { icon: <Database className="w-3 h-3" />, color: "text-purple-400", label: "MINDEX" };
    case "iNaturalist": return { icon: <Leaf className="w-3 h-3" />, color: "text-green-400", label: "iNaturalist" };
    case "GBIF": return { icon: <Globe className="w-3 h-3" />, color: "text-blue-400", label: "GBIF" };
    default: return { icon: <Database className="w-3 h-3" />, color: "text-gray-400", label: source || "Unknown" };
  }
}

// Get external link URL based on source
// Uses sourceUrl from MINDEX if available (contains the original iNaturalist/GBIF link)
function getExternalUrl(observation: FungalObservation): string {
  // If MINDEX provided a sourceUrl, use it directly
  if (observation.sourceUrl) {
    return observation.sourceUrl;
  }
  
  // Otherwise, construct URL from ID
  const id = String(observation.externalId || observation.id);
  switch (observation.source) {
    case "MINDEX":
      // If no sourceUrl, check if we have an external ID we can use
      if (observation.externalId) {
        const extId = observation.externalId;
        if (extId.startsWith("inat-") || !isNaN(Number(extId))) {
          return `https://www.inaturalist.org/observations/${extId.replace("inat-", "")}`;
        }
        if (extId.startsWith("gbif-")) {
          return `https://www.gbif.org/occurrence/${extId.replace("gbif-", "")}`;
        }
      }
      return `/mindex/observations/${id}`;
    case "GBIF":
      return `https://www.gbif.org/occurrence/${id.replace("gbif-", "").replace("mindex-", "")}`;
    case "iNaturalist":
    default:
      return `https://www.inaturalist.org/observations/${id.replace("inat-", "").replace("mindex-", "")}`;
  }
}

// Memoized component to prevent unnecessary re-renders when parent updates
export const FungalMarker = memo(function FungalMarkerInner({ observation, isSelected = false, onClick, onClose }: FungalMarkerProps) {
  // Guard: Ensure coordinates are valid
  if (
    typeof observation.latitude !== 'number' || 
    typeof observation.longitude !== 'number' || 
    isNaN(observation.latitude) || 
    isNaN(observation.longitude) ||
    (observation.latitude === 0 && observation.longitude === 0)
  ) {
    return null;
  }

  const speciesName = observation.taxon?.preferred_common_name || observation.species || observation.taxon?.name || "Unknown Fungus";
  const scientificName = observation.taxon?.name || observation.species || "";
  const isResearchGrade = observation.quality_grade === "research";
  const photoUrl = observation.photos?.[0]?.url;
  const sourceInfo = getSourceInfo(observation.source);

  return (
    <MapMarker 
      longitude={observation.longitude} 
      latitude={observation.latitude} 
      offset={[0, -12]}
      onClick={() => onClick?.()}
    >
      {/* MarkerContent is REQUIRED to properly position the marker on the map */}
      <MarkerContent data-marker="fungal">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent event from bubbling (backup for any edge cases)
          }}
          className={cn(
            "relative flex items-center justify-center transition-all duration-200 ease-in-out",
            // Standard marker size - matches other event markers (w-6 h-6 = 24px)
            "w-6 h-6 rounded-full",
            // BROWN/EARTHY styling to differentiate from red Amanita device markers
            // Research grade = darker brown, needs ID = lighter tan
            isResearchGrade 
              ? "bg-amber-700 shadow-[0_0_4px_rgba(180,83,9,0.5)]" 
              : "bg-amber-600/90 shadow-[0_0_3px_rgba(217,119,6,0.4)]",
            isSelected 
              ? "scale-150 ring-2 ring-white z-50" 
              : "hover:scale-125 z-10",
          )}
          title={`🍄 ${speciesName}`}
        >
          {/* Inner glow effect - brown/amber tones */}
          <div 
            className="absolute w-3 h-3 rounded-full blur-[2px] opacity-30"
            style={{ backgroundColor: isResearchGrade ? "#b45309" : "#d97706" }}
          />
          
          {/* Icon - brown mushroom emoji with sepia filter for earthy look */}
          <span className="relative text-xs" style={{ filter: "sepia(0.4) saturate(1.2)" }}>🍄</span>
          
          {/* Pulsing ring for research grade - amber/brown, only when selected */}
          {isResearchGrade && isSelected && (
            <div className="absolute w-6 h-6 rounded-full animate-ping opacity-15 bg-amber-600 pointer-events-none" />
          )}
        </button>
      </MarkerContent>
      
      {/* ═══════════════════════════════════════════════════════════════════════════
          ATTACHED POPUP WIDGET - Connected to the marker
          Appears next to the marker when selected, rich data display
          ═══════════════════════════════════════════════════════════════════════════ */}
      {isSelected && (
        <MarkerPopup 
          className="min-w-[280px] max-w-[320px] bg-[#0a1628]/98 backdrop-blur-md border-amber-600/40 shadow-2xl shadow-amber-600/10 p-0 overflow-hidden"
          closeButton
          closeOnClick={false}
          anchor="bottom"
          offset={[0, -8]}
          onClose={onClose}
        >
          {/* Compact Header with Species Name - BROWN/AMBER theme */}
          <div className={cn(
            "px-3 py-2 border-b border-amber-600/30",
            isResearchGrade 
              ? "bg-gradient-to-r from-amber-700/40 to-orange-700/20" 
              : "bg-gradient-to-r from-amber-600/30 to-orange-600/10"
          )}>
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0" style={{ filter: "sepia(0.4) saturate(1.2)" }}>🍄</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white leading-tight truncate">
                  {speciesName}
                </h3>
                {scientificName && scientificName !== speciesName && (
                  <p className="text-[10px] text-gray-400 italic truncate">
                    {scientificName}
                  </p>
                )}
              </div>
              {/* Verification Badge - amber/brown theme */}
              <Badge className={cn(
                "shrink-0 text-[9px] px-1.5 py-0.5",
                isResearchGrade 
                  ? "bg-amber-600/20 text-amber-400 border-amber-500/50" 
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
              )}>
                {isResearchGrade ? (
                  <><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />VERIFIED</>
                ) : (
                  <><AlertCircle className="w-2.5 h-2.5 mr-0.5" />NEEDS ID</>
                )}
              </Badge>
            </div>
          </div>

        {/* Photo (if available) */}
        {photoUrl && (
          <div className="relative">
            <img
              src={photoUrl}
              alt={speciesName}
              className="w-full h-24 object-cover"
              loading="lazy"
            />
            {observation.photos && observation.photos.length > 1 && (
              <Badge className="absolute bottom-1 right-1 bg-black/70 text-white backdrop-blur text-[9px] px-1.5 py-0.5 border-0">
                <Camera className="w-2.5 h-2.5 mr-0.5" />
                {observation.photos.length}
              </Badge>
            )}
          </div>
        )}

        {/* Data Grid */}
        <div className="p-2 space-y-1.5">
          {/* Source + Coords Row */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-black/40 rounded px-2 py-1.5 border border-gray-700/50">
              <div className="text-[8px] text-gray-500 uppercase mb-0.5">Source</div>
              <div className={cn("text-[10px] font-semibold flex items-center gap-1", sourceInfo.color)}>
                {sourceInfo.icon}
                {sourceInfo.label}
              </div>
            </div>
            <div className="bg-black/40 rounded px-2 py-1.5 border border-gray-700/50">
              <div className="text-[8px] text-gray-500 uppercase mb-0.5">Coordinates</div>
              <div className="text-[10px] text-cyan-400 font-mono">
                {typeof observation.latitude === 'number' ? observation.latitude.toFixed(4) : '—'}°, {typeof observation.longitude === 'number' ? observation.longitude.toFixed(4) : '—'}°
              </div>
            </div>
          </div>

          {/* Details Row */}
          <div className="bg-black/40 rounded px-2 py-1.5 border border-gray-700/50 space-y-1">
            {observation.observed_on && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="text-gray-400">Observed:</span>
                <span className="text-white">
                  {new Date(observation.observed_on).toLocaleDateString("en-US", { 
                    month: "short", day: "numeric", year: "numeric" 
                  })}
                </span>
              </div>
            )}
            {observation.user && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <User className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="text-gray-400">Observer:</span>
                <span className="text-white truncate">{observation.user}</span>
              </div>
            )}
            {observation.location && (
              <div className="flex items-center gap-1.5 text-[10px]">
                <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                <span className="text-white truncate" title={observation.location}>
                  {observation.location}
                </span>
              </div>
            )}
          </div>

          {/* Action Button - amber/brown theme */}
          <Link
            href={getExternalUrl(observation)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-[11px] font-medium transition-colors border border-amber-500/30"
          >
            View on {observation.source || "iNaturalist"} 
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        </MarkerPopup>
      )}
    </MapMarker>
  );
});

// Display name for debugging
FungalMarker.displayName = "FungalMarker";
