import type {
  UnifiedEntityDelta,
  UnifiedEntityState,
  UnifiedEntityWithTimeline,
} from "@/lib/crep/entities/unified-entity-schema";

export function computeStateDelta(
  previous: UnifiedEntityState,
  current: UnifiedEntityState
): Partial<UnifiedEntityState> | null {
  const delta: Partial<UnifiedEntityState> = {};
  for (const key of Object.keys(current) as (keyof UnifiedEntityState)[]) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      delta[key] = current[key];
    }
  }
  return Object.keys(delta).length > 0 ? delta : null;
}

export function reconstructEntityStateAtTime(
  keyframe: UnifiedEntityState,
  deltas: UnifiedEntityDelta[],
  targetTimeMs: number
): UnifiedEntityState {
  const ordered = [...deltas]
    .filter((delta) => delta.delta_at <= targetTimeMs)
    .sort((a, b) => a.delta_at - b.delta_at);

  let state: UnifiedEntityState = { ...keyframe };
  for (const delta of ordered) {
    state = { ...state, ...delta.delta };
  }
  return state;
}

export function reconstructEntitiesAtTime(
  entities: UnifiedEntityWithTimeline[],
  targetTimeMs: number
): UnifiedEntityWithTimeline[] {
  return entities.map((entity) => ({
    ...entity,
    entity: {
      ...entity.entity,
      state: reconstructEntityStateAtTime(
        entity.keyframe.full_state,
        entity.deltas,
        targetTimeMs
      ),
    },
  }));
}
