/**
 * E2E Widget Tests — Category 8: Weather & Climate (Scenarios 66-72)
 *
 * Validates weather queries trigger the Weather widget with live
 * temperature, wind, precipitation, and forecast data from NWS/NOAA.
 */

import { test, expect } from "@playwright/test"
import { WEATHER_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  expectSecondaryWidgets,
  SEL,
} from "./helpers/widget-test-utils"

test.describe("Weather & Climate Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of WEATHER_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of WEATHER_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = WEATHER_SCENARIOS.filter((s) =>
      [66, 67, 69].includes(s.id),
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
    test("weather San Diego shows live conditions", async ({ page }) => {
      await searchAndWait(page, "weather in San Diego")
      await expectWidgetExpanded(page, "weather")
      await expectWidgetHasData(page, "weather")
    })

    test("forecast New York shows weather data", async ({ page }) => {
      await searchAndWait(page, "forecast New York")
      await expectWidgetExpanded(page, "weather")
      await expectWidgetHasData(page, "weather")
    })

    test("weather query shows map and events secondary widgets", async ({
      page,
    }) => {
      await searchAndWait(page, "temperature Seattle today")
      await expectWidgetExpanded(page, "weather")
      await expectSecondaryWidgets(page, ["map", "events"])
    })

    test("hurricane query triggers weather with event context", async ({
      page,
    }) => {
      await searchAndWait(page, "hurricane season Atlantic")
      await expectWidgetExpanded(page, "weather")
      await expectWidgetHasData(page, "weather")
    })
  })
})
