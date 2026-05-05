import { test } from "@playwright/test"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

test("species widget shows taxonomy-backed rows", async ({ page }) => {
  test.slow()
  await assertWidgetRendersRealData(page, "species", "Amanita muscaria")
})
