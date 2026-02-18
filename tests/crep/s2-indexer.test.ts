/**
 * CREP S2 spatial indexer tests.
 * Tests getS2LevelFromZoom, getS2CellId, getViewportCells.
 */

import {
  getS2LevelFromZoom,
  getS2CellId,
  getViewportCells,
  type MapBounds,
} from "@/lib/crep/spatial/s2-indexer";

describe("CREP S2 indexer", () => {
  describe("getS2LevelFromZoom", () => {
    it("clamps level between 4 and 20", () => {
      expect(getS2LevelFromZoom(0)).toBe(4);
      expect(getS2LevelFromZoom(100)).toBe(20);
    });

    it("increases level with zoom", () => {
      expect(getS2LevelFromZoom(2)).toBe(5);
      expect(getS2LevelFromZoom(10)).toBe(9);
      expect(getS2LevelFromZoom(14)).toBe(11);
    });
  });

  describe("getS2CellId", () => {
    it("returns a string quadkey for valid lat/lng", () => {
      const id = getS2CellId(0, 0, 10);
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("clamps lat to -90..90", () => {
      const a = getS2CellId(90, 0, 10);
      const b = getS2CellId(100, 0, 10);
      expect(a).toBe(b);
    });

    it("uses level when provided", () => {
      const low = getS2CellId(45, -122, 6);
      const high = getS2CellId(45, -122, 14);
      expect(low).not.toBe(high);
      expect(high.length).toBeGreaterThanOrEqual(low.length);
    });
  });

  describe("getViewportCells", () => {
    it("returns non-empty array for valid bounds", () => {
      const bounds: MapBounds = { north: 1, south: 0, east: 1, west: 0 };
      const cells = getViewportCells(bounds, 10);
      expect(Array.isArray(cells)).toBe(true);
      expect(cells.length).toBeGreaterThan(0);
      cells.forEach((c) => expect(typeof c).toBe("string"));
    });

    it("includes corner cells", () => {
      const bounds: MapBounds = { north: 10, south: 0, east: 10, west: 0 };
      const cells = getViewportCells(bounds, 8);
      const cornerCell = getS2CellId(10, 10, getS2LevelFromZoom(8));
      expect(cells).toContain(cornerCell);
    });

    it("handles bounds crossing date line (west > east)", () => {
      const bounds: MapBounds = { north: 5, south: -5, east: -170, west: 170 };
      const cells = getViewportCells(bounds, 6);
      expect(Array.isArray(cells)).toBe(true);
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});
