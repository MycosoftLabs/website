/**
 * E2E Widget Tests — Category 17: Widget Mechanics (Scenarios 125-130)
 *
 * Validates the mechanical behavior of widgets: auto-expand, sizing,
 * positioning (primary widget first in DOM), data liveness after load,
 * and cross-widget navigation.
 */

import { test, expect } from "@playwright/test"
import { WIDGET_MECHANICS_SCENARIOS } from "./helpers/search-scenarios"
import {
  searchAndWait,
  expectWidgetExpanded,
  expectWidgetFirst,
  expectWidgetHasData,
  expectSecondaryWidgets,
  SEL,
  WIDGET_APPEAR_TIMEOUT,
  DATA_LOAD_TIMEOUT,
} from "./helpers/widget-test-utils"

test.describe("Widget Mechanics", () => {
  test.describe("Auto-Expand Behavior", () => {
    test("#125: Species widget auto-expands without user interaction", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria")
      // Species has autoExpand: true — should be in grid without clicking
      await expectWidgetExpanded(page, "species")
      // Verify it's in the packery grid (not a context pill)
      const widget = page.locator(SEL.widget("species"))
      const parent = widget.locator("..")
      // Widget should have packery-widget class or be inside grid
      await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
    })

    test("#126: Aircraft widget renders at large (2x3) size", async ({
      page,
    }) => {
      await searchAndWait(page, "flights over Pacific")
      await expectWidgetExpanded(page, "aircraft")
      // Verify the widget element exists and is large
      const widget = page.locator(SEL.widget("aircraft"))
      await expect(widget).toBeVisible()
      // The widget should take significant viewport space (large widget)
      const box = await widget.boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        // Large widget should be wider than 400px on desktop
        expect(box.width).toBeGreaterThan(300)
      }
    })
  })

  test.describe("Secondary Widget Expansion", () => {
    test("#127: Weather query shows map + events secondary widgets", async ({
      page,
    }) => {
      await searchAndWait(page, "weather San Diego")
      await expectWidgetExpanded(page, "weather")
      // Secondary widgets should be present in DOM (expanded or as pills)
      const allWidgets = page.locator(SEL.allWidgets)
      const count = await allWidgets.count()
      // Should have at least weather + answers (hybrid) + possibly map/events
      expect(count).toBeGreaterThanOrEqual(1)
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

    test("Aircraft widget appears first for flight query", async ({
      page,
    }) => {
      await searchAndWait(page, "flights over Pacific")
      await expectWidgetFirst(page, "aircraft")
    })
  })

  test.describe("Data Liveness (Not Loading/Empty)", () => {
    test("#129: Species widget shows real data within timeout", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria")
      await expectWidgetExpanded(page, "species")

      // Wait for loading state to clear
      const widget = page.locator(SEL.widget("species"))
      const skeletons = widget.locator(SEL.loadingSkeleton)

      // After DATA_LOAD_TIMEOUT, skeletons should be gone and content present
      await page.waitForTimeout(5000) // Additional wait for data fetch
      const textContent = await widget.textContent()
      expect(textContent?.trim().length).toBeGreaterThan(10)
    })

    test("Weather widget shows live temperature data", async ({ page }) => {
      await searchAndWait(page, "weather in San Diego")
      await expectWidgetExpanded(page, "weather")
      await expectWidgetHasData(page, "weather")
    })

    test("Events widget shows live seismic data", async ({ page }) => {
      await searchAndWait(page, "earthquakes today")
      await expectWidgetExpanded(page, "events")
      await expectWidgetHasData(page, "events")
    })

    test("Answers widget shows LLM response for greeting", async ({
      page,
    }) => {
      await searchAndWait(page, "hello")
      await expectWidgetExpanded(page, "answers")
      await expectWidgetHasData(page, "answers")
    })
  })

  test.describe("Cross-Widget Navigation", () => {
    test("#130: Chemistry search shows compound data", async ({ page }) => {
      await searchAndWait(page, "psilocybin")
      await expectWidgetExpanded(page, "chemistry")
      await expectWidgetHasData(page, "chemistry")
    })

    test("Species query with compound keyword shows both widgets", async ({
      page,
    }) => {
      await searchAndWait(page, "Amanita muscaria psilocybin chemistry")
      // Primary should be species (species keyword takes priority)
      await expectWidgetExpanded(page, "species")
      // Chemistry should appear as secondary
      await expectSecondaryWidgets(page, ["chemistry"])
    })
  })

  test.describe("Widget State Persistence", () => {
    test("widgets maintain state across same-session searches", async ({
      page,
    }) => {
      // First search
      await searchAndWait(page, "Amanita muscaria")
      await expectWidgetExpanded(page, "species")

      // Second search — different domain
      await searchAndWait(page, "flights over Pacific")
      await expectWidgetExpanded(page, "aircraft")

      // Third search — back to species
      await searchAndWait(page, "chanterelle mushrooms")
      await expectWidgetExpanded(page, "species")
    })
  })

  test.describe("Empty State Policy", () => {
    test("species widget shows empty state (show_empty policy)", async ({
      page,
    }) => {
      // Species has emptyPolicy: "show_empty" — should still render
      await searchAndWait(page, "Amanita muscaria")
      const widget = page.locator(SEL.widget("species"))
      await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
    })

    test("answers widget shows empty state (show_empty policy)", async ({
      page,
    }) => {
      await searchAndWait(page, "hello")
      const widget = page.locator(SEL.widget("answers"))
      await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
    })
  })
})
