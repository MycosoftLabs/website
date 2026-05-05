import { test } from "@playwright/test"
import { shouldSkipWeatherWidgetE2e } from "./helpers/weather-unified-probe"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

let skipWeatherMatrix = false

test.beforeAll(async () => {
  skipWeatherMatrix = await shouldSkipWeatherWidgetE2e()
})

test("weather widget shows forecast rows", async ({ page }) => {
  test.slow()
  if (skipWeatherMatrix) {
    test.skip(
      true,
      "No weather rows from POST /api/search/unified. E2E_FORCE_WEATHER_MATRIX=1 to fail hard, or fix outbound forecast API from dev server.",
    )
  }
  await assertWidgetRendersRealData(page, "weather", "weather in Tokyo")
})
