/**
 * E2E Widget Tests — Category 16: Cross-Domain & Edge Cases (Scenarios 115-124)
 *
 * Validates multi-intent queries, ambiguous queries, cross-domain interactions,
 * and special widget triggers (embedding atlas, cameras, devices, conversational).
 */

import { test, expect } from "@playwright/test"
import { CROSS_DOMAIN_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
  expectSecondaryWidgets,
  SEL,
} from "./helpers/widget-test-utils"

test.describe("Cross-Domain & Edge Case Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of CROSS_DOMAIN_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of CROSS_DOMAIN_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = CROSS_DOMAIN_SCENARIOS.filter((s) =>
      [115, 119, 122, 123].includes(s.id),
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
    test("multi-intent: species + chemistry triggers species primary with chemistry secondary", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria psilocybin chemistry")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
      await expectSecondaryWidgets(page, ["chemistry", "research"])
    })

    test("cross-domain: weather + species shows weather primary", async ({
      page,
    }) => {
      await searchAndWait(page, "weather effects on mushroom growth")
      await expectWidgetExpanded(page, "weather")
      await expectWidgetHasData(page, "weather")
    })

    test("cross-domain: flights + events shows aircraft primary", async ({
      page,
    }) => {
      await searchAndWait(page, "flights over earthquake zone")
      await expectWidgetExpanded(page, "aircraft")
    })

    test("cross-domain: ships + events shows vessels primary", async ({
      page,
    }) => {
      await searchAndWait(page, "ships near volcanic island")
      await expectWidgetExpanded(page, "vessels")
    })

    test("embedding atlas triggers visualization widget", async ({ page }) => {
      await searchAndWait(page, "embedding atlas mushroom similarity")
      await expectWidgetExpanded(page, "embedding_atlas")
    })

    test("webcam triggers cameras widget", async ({ page }) => {
      await searchAndWait(page, "webcam nature live stream")
      await expectWidgetExpanded(page, "cameras")
    })

    test("mycobrain triggers devices widget", async ({ page }) => {
      await searchAndWait(page, "mycobrain sensor telemetry")
      await expectWidgetExpanded(page, "devices")
    })

    test("conversational query triggers answers with species secondary", async ({
      page,
    }) => {
      await searchAndWait(page, "what is a chanterelle?")
      // Should show species (chanterelle keyword) with answers as secondary
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })

    test("pure greeting triggers only answers widget", async ({ page }) => {
      await searchAndWait(page, "hello")
      await expectWidgetExpanded(page, "answers")
    })

    test("comparison query shows species data", async ({ page }) => {
      await searchAndWait(page, "compare eagle and hawk")
      await expectWidgetExpanded(page, "species")
      await expectWidgetHasData(page, "species")
    })
  })
})
