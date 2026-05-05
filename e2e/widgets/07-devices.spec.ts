import { test } from "@playwright/test"
import { shouldSkipDevicesWidgetE2e } from "./helpers/devices-unified-probe"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

let skipDevicesMatrix = false

test.beforeAll(async () => {
  skipDevicesMatrix = await shouldSkipDevicesWidgetE2e()
})

test("devices widget shows registry-backed rows", async ({ page }) => {
  test.slow()
  if (skipDevicesMatrix) {
    test.skip(
      true,
      "No device rows from POST /api/search/unified (MAS device registry). Set E2E_FORCE_DEVICES_MATRIX=1 to fail hard, or run with reachable MAS + registered devices.",
    )
  }
  await assertWidgetRendersRealData(page, "devices", "iot devices network")
})
