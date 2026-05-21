import {
  buildSearchQaArtifact,
  evaluateSearchQaObservations,
  generateSearchQaQueries,
  type SearchQaObservation,
} from "../search-qa-artifact"

describe("search QA artifact", () => {
  it("generates broad scenario coverage with SearchPlan expectations", () => {
    const artifact = buildSearchQaArtifact(300)
    expect(artifact.scenarioCount).toBe(300)
    expect(artifact.scenarios.some((scenario) => scenario.query === "Active earthquakes")).toBe(true)
    expect(artifact.scenarios.some((scenario) => scenario.expectedEarthLayers.includes("earthquakes"))).toBe(true)
    expect(artifact.agentPrompt).toContain("MYCOSOFT Search QA Fix Prompt")
  })

  it("deduplicates generated query strings", () => {
    const queries = generateSearchQaQueries(1000)
    expect(new Set(queries).size).toBe(queries.length)
  })

  it("reports missing widgets, empty data, forbidden layers, and runtime errors", () => {
    const artifact = buildSearchQaArtifact(20)
    const scenario = artifact.scenarios.find((item) => item.query === "Active earthquakes") ?? artifact.scenarios[0]
    const observation: SearchQaObservation = {
      scenarioId: scenario.id,
      query: scenario.query,
      homeSubmitted: true,
      navigationMs: 100,
      renderedWidgets: ["answers"],
      widgetsWithData: { answers: 1 },
      widgetsWithNoData: [],
      earthLayers: ["aviation"],
      rawTimeoutVisible: true,
      chunkErrorVisible: false,
      consoleErrors: ["Failed to fetch RSC payload for http://127.0.0.1:3010/"],
    }
    const report = evaluateSearchQaObservations([scenario], [observation])
    expect(report.findingCount).toBeGreaterThan(0)
    expect(report.findings.some((finding) => finding.code === "MISSING_WIDGET")).toBe(true)
    expect(report.findings.some((finding) => finding.code === "MISSING_EARTH_LAYER")).toBe(true)
    expect(report.findings.some((finding) => finding.code === "USER_VISIBLE_RUNTIME_ERROR")).toBe(true)
    expect(report.findings.some((finding) => finding.code === "CONSOLE_RUNTIME_ERROR")).toBe(true)
    expect(report.agentPrompt).toContain("Top findings")
  })
})
