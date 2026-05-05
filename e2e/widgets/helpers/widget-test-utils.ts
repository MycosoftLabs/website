import { expect, type Page } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const ARTIFACTS_DIR = path.join(process.cwd(), "e2e/widgets/_artifacts")

/**
 * Navigate to /search, ensure the widget tile is open, then assert the empty-state
 * banner is not shown (real rows expected when MINDEX/MAS/connectors are reachable).
 */
export async function assertWidgetRendersRealData(
  page: Page,
  widgetType: string,
  query: string,
  options?: { timeout?: number },
): Promise<void> {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
  const timeout = options?.timeout ?? 90_000

  const streamWait = page.waitForResponse(
    (res) =>
      res.url().includes("/api/search/stream") &&
      res.request().method() === "GET" &&
      res.status() === 200,
    { timeout: Math.min(timeout, 60_000) },
  ).catch(() => null)

  await page.goto(`/search?q=${encodeURIComponent(query)}`, {
    waitUntil: "domcontentloaded",
    timeout: Math.min(timeout, 60_000),
  })
  await streamWait

  const widget = page.getByTestId(`widget-${widgetType}`)
  if ((await widget.count()) === 0) {
    const fab = page.getByTestId("fast-action-fab")
    const slot = page.getByTestId(`fast-action-${widgetType}`)
    const radialLayer = page.getByTestId("fast-action-radial-layer")
    /** Canvas + portal FAB mount after Suspense/stream; cold dev compile can exceed 20s (May 03 2026). */
    await fab.waitFor({ state: "attached", timeout: Math.min(90_000, timeout) })
    await expect(fab).toBeVisible({ timeout: Math.min(90_000, timeout) })
    await fab.scrollIntoViewIfNeeded()
    /** Only close when the layer is mounted — `title` alone can be stale after soft `/search` navigations. */
    if ((await radialLayer.count()) > 0) {
      await fab.click({ force: true })
      await expect(radialLayer).toHaveCount(0, { timeout: 10_000 }).catch(() => {})
      await expect(fab).toHaveAttribute("title", "Add widget", { timeout: 10_000 }).catch(() => {})
    }
    /** Title "Close" with no layer: desynced UI — one click resets to a known state before we open. */
    if (
      (await radialLayer.count()) === 0 &&
      (await fab.getAttribute("title")) === "Close widget picker"
    ) {
      await fab.click({ force: true })
      await expect(fab).toHaveAttribute("title", "Add widget", { timeout: 5_000 }).catch(() => {})
    }
    await fab.click({ force: true })
    /**
     * Single click + long attach wait: a quick second click races React and can toggle
     * open → closed before the radial mounts (May 03 2026). Slow dev chunk loads need headroom.
     */
    await expect(radialLayer.first()).toBeAttached({ timeout: 45_000 })
    /** Attached first — parent `overflow-hidden` historically clipped radial; slots existed but failed `toBeVisible`. */
    await slot.waitFor({ state: "attached", timeout: Math.min(90_000, timeout) })
    await slot.scrollIntoViewIfNeeded()
    await expect(slot).toBeVisible({ timeout: Math.min(45_000, timeout) })
    await slot.click({ force: true })
    await expect(widget.first()).toBeAttached({ timeout: Math.min(45_000, timeout) })
  }

  const tile = widget.first()
  await expect(tile).toBeVisible({ timeout })
  /** Magnetic grid lives in a scroll container — markers below the fold fail `toBeVisible` without this. */
  await tile.scrollIntoViewIfNeeded()

  /**
   * Do not assert `widget-empty-*` count === 0 before data settles: during loading the empty
   * banner is not mounted, so the assertion passes immediately while `widget-real-data` is
   * still absent — then `scrollIntoViewIfNeeded` on a zero-match locator hangs until test timeout.
   */
  const realDataMarkerByWidget: Partial<Record<string, string>> = {
    cameras: "widget-real-data",
  }
  const marker = realDataMarkerByWidget[widgetType]
  if (marker) {
    const markerLoc = widget.locator(`[data-testid="${marker}"]`).first()
    await expect(markerLoc).toBeVisible({ timeout })
    await markerLoc.scrollIntoViewIfNeeded().catch(() => {})
    await expect(widget.locator(`[data-testid="widget-empty-${widgetType}"]`)).toHaveCount(0, {
      timeout: Math.min(15_000, timeout),
    })
  } else {
    await expect(widget.locator(`[data-testid="widget-empty-${widgetType}"]`)).toHaveCount(0, { timeout })
  }

  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `${widgetType}-${slug || "q"}.png`),
    fullPage: true,
  })
}

export const SEARCH_SUGGESTION_MATRIX: Array<{ widget: string; query: string; note?: string }> = [
  { widget: "cameras", query: "traffic cameras Paris" },
  { widget: "species", query: "Amanita muscaria" },
  { widget: "chemistry", query: "caffeine molecular structure" },
  { widget: "genetics", query: "BRCA1 gene" },
  { widget: "news", query: "renewable energy news" },
  { widget: "weather", query: "weather in Tokyo" },
  { widget: "devices", query: "network devices status" },
]
