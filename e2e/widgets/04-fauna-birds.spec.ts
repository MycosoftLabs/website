/**
 * E2E Widget Tests — Category 4: Fauna — Birds (Scenarios 35-42)
 *
 * Validates bird search queries trigger Species widget with eBird/GBIF data.
 */

import { test, expect } from "@playwright/test"
import { BIRDS_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Fauna — Birds Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of BIRDS_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of BIRDS_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = BIRDS_SCENARIOS.filter((s) =>
      [35, 37, 42].includes(s.id),
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
    test("bald eagle shows species images", async ({ page }) => {
      await searchAndWait(page, "bald eagle")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species", { hasImages: true })
    })

    test("raven vs crow triggers comparison", async ({ page }) => {
      await searchAndWait(page, "raven vs crow difference")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
