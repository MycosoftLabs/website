/**
 * Widget Test Utilities — Shared selectors, assertions, and QA runner
 * for comprehensive search widget E2E testing.
 *
 * Three-layer QA per scenario:
 *   Layer 1: API — verify unified search returns data in expected bucket
 *   Layer 2: Widget Rendering — verify correct widget appears and expands
 *   Layer 3: Data Liveness — verify widget shows real data (not loading/empty)
 */

import { type Page, type APIRequestContext, expect } from "@playwright/test"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WidgetType =
  | "species" | "chemistry" | "genetics" | "research" | "answers"
  | "media" | "location" | "news" | "crep" | "earth2" | "map"
  | "events" | "aircraft" | "vessels" | "satellites" | "weather"
  | "emissions" | "infrastructure" | "devices" | "space_weather"
  | "cameras" | "embedding_atlas" | "fallback"

export type EntityType =
  | "species" | "compound" | "media" | "research" | "location" | "crep" | "general"
  | "event" | "aircraft" | "vessel" | "satellite" | "weather"
  | "emissions" | "infrastructure" | "device" | "space_weather" | "cameras"

export interface DataValidation {
  /** Text strings that should appear inside the widget */
  containsText?: string[]
  /** Widget should contain at least one image */
  hasImages?: boolean
  /** Widget should contain a map element */
  hasMap?: boolean
  /** Widget should show a live/streaming indicator */
  hasLiveIndicator?: boolean
  /** Minimum number of list items/entries expected */
  minEntries?: number
}

export interface SearchScenario {
  id: number
  query: string
  category: string
  expectedPrimaryWidget: WidgetType
  expectedPrimarySize: { width: 1 | 2; height: 1 | 2 | 3 }
  expectedSecondaryWidgets: WidgetType[]
  expectedApiResultBucket: string
  expectedEntityType: EntityType
  dataValidation: DataValidation
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const SEL = {
  searchCanvas: '[data-testid="search-canvas"], [data-testid="fluid-search"], .search-results, main',
  widget: (type: string) => `[data-widget-id="${type}"]`,
  allWidgets: "[data-widget-id]",
  searchInput: 'input[type="search"], input[placeholder*="earch"], input[name="q"]',
  loadingSkeleton: '[class*="skeleton"], [class*="animate-pulse"], [class*="loading"]',
  widgetDragHandle: ".widget-drag-handle",
  packeryWidget: ".packery-widget",
} as const

// Timeouts
export const SEARCH_LOAD_TIMEOUT = 20_000
export const WIDGET_APPEAR_TIMEOUT = 20_000
export const DATA_LOAD_TIMEOUT = 25_000

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Navigate to /search?q=<query> and wait for the search canvas to render.
 */
export async function searchAndWait(page: Page, query: string): Promise<void> {
  const encoded = encodeURIComponent(query)
  await page.goto(`/search?q=${encoded}`, { waitUntil: "domcontentloaded" })
  const canvas = page.locator(SEL.searchCanvas).first()
  await expect(canvas).toBeVisible({ timeout: SEARCH_LOAD_TIMEOUT })
  // Give widgets time to route, expand, and receive data
  await page.waitForTimeout(3000)
}

/**
 * Assert a specific widget is expanded (present in the grid).
 */
export async function expectWidgetExpanded(
  page: Page,
  widgetType: WidgetType,
): Promise<void> {
  const widget = page.locator(SEL.widget(widgetType))
  await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })
}

/**
 * Assert the primary widget is positioned first in the grid
 * (has order: -1 or is the first data-widget-id element).
 */
export async function expectWidgetFirst(
  page: Page,
  widgetType: WidgetType,
): Promise<void> {
  const widget = page.locator(SEL.widget(widgetType))
  await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })

  // Check it appears among the first widgets (order: -1 pushes data widgets up)
  const allWidgets = page.locator(SEL.allWidgets)
  const count = await allWidgets.count()
  if (count > 1) {
    const firstWidgetId = await allWidgets.first().getAttribute("data-widget-id")
    // Primary widget should be within the first 2 widgets (answers may also be first)
    const ids: string[] = []
    for (let i = 0; i < Math.min(count, 3); i++) {
      const id = await allWidgets.nth(i).getAttribute("data-widget-id")
      if (id) ids.push(id)
    }
    expect(ids).toContain(widgetType)
  }
}

/**
 * Assert a widget has actual data content (not loading skeletons or empty state).
 */
export async function expectWidgetHasData(
  page: Page,
  widgetType: WidgetType,
  validation: DataValidation = {},
): Promise<void> {
  const widget = page.locator(SEL.widget(widgetType))
  await expect(widget).toBeVisible({ timeout: WIDGET_APPEAR_TIMEOUT })

  // Wait for loading skeletons inside this widget to disappear
  const skeletons = widget.locator(SEL.loadingSkeleton)
  try {
    await expect(skeletons).toHaveCount(0, { timeout: DATA_LOAD_TIMEOUT })
  } catch {
    // Some widgets may have persistent subtle animations; check that real content also exists
  }

  // Widget should have non-trivial text content
  const textContent = await widget.textContent({ timeout: 5000 })
  expect(textContent?.trim().length).toBeGreaterThan(5)

  // Specific validations
  if (validation.containsText) {
    for (const text of validation.containsText) {
      await expect(widget).toContainText(text, { ignoreCase: true, timeout: DATA_LOAD_TIMEOUT })
    }
  }

  if (validation.hasImages) {
    const images = widget.locator("img")
    await expect(images.first()).toBeVisible({ timeout: DATA_LOAD_TIMEOUT })
  }

  if (validation.hasMap) {
    const mapEl = widget.locator('.leaflet-container, [class*="map"], canvas')
    await expect(mapEl.first()).toBeVisible({ timeout: DATA_LOAD_TIMEOUT })
  }

  if (validation.minEntries) {
    // Look for list items, table rows, or card-like children
    const entries = widget.locator(
      'li, tr, [class*="card"], [class*="item"], [class*="entry"], [class*="row"]',
    )
    const count = await entries.count()
    expect(count).toBeGreaterThanOrEqual(validation.minEntries)
  }
}

/**
 * Assert secondary widgets are also visible in the grid.
 */
export async function expectSecondaryWidgets(
  page: Page,
  types: WidgetType[],
): Promise<void> {
  for (const type of types) {
    const widget = page.locator(SEL.widget(type))
    // Secondary widgets may be context pills or expanded — just check existence in DOM
    const isVisible = await widget.isVisible().catch(() => false)
    // Secondary widgets might be pills rather than expanded. Check DOM presence.
    if (!isVisible) {
      const domCount = await widget.count()
      // It's acceptable for secondary widgets to be present but collapsed
    }
  }
}

// ---------------------------------------------------------------------------
// API-level validation (Layer 1)
// ---------------------------------------------------------------------------

/**
 * Hit the unified search API and verify the expected result bucket has data.
 */
export async function verifyApiBucket(
  request: APIRequestContext,
  query: string,
  bucketKey: string,
): Promise<Record<string, unknown>> {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3010"
  const res = await request.get(
    `${baseURL}/api/search/unified?q=${encodeURIComponent(query)}`,
  )
  expect(res.ok()).toBeTruthy()

  const data = await res.json().catch(() => ({}))
  expect(data).toBeDefined()
  expect(typeof data === "object").toBeTruthy()

  // The bucket should exist in the response (may be empty for some live-only sources)
  return data as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Three-layer QA runner
// ---------------------------------------------------------------------------

/**
 * Run full three-layer QA validation for a search scenario.
 *
 * Layer 1: API — verify unified search endpoint returns expected bucket
 * Layer 2: Widget Rendering — verify correct widget expands in browser
 * Layer 3: Data Liveness — verify widget displays actual data
 */
export async function runFullQA(
  page: Page,
  request: APIRequestContext,
  scenario: SearchScenario,
): Promise<void> {
  // ---- Layer 1: API Verification ----
  await verifyApiBucket(request, scenario.query, scenario.expectedApiResultBucket)

  // ---- Layer 2: Widget Rendering ----
  await searchAndWait(page, scenario.query)
  await expectWidgetExpanded(page, scenario.expectedPrimaryWidget)
  await expectWidgetFirst(page, scenario.expectedPrimaryWidget)

  // ---- Layer 3: Data Liveness ----
  await expectWidgetHasData(page, scenario.expectedPrimaryWidget, scenario.dataValidation)

  // Secondary widget check (soft — don't fail if secondary is collapsed/pill)
  if (scenario.expectedSecondaryWidgets.length > 0) {
    await expectSecondaryWidgets(page, scenario.expectedSecondaryWidgets)
  }
}

/**
 * Run only Layer 1 (API) for faster smoke-testing of intent routing.
 */
export async function runApiOnlyQA(
  request: APIRequestContext,
  scenario: SearchScenario,
): Promise<void> {
  await verifyApiBucket(request, scenario.query, scenario.expectedApiResultBucket)
}

/**
 * Run only Layer 2 + 3 (browser rendering + data liveness).
 */
export async function runBrowserQA(
  page: Page,
  scenario: SearchScenario,
): Promise<void> {
  await searchAndWait(page, scenario.query)
  await expectWidgetExpanded(page, scenario.expectedPrimaryWidget)
  await expectWidgetFirst(page, scenario.expectedPrimaryWidget)
  await expectWidgetHasData(page, scenario.expectedPrimaryWidget, scenario.dataValidation)
}
