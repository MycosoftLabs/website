import { test } from "@playwright/test"
import { shouldSkipCameraWidgetE2e } from "./helpers/camera-unified-probe"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

test("cameras widget shows live or cached camera rows", async ({ page }) => {
  test.slow()
  if (await shouldSkipCameraWidgetE2e()) {
    test.skip(
      true,
      "No camera rows from POST /api/search/unified (MINDEX eagle_video + OSM Overpass). Set MINDEX_INTERNAL_TOKEN and allow HTTPS to Overpass, or E2E_FORCE_CAMERA_MATRIX=1 to fail hard instead of skipping.",
    )
  }
  await assertWidgetRendersRealData(page, "cameras", "traffic cameras Paris")
})
