import { test } from "@playwright/test"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

test("genetics widget shows sequence-backed rows", async ({ page }) => {
  test.slow()
  await assertWidgetRendersRealData(page, "genetics", "BRCA1")
})
