/**
 * E2E Widget Tests — Category 2: Flora (Scenarios 13-24)
 *
 * Validates that plant-related search queries trigger the Species widget
 * with correct data from biodiversity APIs.
 */

import { test, expect } from "@playwright/test"
import { FLORA_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Flora Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of FLORA_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of FLORA_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = FLORA_SCENARIOS.filter((s) =>
      [13, 15, 20, 22].includes(s.id),
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
    test("sequoia tree shows plant taxonomy", async ({ page }) => {
      await searchAndWait(page, "sequoia tree")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species", { hasImages: true })
    })

    test("orchid species Japan includes location context", async ({ page }) => {
      await searchAndWait(page, "orchid species Japan")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("algae bloom toxic triggers toxicity filter", async ({ page }) => {
      await searchAndWait(page, "algae bloom toxic")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("pine tree resin compounds shows chemistry secondary", async ({
      page,
    }) => {
      await searchAndWait(page, "pine tree resin compounds")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
