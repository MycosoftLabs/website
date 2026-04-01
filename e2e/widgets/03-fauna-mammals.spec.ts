/**
 * E2E Widget Tests — Category 3: Fauna — Mammals (Scenarios 25-34)
 *
 * Validates mammal search queries trigger Species widget with correct
 * taxonomy, photos, and observation data.
 */

import { test, expect } from "@playwright/test"
import { MAMMALS_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Fauna — Mammals Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of MAMMALS_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of MAMMALS_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = MAMMALS_SCENARIOS.filter((s) =>
      [25, 26, 30, 34].includes(s.id),
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
    test("gray wolf shows species data", async ({ page }) => {
      await searchAndWait(page, "gray wolf")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species", { hasImages: true })
    })

    test("whale migration shows species data", async ({ page }) => {
      await searchAndWait(page, "whale migration patterns")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("seal vs sea lion comparison shows data", async ({ page }) => {
      await searchAndWait(page, "seal vs sea lion")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
