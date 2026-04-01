/**
 * E2E Widget Tests — Category 13: Emissions & Infrastructure (Scenarios 97-102)
 *
 * Validates air quality/emissions queries trigger Emissions widget (OpenAQ, Carbon Mapper)
 * and infrastructure queries trigger Infrastructure widget.
 */

import { test, expect } from "@playwright/test"
import { EMISSIONS_INFRA_SCENARIOS } from "./helpers/search-scenarios"
import {
  runFullQA,
  runBrowserQA,
  runApiOnlyQA,
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetHasData,
} from "./helpers/widget-test-utils"

test.describe("Emissions & Infrastructure Search Widgets", () => {
  test.describe("API Layer — Intent Routing", () => {
    for (const scenario of EMISSIONS_INFRA_SCENARIOS) {
      test(`API #${scenario.id}: "${scenario.query}" → ${scenario.expectedApiResultBucket}`, async ({
        request,
      }) => {
        await runApiOnlyQA(request, scenario)
      })
    }
  })

  test.describe("Browser Layer — Widget Rendering & Data", () => {
    for (const scenario of EMISSIONS_INFRA_SCENARIOS) {
      test(`Widget #${scenario.id}: "${scenario.query}" → ${scenario.expectedPrimaryWidget}`, async ({
        page,
      }) => {
        await runBrowserQA(page, scenario)
      })
    }
  })

  test.describe("Full QA — Three-Layer Validation", () => {
    const criticalScenarios = EMISSIONS_INFRA_SCENARIOS.filter((s) =>
      [97, 99, 100].includes(s.id),
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
    test("air quality San Diego shows AQI data", async ({ page }) => {
      await searchAndWait(page, "air quality San Diego")
      await expectWidgetExpanded(page, "emissions")
      await expectWidgetHasData(page, "emissions")
    })

    test("methane plume shows Carbon Mapper data", async ({ page }) => {
      await searchAndWait(page, "methane plume detection")
      await expectWidgetExpanded(page, "emissions")
      await expectWidgetHasData(page, "emissions")
    })

    test("power plant locations shows infrastructure data", async ({
      page,
    }) => {
      await searchAndWait(page, "power plant locations")
      await expectWidgetExpanded(page, "infrastructure")
      await expectWidgetHasData(page, "infrastructure")
    })

    test("wind farm solar farm shows facility data", async ({ page }) => {
      await searchAndWait(page, "wind farm solar farm")
      await expectWidgetExpanded(page, "infrastructure")
      await expectWidgetHasData(page, "infrastructure")
    })
  })
})
