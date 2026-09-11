import { chromium } from "playwright"

const url = "http://127.0.0.1:3010/fusarium/earth-simulator"

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.setDefaultTimeout(120_000)
try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 })
  await page.waitForSelector('[data-testid="earth-sim-live-data"]', { timeout: 120_000 })
  const chip = page.locator('[data-testid="earth-sim-live-data-filters"]').getByText(/2 m Temperature/i).first()
  await chip.click()
  await page.waitForTimeout(5000)
  const onState = await page.evaluate(() => {
    const map = window.__crep_map
    const style = map?.getStyle?.()
    const layers = (style?.layers || []).map((l) => l.id).filter((id) => String(id).startsWith("crep-field-era5-t2m"))
    return {
      hasMap: Boolean(map),
      layers,
      probe: window.__crep_field_probe || null,
      live: window.__crep_live_data || null,
    }
  })
  await chip.click()
  await page.waitForTimeout(2500)
  const offState = await page.evaluate(() => {
    const map = window.__crep_map
    const style = map?.getStyle?.()
    const layers = (style?.layers || []).map((l) => l.id).filter((id) => String(id).startsWith("crep-field-era5-t2m"))
    return { layers, probe: window.__crep_field_probe || null }
  })
  const report = { on: onState, off: offState }
  console.log(JSON.stringify(report, null, 2))
  if (!onState.layers.length && !(onState.probe && onState.probe.frameCount > 0)) {
    throw new Error("ON did not bind ERA5 t2m raster")
  }
  if (offState.layers.length) {
    throw new Error("OFF left ERA5 t2m layers on the map")
  }
} finally {
  await browser.close()
}
