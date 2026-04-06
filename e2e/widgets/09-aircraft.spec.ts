/**
 * E2E Widget Tests — Category 9: Aircraft (Scenarios 73-78)
 *
 * Validates aviation queries trigger the Aircraft widget with live ADS-B
 * data including callsigns, altitude, heading, and origin/destination.
 */

import { test, expect } from "@playwright/test"
import { AIRCRAFT_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  expectWidgetFirst,
  expectSecondaryWidgets,
  SEL,
} from "./helpers/widget-test-utils"

test.describe("Aircraft Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of AIRCRAFT_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of AIRCRAFT_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = AIRCRAFT_SCENARIOS.filter((s) =>
      [73, 74, 75].includes(s.id),
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
    test("flights over Pacific shows crep widget at large size", async ({
      page,
    }) => {
      await searchAndWait(page, "flights over Pacific")
      await expectWidgetExpanded(page, "crep")
      await expectWidgetFirst(page, "crep")
      await expectWidgetHasData(page, "crep")
    })

    test("aircraft near LA shows location-filtered flights", async ({
      page,
    }) => {
      await searchAndWait(page, "aircraft near Los Angeles")
      await expectWidgetExpanded(page, "crep")
      await expectWidgetHasData(page, "crep")
    })

    test("aircraft query shows earth secondary widgets", async ({ page }) => {
      await searchAndWait(page, "planes over San Francisco")
      await expectWidgetExpanded(page, "crep")
      await expectSecondaryWidgets(page, ["earth", "events", "weather"])
    })
  })
})
