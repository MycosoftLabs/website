import { NextResponse } from "next/server"
import {
  buildSearchQaArtifact,
  evaluateSearchQaObservations,
  type SearchQaObservation,
  type SearchQaScenario,
} from "@/lib/search/search-qa-artifact"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 2500), 1), 10000)
  return NextResponse.json(buildSearchQaArtifact(limit))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  if (body.planOnly) {
    const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 10000)
    const artifact = buildSearchQaArtifact(limit)
    const observations = artifact.scenarios.map((scenario) => ({
      scenarioId: scenario.id,
      query: scenario.query,
      homeSubmitted: true,
      navigationMs: 0,
      firstWidgetMs: 0,
      fullHydrationMs: 0,
      renderedWidgets: scenario.expectedWidgets,
      widgetsWithData: Object.fromEntries(
        Object.entries(scenario.expectedWidgetData).map(([widget, expectation]) => [
          widget,
          expectation.dataRequired ? 1 : 0,
        ]),
      ),
      widgetsWithNoData: [],
      earthLayers: scenario.expectedEarthLayers,
      rawTimeoutVisible: false,
      chunkErrorVisible: false,
      consoleErrors: [],
      qaSnapshot: { mode: "plan-only" },
    })) satisfies SearchQaObservation[]
    return NextResponse.json(evaluateSearchQaObservations(artifact.scenarios, observations))
  }
  const scenarios = Array.isArray(body.scenarios)
    ? body.scenarios as SearchQaScenario[]
    : buildSearchQaArtifact(Number(body.limit ?? 2500)).scenarios
  const observations = Array.isArray(body.observations)
    ? body.observations as SearchQaObservation[]
    : []
  return NextResponse.json(evaluateSearchQaObservations(scenarios, observations))
}
