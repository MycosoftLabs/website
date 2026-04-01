/**
 * E2E Widget Tests — Category 12: Satellites & Space Weather (Scenarios 91-96)
 *
 * Validates satellite queries trigger Satellites widget with TLE/orbit data,
 * and space weather queries trigger Space Weather widget with NOAA SWPC data.
 */

import { test, expect } from "@playwright/test"
import { SATELLITES_SPACE_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Satellites & Space Weather Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of SATELLITES_SPACE_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of SATELLITES_SPACE_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = SATELLITES_SPACE_SCENARIOS.filter((s) =>
      [91, 95, 96].includes(s.id),
    )
    for (const scenario of criticalScenarios) {
      test(`Full QA #${scenario.id}: "${scenario.query}"`, async ({
        page,
        request,
      }) => {
        await runFullQA(page, request, scenario)
      })
    }
  })

  test.describe("Content Verification", () => {
    test("ISS tracking shows satellite orbit data", async ({ page }) => {
      await searchAndWait(page, "ISS tracking")
      await expectWidgetExpanded(page, "satellites")
      await expectWidgetHasData(page, "satellites")
    })

    test("Starlink satellites shows constellation data", async ({ page }) => {
      await searchAndWait(page, "Starlink satellites")
      await expectWidgetExpanded(page, "satellites")
      await expectWidgetHasData(page, "satellites")
    })

    test("solar flare activity shows space weather data", async ({ page }) => {
      await searchAndWait(page, "solar flare activity")
      await expectWidgetExpanded(page, "space_weather")
      await expectWidgetHasData(page, "space_weather")
    })

    test("aurora forecast shows geomagnetic data", async ({ page }) => {
      await searchAndWait(page, "aurora forecast northern lights")
      await expectWidgetExpanded(page, "space_weather")
      await expectWidgetHasData(page, "space_weather")
    })
  })
})
