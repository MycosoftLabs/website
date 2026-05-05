import { test } from "@playwright/test"
import { assertWidgetRendersRealData } from "./helpers/widget-test-utils"

test("news widget shows article rows", async ({ page }) => {
  test.slow()
  await assertWidgetRendersRealData(page, "news", "renewable energy news")
})
