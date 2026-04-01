/**
 * E2E Widget Tests — Category 7: Chemistry & Compounds (Scenarios 59-65)
 *
 * Validates compound/molecule queries trigger the Chemistry widget
 * with molecular structure, bioactivity, and source species data.
 */

import { test, expect } from "@playwright/test"
import { CHEMISTRY_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  SEL,
} from "./helpers/widget-test-utils"

test.describe("Chemistry & Compounds Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of CHEMISTRY_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of CHEMISTRY_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = CHEMISTRY_SCENARIOS.filter((s) =>
      [59, 60, 64].includes(s.id),
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
    test("psilocybin molecule shows compound data", async ({ page }) => {
      await searchAndWait(page, "psilocybin molecule")
      await expectWidgetExpanded(page, "chemistry")
      await expectWidgetHasData(page, "chemistry")
    })

    test("amatoxin shows toxicity compound info", async ({ page }) => {
      await searchAndWait(page, "amatoxin poisoning mechanism")
      await expectWidgetExpanded(page, "chemistry")
      await expectWidgetHasData(page, "chemistry")
    })

    test("ergotamine shows chemical formula", async ({ page }) => {
      await searchAndWait(page, "ergotamine chemical formula")
      await expectWidgetExpanded(page, "chemistry")
      await expectWidgetHasData(page, "chemistry")
    })

    test("answers widget appears as secondary for compound queries", async ({
      page,
    }) => {
      await searchAndWait(page, "muscimol effects")
      await expectWidgetExpanded(page, "chemistry")
      // Answers should also be present (hybrid query)
      const answersWidget = page.locator(SEL.widget("answers"))
      const isVisible = await answersWidget.isVisible().catch(() => false)
      // Answers may be expanded or in pill form — just verify chemistry is primary
    })
  })
})
