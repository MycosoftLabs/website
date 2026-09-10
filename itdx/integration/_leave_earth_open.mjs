/** Headed owner session left on Earth Sim. Credentials from env only. */
import { chromium } from "playwright"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
function loadPairs(file) {
  const env = {}
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  } catch { /* optional */ }
  return env
}
const env = { ...loadPairs(resolve(root, ".env.local")) }
const email = "morgan@mycosoft.org"
const password = [
  env.MYCOSOFT_DEFAULT_PASSWORD,
  env.FUSARIUM_OWNER_PASSWORD,
].find((value) => typeof value === "string" && value.length >= 6)
if (!password) throw new Error("owner password env missing")

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } })
await page.goto("http://localhost:3010/fusarium/login?redirectTo=/fusarium/earth-simulator", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
})
await page.fill("#email", email)
await page.fill("#password", password)
await Promise.all([
  page.waitForURL(/\/fusarium\/earth-simulator/, { timeout: 45000 }),
  page.click('button[type="submit"]'),
])
const itdxTab = page.locator("[data-crep-left-tab='itdx']")
if (await itdxTab.count()) await itdxTab.click()
const play = page.locator("[data-testid='itdx-replay-play']")
if (await play.count()) await play.click()
console.log("LEFT_OPEN", page.url())
await new Promise(() => {})
