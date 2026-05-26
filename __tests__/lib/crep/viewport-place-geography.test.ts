import {
  buildViewportGeographyContext,
  resolveMacroRegionLabel,
  resolveViewportGeographyLod,
} from "@/lib/crep/viewport-place";

const USMCA_BOUNDS = {
  north: 72,
  south: 14,
  east: -52,
  west: -168,
};

describe("resolveViewportGeographyLod", () => {
  it("returns macro for continent-scale US view", () => {
    expect(
      resolveViewportGeographyLod(3.5, {
        north: 52,
        south: 24,
        east: -66,
        west: -125,
      }),
    ).toBe("macro");
  });

  it("returns city for street-level zoom", () => {
    expect(
      resolveViewportGeographyLod(14, {
        north: 32.82,
        south: 32.78,
        east: -96.78,
        west: -96.82,
      }),
    ).toBe("city");
  });
});

describe("buildViewportGeographyContext", () => {
  it("shows North America headline for wide USMCA viewport, not a county", () => {
    const ctx = buildViewportGeographyContext(
      {
        country: "United States",
        state: "Texas",
        county: "Palo Pinto County",
        city: "Mineral Wells",
      },
      3,
      USMCA_BOUNDS,
    );

    expect(ctx.lod).toBe("macro");
    expect(ctx.headline).toBe("North America");
    expect(ctx.subheadline).toContain("USMCA");
    expect(ctx.headline).not.toContain("Palo Pinto");
  });

  it("honors fly-to label override for country chip", () => {
    const ctx = buildViewportGeographyContext(
      { country: "Italy", state: "Lazio", city: "Rome" },
      6,
      { north: 47, south: 36, east: 19, west: 6 },
      { flyToLabel: "Italy", regionLabel: "Italy" },
    );

    expect(ctx.headline).toBe("Italy");
  });
});

describe("resolveMacroRegionLabel", () => {
  it("detects North America for USMCA bbox", () => {
    expect(resolveMacroRegionLabel(USMCA_BOUNDS, 3)).toBe("North America");
  });
});
