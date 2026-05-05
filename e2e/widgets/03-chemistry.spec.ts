import { test } from "@playwright/test"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

test("chemistry widget shows compound-backed rows", async ({ page }) => {
  test.slow()
  await assertWidgetRendersRealData(page, "chemistry", "caffeine")
})
