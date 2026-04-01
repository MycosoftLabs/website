/**
 * E2E Widget Tests — Category 6: Fauna — Insects & Reptiles (Scenarios 51-58)
 *
 * Validates insect, reptile, and amphibian queries trigger Species widget.
 */

import { test, expect } from "@playwright/test"
import { INSECTS_REPTILES_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Fauna — Insects & Reptiles Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of INSECTS_REPTILES_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of INSECTS_REPTILES_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = INSECTS_REPTILES_SCENARIOS.filter((s) =>
      [51, 54, 58].includes(s.id),
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
    test("monarch butterfly shows species images", async ({ page }) => {
      await searchAndWait(page, "monarch butterfly migration")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species", { hasImages: true })
    })

    test("venomous snake triggers toxicity context", async ({ page }) => {
      await searchAndWait(page, "snake venomous species")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("crocodile vs alligator comparison", async ({ page }) => {
      await searchAndWait(page, "crocodile vs alligator")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
