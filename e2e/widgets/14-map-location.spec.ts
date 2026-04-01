/**
 * E2E Widget Tests — Category 14: Map & Location (Scenarios 103-108)
 *
 * Validates location-bound queries and worldview triggers (CREP, Earth2, Map).
 * Tests that map-primary queries expand with correct viewport-priority sizing.
 */

import { test, expect } from "@playwright/test"
import { MAP_LOCATION_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  expectWidgetFirst,
} from "./helpers/widget-test-utils"

test.describe("Map & Location Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of MAP_LOCATION_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of MAP_LOCATION_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = MAP_LOCATION_SCENARIOS.filter((s) =>
      [103, 105, 107].includes(s.id),
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
    test("mushrooms near San Diego shows species with location", async ({
      page,
    }) => {
      await searchAndWait(page, "mushrooms near San Diego")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("observation map triggers CREP worldview", async ({ page }) => {
      await searchAndWait(page, "observation map Pacific Northwest")
      await expectWidgetExpanded(page, "crep")
      await expectWidgetFirst(page, "crep")
    })

    test("earth2 weather forecast triggers Earth2 widget", async ({
      page,
    }) => {
      await searchAndWait(page, "earth2 weather forecast")
      await expectWidgetExpanded(page, "earth2")
      await expectWidgetFirst(page, "earth2")
    })

    test("CREP monitoring triggers CREP dashboard", async ({ page }) => {
      await searchAndWait(page, "CREP monitoring dashboard")
      await expectWidgetExpanded(page, "crep")
      await expectWidgetHasData(page, "crep")
    })

    test("tracking radar triggers CREP widget", async ({ page }) => {
      await searchAndWait(page, "tracking radar global")
      await expectWidgetExpanded(page, "crep")
    })
  })
})
