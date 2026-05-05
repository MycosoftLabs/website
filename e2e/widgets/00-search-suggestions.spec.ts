import { test } from "@playwright/test"
import { shouldSkipCameraWidgetE2e } from "./helpers/camera-unified-probe"
import { shouldSkipDevicesWidgetE2e } from "./helpers/devices-unified-probe"
import { shouldSkipWeatherWidgetE2e } from "./helpers/weather-unified-probe"
import { assertWidgetRendersRealData, SEARCH_SUGGESTION_MATRIX } from "./helpers/widget-test-utils"

/** One unified-search at a time avoids Next dev server queueing 7 heavy POSTs and hitting 6m timeouts */
test.describe.configure({ mode: "serial" })

/** Cameras need MINDEX `eagle_video` (auth) and/or outbound HTTPS to a public Overpass mirror — both are often absent in CI or locked-down LANs. */
let skipCamerasMatrix = false
let skipDevicesMatrix = false
let skipWeatherMatrix = false

test.beforeAll(async () => {
  skipCamerasMatrix = await shouldSkipCameraWidgetE2e()
  skipDevicesMatrix = await shouldSkipDevicesWidgetE2e()
  skipWeatherMatrix = await shouldSkipWeatherWidgetE2e()
})

for (const row of SEARCH_SUGGESTION_MATRIX) {
  test(`matrix: ${row.widget} — ${row.query}`, async ({ page }) => {
    test.slow()
    if (row.widget === "cameras" && skipCamerasMatrix) {
      test.skip(
        true,
        "No camera rows from POST /api/search/unified (MINDEX eagle_video + OSM Overpass). Set MINDEX_INTERNAL_TOKEN and allow HTTPS to Overpass, or E2E_FORCE_CAMERA_MATRIX=1 to fail hard instead of skipping.",
      )
    }
    if (row.widget === "devices" && skipDevicesMatrix) {
      test.skip(
        true,
        "No device rows from POST /api/search/unified (MAS registry). E2E_FORCE_DEVICES_MATRIX=1 to fail hard.",
      )
    }
    if (row.widget === "weather" && skipWeatherMatrix) {
      test.skip(
        true,
        "No weather rows from POST /api/search/unified (outbound forecast API). E2E_FORCE_WEATHER_MATRIX=1 to fail hard.",
      )
    }
    await assertWidgetRendersRealData(page, row.widget, row.query)
  })
}
