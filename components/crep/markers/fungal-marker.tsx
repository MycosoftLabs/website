"use client";

/**
 * Fungal Observation Marker Component for CREP Dashboard
 * 
 * Displays fungal observations from iNaturalist/GBIF on the MapLibre map
 * with species info, photos, and popup with observation details.
 */

import { cn } from "@/lib/utils";
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Leaf, Clock, MapPin, Camera, User, ExternalLink, Award } from "lucide-react";
import Link from "next/link";

export interface FungalObservation {
  id: number;
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
}

interface FungalMarkerProps {
  observation: FungalObservation;
  isSelected?: boolean;
  onClick?: () => void;
}

// Helper to get quality grade color
const getQualityColor = (grade: string) => {
  switch (grade) {
    case "research": return "bg-green-500";
    case "needs_id": return "bg-yellow-500";
    case "casual": return "bg-gray-500";
    default: return "bg-gray-500";
  }
};

// Helper to get quality grade label
const getQualityLabel = (grade: string) => {
  switch (grade) {
    case "research": return "Research Grade";
    case "needs_id": return "Needs ID";
    case "casual": return "Casual";
    default: return "Unknown";
  }
};

export function FungalMarker({ observation, isSelected = false, onClick }: FungalMarkerProps) {
  // Guard: Ensure coordinates are valid
  if (
    typeof observation.latitude !== 'number' || 
    typeof observation.longitude !== 'number' || 
    isNaN(observation.latitude) || 
    isNaN(observation.longitude)
  ) {
    return null;
  }

  const qualityColor = getQualityColor(observation.quality_grade);
  const qualityLabel = getQualityLabel(observation.quality_grade);
  const speciesName = observation.taxon?.preferred_common_name || observation.species || observation.taxon?.name || "Unknown Fungus";
  const scientificName = observation.taxon?.name || observation.species || "Unknown";
  const photoUrl = observation.photos?.[0]?.url;

  return (
    <MapMarker longitude={observation.longitude} latitude={observation.latitude} offset={[0, -10]}>
      <button
        onClick={onClick}
        className={cn(
          "relative flex items-center justify-center w-5 h-5 rounded-full border-2",
          "bg-green-600",
          isSelected ? "border-white ring-2 ring-green-400" : "border-gray-800",
          "transition-all duration-200 ease-in-out hover:scale-110"
        )}
        title={speciesName}
      >
        <Leaf className="w-3 h-3 text-white" />
        {isSelected && (
          <MarkerPopup offset={[0, -25]} className="min-w-[280px]">
            <MarkerContent title={speciesName}>
              <div className="flex flex-col gap-2 text-sm">
                <p className="text-gray-400 italic">{scientificName}</p>
                
                {/* Photo */}
                {photoUrl && (
                  <div className="rounded overflow-hidden border border-gray-700">
                    <img 
                      src={photoUrl} 
                      alt={speciesName}
                      className="w-full h-32 object-cover"
                    />
                  </div>
                )}
                
                {/* Details */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Award className="w-3 h-3" />
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px]",
                      observation.quality_grade === "research" ? "bg-green-500/20 text-green-400" :
                      observation.quality_grade === "needs_id" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    )}>
                      {qualityLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    {observation.observed_on}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}
                  </div>
                  {observation.user && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <User className="w-3 h-3" />
                      {observation.user}
                    </div>
                  )}
                  {observation.photos && observation.photos.length > 0 && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Camera className="w-3 h-3" />
                      {observation.photos.length} photo{observation.photos.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                {/* Taxon info */}
                {observation.taxon?.rank && (
                  <div className="text-xs text-gray-500">
                    Rank: <span className="text-gray-400">{observation.taxon.rank}</span>
                  </div>
                )}
                
                {/* Link to iNaturalist */}
                <Link
                  href={`https://www.inaturalist.org/observations/${observation.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline flex items-center gap-1 mt-1"
                >
                  View on iNaturalist <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </MarkerContent>
          </MarkerPopup>
        )}
      </button>
    </MapMarker>
  );
}
