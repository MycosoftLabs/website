"use client";

import { useEffect, useMemo } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type maplibregl from "maplibre-gl";

import type { UnifiedEntity } from "@/lib/crep/entities/unified-entity-schema";

export interface EntityDeckLayerProps {
  map: maplibregl.Map | null;
  entities: UnifiedEntity[];
  visible: boolean;
  onEntityClick?: (entity: UnifiedEntity) => void;
}

function getEntityColor(type: UnifiedEntity["type"]): [number, number, number, number] {
  const colorMap: Record<UnifiedEntity["type"], [number, number, number, number]> = {
    aircraft: [56, 189, 248, 220],
    vessel: [45, 212, 191, 220],
    satellite: [192, 132, 252, 230],
    fungal: [74, 222, 128, 220],
    weather: [251, 191, 36, 200],
    earthquake: [251, 113, 133, 230],
    elephant: [251, 146, 60, 220],
    device: [34, 211, 238, 220],
  };
  return colorMap[type];
}

function getEntityRadius(type: UnifiedEntity["type"]): number {
  const radiusMap: Record<UnifiedEntity["type"], number> = {
    aircraft: 1400,
    vessel: 1500,
    satellite: 1700,
    fungal: 1200,
    weather: 1800,
    earthquake: 1600,
    elephant: 1300,
    device: 1300,
  };
  return radiusMap[type];
}

function toTrailPath(entity: UnifiedEntity): [number, number][] | null {
  if (entity.geometry.type !== "Point") return null;
  if (!entity.state.velocity) return null;
  const [lng, lat] = entity.geometry.coordinates;
  const lengthFactor = 0.015;
  return [
    [lng, lat],
    [lng - entity.state.velocity.x * lengthFactor, lat - entity.state.velocity.y * lengthFactor],
  ];
}

export function EntityDeckLayer({
  map,
  entities,
  visible,
  onEntityClick,
}: EntityDeckLayerProps) {
  const overlay = useMemo(
    () =>
      new MapboxOverlay({
        interleaved: true,
      }),
    []
  );

  useEffect(() => {
    if (!map) return;
    map.addControl(overlay);
    return () => {
      map.removeControl(overlay);
    };
  }, [map, overlay]);

  useEffect(() => {
    const points = entities.filter((entity) => entity.geometry.type === "Point");
    const trails = entities
      .map((entity) => ({ entity, path: toTrailPath(entity) }))
      .filter((item): item is { entity: UnifiedEntity; path: [number, number][] } => item.path !== null);

    overlay.setProps({
      layers: [
        new ScatterplotLayer<UnifiedEntity>({
          id: "crep-unified-entities",
          data: visible ? points : [],
          pickable: true,
          radiusUnits: "meters",
          getPosition: (entity) => entity.geometry.coordinates as [number, number],
          getFillColor: (entity) => getEntityColor(entity.type),
          getRadius: (entity) => getEntityRadius(entity.type),
          onClick: ({ object }) => {
            if (object && onEntityClick) onEntityClick(object);
          },
        }),
        new PathLayer<{ entity: UnifiedEntity; path: [number, number][] }>({
          id: "crep-unified-trails",
          data: visible ? trails : [],
          pickable: false,
          widthUnits: "pixels",
          getPath: (item) => item.path,
          getColor: (item) => getEntityColor(item.entity.type),
          getWidth: 1.5,
          opacity: 0.55,
        }),
      ],
    });
  }, [overlay, entities, visible, onEntityClick]);

  return null;
}
