/**
 * E2E Widget Tests — Category 11: Natural Events (Scenarios 85-90)
 *
 * Validates natural disaster queries trigger the Events widget with live
 * earthquake, volcano, storm data from EONET/USGS.
 */

import { test, expect } from "@playwright/test"
import { EVENTS_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  expectWidgetFirst,
  expectSecondaryWidgets,
} from "./helpers/widget-test-utils"

test.describe("Natural Events Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of EVENTS_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of EVENTS_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = EVENTS_SCENARIOS.filter((s) =>
      [85, 86, 87].includes(s.id),
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
    test("earthquakes today shows seismic data", async ({ page }) => {
      await searchAndWait(page, "earthquakes today")
      await expectWidgetExpanded(page, "events")
      await expectWidgetFirst(page, "events")
      await expectWidgetHasData(page, "events")
    })

    test("volcanic eruptions shows event data", async ({ page }) => {
      await searchAndWait(page, "volcanic eruptions recent")
      await expectWidgetExpanded(page, "events")
      await expectWidgetHasData(page, "events")
    })

    test("wildfire California shows location-filtered events", async ({
      page,
    }) => {
      await searchAndWait(page, "wildfire California")
      await expectWidgetExpanded(page, "events")
      await expectWidgetHasData(page, "events")
    })

    test("events query shows map and weather secondary", async ({ page }) => {
      await searchAndWait(page, "tornado warnings")
      await expectWidgetExpanded(page, "events")
      await expectSecondaryWidgets(page, ["map", "weather"])
    })
  })
})
