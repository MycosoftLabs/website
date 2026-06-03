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

import { memo, type CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertCircle, MapPin, Clock, User, Camera, 
  Database, Leaf, Globe, Bird, PawPrint, Bug, Fish, Waves, CircleDot,
  type LucideIcon,
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
  // Kingdom/taxa classification for all-life support
  kingdom?: string;
  iconicTaxon?: string;
}

interface FungalMarkerProps {
  observation: FungalObservation;
  isSelected?: boolean;
  onClick?: () => void;
  onClose?: () => void;
  onHover?: (observation: FungalObservation | null, point?: { x: number; y: number }) => void;
}

// Get source info for display — MINDEX data is enriched by MYCA and Nature Learning Model
function getSourceInfo(source?: string) {
  switch (source) {
    case "MINDEX":
      return { icon: <Database className="w-3 h-3" />, color: "text-purple-400", label: "MINDEX · MYCA · NLM" };
    case "iNaturalist":
      return { icon: <Leaf className="w-3 h-3" />, color: "text-green-400", label: "iNaturalist" };
    case "GBIF":
      return { icon: <Globe className="w-3 h-3" />, color: "text-blue-400", label: "GBIF" };
    default:
      return { icon: <Database className="w-3 h-3" />, color: "text-gray-400", label: source || "Unknown" };
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

// Kingdom-specific styling for all-life support.
// Explicit hex colors avoid Tailwind/JIT misses inside MapLibre marker portals.
const KINGDOM_STYLES: Record<string, { Icon: LucideIcon; bg: string; icon: string; border: string; glow: string; label: string; emoji?: string }> = {
  Fungi:            { Icon: CircleDot, bg: "#b45309", icon: "#fff7ed", border: "rgba(253, 230, 138, 0.95)", glow: "rgba(251, 191, 36, 0.55)", label: "Fungus", emoji: "\u{1F344}" },
  Plantae:          { Icon: Leaf,      bg: "#047857", icon: "#86efac", border: "rgba(134, 239, 172, 0.9)", glow: "rgba(52, 211, 153, 0.5)", label: "Plant" },
  Aves:             { Icon: Bird,      bg: "#0369a1", icon: "#bae6fd", border: "rgba(186, 230, 253, 0.9)", glow: "rgba(56, 189, 248, 0.5)", label: "Bird" },
  Mammalia:         { Icon: PawPrint,  bg: "#7c3aed", icon: "#ede9fe", border: "rgba(221, 214, 254, 0.95)", glow: "rgba(167, 139, 250, 0.55)", label: "Mammal" },
  Reptilia:         { Icon: PawPrint,  bg: "#4d7c0f", icon: "#d9f99d", border: "rgba(217, 249, 157, 0.9)", glow: "rgba(132, 204, 22, 0.5)", label: "Reptile" },
  Amphibia:         { Icon: Waves,     bg: "#15803d", icon: "#bbf7d0", border: "rgba(187, 247, 208, 0.9)", glow: "rgba(34, 197, 94, 0.5)", label: "Amphibian" },
  Actinopterygii:   { Icon: Fish,      bg: "#0e7490", icon: "#a5f3fc", border: "rgba(165, 243, 252, 0.9)", glow: "rgba(34, 211, 238, 0.5)", label: "Fish" },
  Mollusca:         { Icon: CircleDot, bg: "#be123c", icon: "#fecdd3", border: "rgba(254, 205, 211, 0.9)", glow: "rgba(244, 63, 94, 0.5)", label: "Mollusk" },
  Arachnida:        { Icon: Bug,       bg: "#991b1b", icon: "#fecaca", border: "rgba(254, 202, 202, 0.9)", glow: "rgba(239, 68, 68, 0.5)", label: "Arachnid" },
  Insecta:          { Icon: Bug,       bg: "#a16207", icon: "#fef08a", border: "rgba(254, 240, 138, 0.95)", glow: "rgba(234, 179, 8, 0.55)", label: "Insect" },
  Animalia:         { Icon: PawPrint,  bg: "#9333ea", icon: "#f3e8ff", border: "rgba(233, 213, 255, 0.9)", glow: "rgba(192, 132, 252, 0.5)", label: "Animal" },
  Unknown:          { Icon: CircleDot, bg: "#52525b", icon: "#e4e4e7", border: "rgba(228, 228, 231, 0.85)", glow: "rgba(161, 161, 170, 0.35)", label: "Unclassified" },
  Chromista:        { Icon: Leaf,      bg: "#047857", icon: "#86efac", border: "rgba(134, 239, 172, 0.9)", glow: "rgba(52, 211, 153, 0.5)", label: "Chromist" },
  Protozoa:         { Icon: PawPrint,  bg: "#c2410c", icon: "#fed7aa", border: "rgba(254, 215, 170, 0.9)", glow: "rgba(251, 146, 60, 0.5)", label: "Protozoan" },
};

function getKingdomStyle(kingdom?: string, iconicTaxon?: string) {
  const iconic = String(iconicTaxon || "").trim().toLowerCase();
  const kingdomRaw = String(kingdom || "").trim().toLowerCase();
  const token = iconic && iconic !== "unknown" ? iconic : kingdomRaw;
  const raw = `${iconic} ${kingdomRaw}`.toLowerCase();
  if (token.includes("fungi") || token.includes("fungus") || token.includes("mycota")) return KINGDOM_STYLES.Fungi;
  if (raw.includes("plantae") || raw.includes("plant") || raw.includes("magnoliophyta")) return KINGDOM_STYLES.Plantae;
  if (raw.includes("aves") || raw.includes("bird")) return KINGDOM_STYLES.Aves;
  if (raw.includes("mammalia") || raw.includes("mammal") || raw.includes("cetacea") || raw.includes("whale")) return KINGDOM_STYLES.Mammalia;
  if (raw.includes("reptilia") || raw.includes("reptile")) return KINGDOM_STYLES.Reptilia;
  if (raw.includes("amphibia") || raw.includes("amphibian")) return KINGDOM_STYLES.Amphibia;
  if (raw.includes("actinopterygii") || raw.includes("fish") || raw.includes("chondrichthyes")) return KINGDOM_STYLES.Actinopterygii;
  if (raw.includes("mollusca") || raw.includes("mollusk") || raw.includes("mollusc")) return KINGDOM_STYLES.Mollusca;
  if (raw.includes("arachnida") || raw.includes("spider") || raw.includes("arachnid")) return KINGDOM_STYLES.Arachnida;
  if (raw.includes("insecta") || raw.includes("insect")) return KINGDOM_STYLES.Insecta;
  if (raw.includes("chromista")) return KINGDOM_STYLES.Chromista;
  if (raw.includes("protozoa")) return KINGDOM_STYLES.Protozoa;
  if (raw.includes("animalia") || raw.includes("animal")) return KINGDOM_STYLES.Animalia;
  return KINGDOM_STYLES.Unknown;
}

// Memoized component to prevent unnecessary re-renders when parent updates
export const FungalMarker = memo(function FungalMarkerInner({ observation, isSelected = false, onClick, onClose, onHover }: FungalMarkerProps) {
  const markerLatitude = Number(observation.latitude);
  const markerLongitude = Number(observation.longitude);

  // Guard: Ensure coordinates are valid
  if (
    !Number.isFinite(markerLatitude) ||
    !Number.isFinite(markerLongitude) ||
    (markerLatitude === 0 && markerLongitude === 0)
  ) {
    return null;
  }

  if (typeof window !== "undefined") {
    const debug = ((window as any).__crep_render_debug ||= {
      fungalRenderCalls: 0,
      eventRenderCalls: 0,
    });
    debug.fungalRenderCalls += 1;
  }

  const speciesName = observation.taxon?.preferred_common_name || observation.species || observation.taxon?.name || "Unknown Species";
  const scientificName = observation.taxon?.name || observation.species || "";
  const isResearchGrade = observation.quality_grade === "research";
  const photoUrl = observation.photos?.[0]?.url;
  const sourceInfo = getSourceInfo(observation.source);
  const kingdomStyle = getKingdomStyle(observation.kingdom, observation.iconicTaxon);
  const KingdomIcon = kingdomStyle.Icon;

  return (
    <MapMarker
      longitude={markerLongitude}
      latitude={markerLatitude}
      offset={[0, -7]}
      onClick={() => onClick?.()}
    >
      {/* MarkerContent is REQUIRED to properly position the marker on the map */}
      <MarkerContent data-marker="fungal" data-observation-id={String(observation.id)}>
        <button
          type="button"
          onMouseEnter={(e) => onHover?.(observation, { x: e.clientX, y: e.clientY })}
          onMouseMove={(e) => onHover?.(observation, { x: e.clientX, y: e.clientY })}
          onMouseLeave={() => onHover?.(null)}
          className={cn(
            "crep-species-marker-dot",
            // May 21 2026 (Morgan: "nature markers blinking on every zoom").
            // Dropped `transition-all duration-200 ease-in-out` — it was
            // firing on every parent re-render (e.g. each viewport-tick or
            // groundFilter change) and visibly re-animating every nature
            // marker. Hover keeps its scale via a non-transitioned class
            // change; selection scale is instant.
            "relative flex items-center justify-center",
            "h-[15px] w-[15px] rounded-full border shadow-md",
            isSelected
              ? "scale-[1.45] ring-2 ring-white z-50"
              : "hover:scale-125 z-10",
          )}
          style={{
            "--species-bg": kingdomStyle.bg,
            "--species-icon": kingdomStyle.icon,
            "--species-border": kingdomStyle.border,
            "--species-glow": kingdomStyle.glow,
            backgroundColor: kingdomStyle.bg,
            borderColor: kingdomStyle.border,
            boxShadow: `0 0 ${isResearchGrade ? 9 : 5}px ${kingdomStyle.glow}`,
            color: kingdomStyle.icon,
          } as CSSProperties}
          title={`${speciesName} (${kingdomStyle.label})`}
        >
          {kingdomStyle.emoji ? (
            <span className="relative text-[9px] leading-none drop-shadow-sm" aria-hidden="true">
              {kingdomStyle.emoji}
            </span>
          ) : (
            <KingdomIcon className="relative h-[9px] w-[9px] drop-shadow-sm" strokeWidth={3} />
          )}
          {isResearchGrade && isSelected && (
            <div
              className="absolute h-[15px] w-[15px] rounded-full opacity-25 pointer-events-none"
              style={{ backgroundColor: kingdomStyle.icon }}
            />
          )}
        </button>
      </MarkerContent>
      
      {/* ═══════════════════════════════════════════════════════════════════════════
          ATTACHED POPUP WIDGET - Connected to the marker
          Appears next to the marker when selected, rich data display
          ═══════════════════════════════════════════════════════════════════════════ */}
      {isSelected && (
        <MarkerPopup
          className="min-w-[280px] max-w-[320px] bg-[#0a1628]/98 backdrop-blur-md shadow-2xl p-0 overflow-hidden"
          style={{ borderColor: kingdomStyle.border } as CSSProperties}
          closeButton
          closeOnClick={false}
          anchor="bottom"
          offset={[0, -8]}
          onClose={onClose}
        >
          {/* Compact Header with Species Name - Kingdom-themed */}
          <div className={cn(
            "px-3 py-2 border-b"
          )}
          style={{ borderColor: kingdomStyle.border, backgroundColor: `${kingdomStyle.bg}55` }}>
            <div className="flex items-start gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                style={{ backgroundColor: kingdomStyle.bg, borderColor: kingdomStyle.border, color: kingdomStyle.icon }}
              >
                {kingdomStyle.emoji ? (
                  <span className="text-sm leading-none" aria-hidden="true">{kingdomStyle.emoji}</span>
                ) : (
                  <KingdomIcon className="h-4 w-4" strokeWidth={2.4} />
                )}
              </div>
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
            <Image
              src={photoUrl}
              alt={speciesName}
              className="w-full h-24 object-cover"
              width={480}
              height={192}
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized
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
          {/* Source + Coords Row — Apr 22, 2026 source is now a passive tag, not a link */}
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

          {/* Apr 22, 2026 — only keep the internal MINDEX detail link.
              iNat/GBIF click-throughs removed (data-in-widget policy).
              Species, observer, photos, grade already render inline above. */}
          {observation.source === "MINDEX" ? (
            <Link
              href={`/mindex/observations/${observation.id}`}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-[11px] font-medium transition-colors border border-amber-500/30"
            >
              Open full MINDEX record
            </Link>
          ) : null}
        </div>
        </MarkerPopup>
      )}
    </MapMarker>
  );
}, areFungalMarkerPropsEqual);

function areFungalMarkerPropsEqual(prev: FungalMarkerProps, next: FungalMarkerProps) {
  if ((prev.isSelected ?? false) !== (next.isSelected ?? false)) return false;
  const a = prev.observation;
  const b = next.observation;
  return (
    String(a.id) === String(b.id) &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.observed_on === b.observed_on &&
    a.species === b.species &&
    a.kingdom === b.kingdom &&
    a.iconicTaxon === b.iconicTaxon &&
    a.quality_grade === b.quality_grade &&
    a.source === b.source &&
    a.sourceUrl === b.sourceUrl &&
    a.externalId === b.externalId &&
    a.photos?.[0]?.url === b.photos?.[0]?.url &&
    a.taxon?.id === b.taxon?.id &&
    a.taxon?.name === b.taxon?.name &&
    a.taxon?.preferred_common_name === b.taxon?.preferred_common_name
  );
}

// Display name for debugging
FungalMarker.displayName = "FungalMarker";
