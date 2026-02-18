/**
 * CREP unified entity schema tests.
 * Validates type shapes and that entities match UnifiedEntity interface.
 */

import type {
  UnifiedEntity,
  UnifiedPointGeometry,
  UnifiedEntityState,
  UnifiedEntityTime,
} from "@/lib/crep/entities/unified-entity-schema";

function validPointEntity(overrides: Partial<UnifiedEntity> = {}): UnifiedEntity {
  return {
    id: "test-1",
    type: "aircraft",
    geometry: {
      type: "Point",
      coordinates: [-122.4, 37.8],
    },
    state: {},
    time: {
      observed_at: new Date().toISOString(),
      valid_from: new Date().toISOString(),
    },
    confidence: 1,
    source: "test",
    properties: {},
    s2_cell: "0/0",
    ...overrides,
  };
}

describe("CREP unified entity schema", () => {
  describe("UnifiedEntity", () => {
    it("accepts valid Point geometry", () => {
      const e = validPointEntity();
      expect(e.geometry.type).toBe("Point");
      const coords = (e.geometry as UnifiedPointGeometry).coordinates;
      expect(coords).toHaveLength(2);
      expect(coords[0]).toBe(-122.4);
      expect(coords[1]).toBe(37.8);
    });

    it("accepts all entity types", () => {
      const types: UnifiedEntity["type"][] = [
        "aircraft",
        "vessel",
        "satellite",
        "fungal",
        "weather",
        "earthquake",
        "elephant",
        "device",
      ];
      types.forEach((type) => {
        const e = validPointEntity({ type });
        expect(e.type).toBe(type);
      });
    });

    it("accepts optional state fields", () => {
      const e = validPointEntity({
        state: {
          velocity: { x: 1, y: 2, z: 3 },
          heading: 90,
          altitude: 1000,
          classification: "B",
        } as UnifiedEntityState,
      });
      expect(e.state?.velocity?.x).toBe(1);
      expect(e.state?.heading).toBe(90);
      expect(e.state?.altitude).toBe(1000);
    });

    it("accepts time with valid_from and optional valid_to", () => {
      const now = new Date().toISOString();
      const e = validPointEntity({
        time: { observed_at: now, valid_from: now, valid_to: now } as UnifiedEntityTime,
      });
      expect(e.time.valid_from).toBe(now);
      expect(e.time.valid_to).toBe(now);
    });
  });
});
