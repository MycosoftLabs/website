export interface UnifiedPointGeometry {
  type: "Point";
  coordinates: [number, number] | [number, number, number];
}

export interface UnifiedLineStringGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface UnifiedPolygonGeometry {
  type: "Polygon";
  coordinates: [number, number][];
}

export interface UnifiedEntityVelocity {
  x: number;
  y: number;
  z?: number;
}

export interface UnifiedEntityState {
  velocity?: UnifiedEntityVelocity;
  heading?: number;
  altitude?: number;
  energy?: number;
  classification?: string;
}

export interface UnifiedEntityTime {
  observed_at: string;
  valid_from: string;
  valid_to?: string;
}

export interface UnifiedEntityDelta {
  delta_at: number;
  delta: Partial<UnifiedEntityState>;
}

export interface UnifiedEntityKeyframe {
  keyframe_at: number;
  full_state: UnifiedEntityState;
}

export interface UnifiedEntityWithTimeline {
  entity: UnifiedEntity;
  keyframe: UnifiedEntityKeyframe;
  deltas: UnifiedEntityDelta[];
}

export interface UnifiedEntity {
  id: string;
  type:
    | "aircraft"
    | "vessel"
    | "satellite"
    | "fungal"
    | "weather"
    | "earthquake"
    | "elephant"
    | "device";
  geometry: UnifiedPointGeometry | UnifiedLineStringGeometry | UnifiedPolygonGeometry;
  state: UnifiedEntityState;
  time: UnifiedEntityTime;
  confidence: number;
  source: string;
  properties: Record<string, unknown>;
  s2_cell: string;
}

export interface UnifiedEntityBatch {
  entities: UnifiedEntity[];
  server_time_ms: number;
}
