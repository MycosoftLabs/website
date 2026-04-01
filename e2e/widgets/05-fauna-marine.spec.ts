/**
 * E2E Widget Tests — Category 5: Fauna — Marine (Scenarios 43-50)
 *
 * Validates marine life queries trigger Species widget with OBIS/GBIF data.
 */

import { test, expect } from "@playwright/test"
import { MARINE_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Fauna — Marine Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of MARINE_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of MARINE_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = MARINE_SCENARIOS.filter((s) =>
      [43, 44, 47].includes(s.id),
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
    test("great white shark shows species data", async ({ page }) => {
      await searchAndWait(page, "great white shark")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species", { hasImages: true })
    })

    test("coral reef biodiversity shows observations", async ({ page }) => {
      await searchAndWait(page, "coral reef biodiversity")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
