/**
 * E2E Widget Tests — Category 15: Media & Research (Scenarios 109-114)
 *
 * Validates media queries trigger Media widget (movies, documentaries, TV)
 * and research queries trigger Research widget (papers, journals, citations).
 */

import { test, expect } from "@playwright/test"
import { MEDIA_RESEARCH_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  expectSecondaryWidgets,
} from "./helpers/widget-test-utils"

test.describe("Media & Research Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of MEDIA_RESEARCH_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of MEDIA_RESEARCH_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = MEDIA_RESEARCH_SCENARIOS.filter((s) =>
      [109, 111, 113].includes(s.id),
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
    test("mushroom documentaries shows media widget", async ({ page }) => {
      await searchAndWait(page, "mushroom documentaries")
      await expectWidgetExpanded(page, "media")
      await expectWidgetHasData(page, "media")
    })

    test("fungi movie shows media results", async ({ page }) => {
      await searchAndWait(page, "fungi movie Fantastic Fungi")
      await expectWidgetExpanded(page, "media")
      await expectWidgetHasData(page, "media")
    })

    test("mycology research papers shows research widget", async ({
      page,
    }) => {
      await searchAndWait(page, "mycology research papers")
      await expectWidgetExpanded(page, "research")
      await expectWidgetHasData(page, "research")
    })

    test("research query shows news as secondary", async ({ page }) => {
      await searchAndWait(page, "psilocybin clinical trial results")
      await expectWidgetExpanded(page, "research")
      await expectSecondaryWidgets(page, ["news"])
    })

    test("peer-reviewed studies shows academic content", async ({ page }) => {
      await searchAndWait(page, "peer-reviewed mushroom studies")
      await expectWidgetExpanded(page, "research")
      await expectWidgetHasData(page, "research")
    })
  })
})
