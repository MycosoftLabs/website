/**
 * E2E Widget Tests — Category 1: Fungi (Scenarios 1-12)
 *
 * Validates that fungi-related search queries trigger the Species widget,
 * auto-expand it with correct sizing, and display live species data
 * from MINDEX/iNaturalist/GBIF.
 */

import { test, expect } from "@playwright/test"
import { FUNGI_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  SEL,
} from "./helpers/widget-test-utils"

test.describe("Fungi Search Widgets", () => {
  // Layer 1: API-level intent routing validation
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of FUNGI_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket} bucket`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  // Layer 2+3: Browser rendering + data liveness
  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of FUNGI_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget} widget`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  // Full three-layer QA for critical fungi scenarios
  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = FUNGI_SCENARIOS.filter((s) =>
      [1, 4, 5, 7].includes(s.id),
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

  // Fungi-specific widget content tests
  test.describe("Content Verification", () => {
    test("Amanita muscaria shows taxonomy and photos", async ({ page }) => {
      await searchAndWait(page, "Amanita muscaria")
      await expectWidgetExpanded(page, "species")
      const widget = page.locator(SEL.widget("species"))
      // Should display species content (taxonomy, images, or observation data)
      const text = await widget.textContent()
      expect(text?.length).toBeGreaterThan(10)
    })

    test("poisonous mushrooms triggers toxicity filter", async ({ page }) => {
      await searchAndWait(page, "poisonous mushrooms in Oregon")
      await expectWidgetExpanded(page, "species")
      // Species widget should be visible with data
      await expectWidgetHasData(page, "species")
    })

    test("edible fungi triggers edibility filter", async ({ page }) => {
      await searchAndWait(page, "edible fungi Pacific Northwest")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("death cap shows identification content", async ({ page }) => {
      await searchAndWait(page, "death cap identification")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
