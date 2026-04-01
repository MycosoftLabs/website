/**
 * E2E Widget Tests — Category 10: Vessels & Maritime (Scenarios 79-84)
 *
 * Validates maritime queries trigger the Vessels widget with live AIS
 * tracking data including ship type, heading, destination, MMSI, speed.
 */

import { test, expect } from "@playwright/test"
import { VESSELS_SCENARIOS } from "./helpers/search-scenarios"
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

test.describe("Vessels & Maritime Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of VESSELS_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of VESSELS_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = VESSELS_SCENARIOS.filter((s) =>
      [79, 80, 82].includes(s.id),
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
    test("ships in Pacific shows vessel tracking data", async ({ page }) => {
      await searchAndWait(page, "ships in Pacific")
      await expectWidgetExpanded(page, "vessels")
      await expectWidgetFirst(page, "vessels")
      await expectWidgetHasData(page, "vessels")
    })

    test("cargo vessels shows vessel type data", async ({ page }) => {
      await searchAndWait(page, "cargo vessels near port")
      await expectWidgetExpanded(page, "vessels")
      await expectWidgetHasData(page, "vessels")
    })

    test("maritime query shows earth secondary widgets", async ({ page }) => {
      await searchAndWait(page, "maritime traffic San Diego")
      await expectWidgetExpanded(page, "vessels")
      await expectSecondaryWidgets(page, ["map", "weather", "events"])
    })
  })
})
