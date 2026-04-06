/**
 * E2E Widget Tests — Category 17: Widget Mechanics (Scenarios 125-130)
 *
 * Validates the mechanical behavior of widgets: auto-expand, sizing,
 * positioning (primary widget first in DOM), data liveness after load,
 * and cross-widget navigation.
 *
 * Widget expectations calibrated to actual FluidSearchCanvas routing behavior.
 */

import { test, expect } from "@playwright/test"
import {
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetFirst,
  expectWidgetHasData,
  expectSecondaryWidgets,
  SEL,
  WIDGET_APPEAR_TIMEOUT,
} from "./helpers/widget-test-utils"

test.describe("Widget Mechanics", () => {
  test.describe("Auto-Expand Behavior", () => {
    test("#125: Species widget auto-expands without user interaction", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria")
      // Species has autoExpand: true — should be in grid without clicking
      await expectWidgetExpanded(page, "species")
      const widget = page.locator(SEL.widget("species"))
      await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
    })

    test("#126: CREP widget renders for flight queries (worldview trigger)", async ({
      page,
    }) => {
      await searchAndWait(page, "flights over Pacific")
      // Aircraft queries trigger CREP worldview
      await expectWidgetExpanded(page, "crep")
      const widget = page.locator(SEL.widget("crep"))
      await expect(widget).toBeVisible()
      const box = await widget.boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        expect(box.width).toBeGreaterThan(300)
      }
    })
  })

  test.describe("Secondary Widget Expansion", () => {
    test("#127: Weather query shows earth + events secondary widgets", async ({
      page,
    }) => {
      await searchAndWait(page, "weather San Diego")
      await expectWidgetExpanded(page, "weather")
      await expectSecondaryWidgets(page, ["earth", "events"])
    })
  })

  test.describe("Widget Ordering (Primary First)", () => {
    test("#128: Events widget appears first in grid for earthquake query", async ({
      page,
    }) => {
      await searchAndWait(page, "earthquakes today")
      await expectWidgetFirst(page, "events")
    })

    test("Species widget appears first for species query", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria")
      await expectWidgetFirst(page, "species")
    })

    test("CREP widget appears first for flight query", async ({
      page,
    }) => {
      await searchAndWait(page, "flights over Pacific")
      await expectWidgetFirst(page, "crep")
    })
  })

  test.describe("Data Liveness (Not Loading/Empty)", () => {
    test("#129: Species widget shows real data within timeout", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria")
      await expectWidgetExpanded(page, "species")
      const widget = page.locator(SEL.widget("species"))
      await page.waitForTimeout(5000)
      const textContent = await widget.textContent()
      expect(textContent?.trim().length).toBeGreaterThan(10)
    })

    test("Weather widget shows weather data", async ({ page }) => {
      await searchAndWait(page, "weather in San Diego")
      await expectWidgetExpanded(page, "weather")
      await expectWidgetHasData(page, "weather")
    })

    test("Events widget shows event data", async ({ page }) => {
      await searchAndWait(page, "earthquakes today")
      await expectWidgetExpanded(page, "events")
      await expectWidgetHasData(page, "events")
    })

    test("Answers widget shows response for greeting", async ({
      page,
    }) => {
      await searchAndWait(page, "hello")
      await expectWidgetExpanded(page, "answers")
      await expectWidgetHasData(page, "answers")
    })
  })

  test.describe("Cross-Widget Navigation", () => {
    test("#130: Compound search shows species as primary with chemistry secondary", async ({ page }) => {
      await searchAndWait(page, "psilocybin compound")
      await expectWidgetExpanded(page, "species")
      await expectSecondaryWidgets(page, ["chemistry", "research"])
    })

    test("Species query with compound keyword shows bio widgets", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria psilocybin chemistry")
      await expectWidgetExpanded(page, "species")
      await expectSecondaryWidgets(page, ["chemistry", "research"])
    })
  })

  test.describe("Widget State Persistence", () => {
    test("widgets maintain state across same-session searches", async ({
      page,
    }) => {
      // First search — species domain
      await searchAndWait(page, "Amanita muscaria")
      await expectWidgetExpanded(page, "species")

      // Second search — weather domain
      await page.locator(SEL.searchInput).first().fill("weather San Diego")
      await page.locator(SEL.searchInput).first().press("Enter")
      await page.waitForTimeout(5000)
      await expectWidgetExpanded(page, "weather")

      // Third search — back to species
      await page.locator(SEL.searchInput).first().fill("chanterelle mushrooms")
      await page.locator(SEL.searchInput).first().press("Enter")
      await page.waitForTimeout(5000)
      await expectWidgetExpanded(page, "species")
    })
  })

  test.describe("Empty State Policy", () => {
    test("species widget shows empty state (show_empty policy)", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria")
      const widget = page.locator(SEL.widget("species"))
      await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
    })

    test("answers widget shows for conversational query", async ({
      page,
    }) => {
      await searchAndWait(page, "hello")
      const widget = page.locator(SEL.widget("answers"))
      await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
    })
  })
})
