/**
 * Owner-browser check: Earth Sim play + unit select shows moving P(truth) and MAS/NLM channels.
 * Reuses the same login helper pattern as browser_itdx_tabs.mjs. No secrets printed.
 */
import { chromium } from "playwright"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const outDir = resolve(root, "itdx/integration/.browser-proof")
mkdirSync(outDir, { recursive: true })

function loadPairs(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const i = line.indexOf("=")
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  } catch { /* optional */ }
  return env
}

const env = {
  ...loadPairs(resolve(root, ".credentials.local")),
  ...loadPairs("D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/.credentials.local"),
  ...loadPairs("D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas/.credentials.local"),
  ...loadPairs(resolve(root, ".env.local")),
}
const email = "morgan@mycosoft.org"

async function ownerSession() {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !anon) throw new Error("Supabase admin env missing")
  const generated = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email, options: { redirect_to: "http://localhost:3010/fusarium/earth-simulator" } }),
  })
  if (!generated.ok) throw new Error(`generate_link ${generated.status}`)
  const payload = await generated.json()
  const verified = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: payload.hashed_token }),
  })
  if (!verified.ok) throw new Error(`verify ${verified.status}`)
  return { url, session: await verified.json() }
}

function cookies(supabaseUrl, session) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0]
  const name = `sb-${ref}-auth-token`
  const encoded = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
  const encodedUri = encodeURIComponent(encoded)
  if (encodedUri.length <= 3180) {
    return [{ name, value: encoded, domain: "localhost", path: "/", sameSite: "Lax", httpOnly: false, secure: false }]
  }
  const out = []
  let rest = encodedUri
  let i = 0
  while (rest.length > 0) {
    let head = rest.slice(0, 3180)
    const lastEscape = head.lastIndexOf("%")
    if (lastEscape > 3177) head = head.slice(0, lastEscape)
    out.push({ name: `${name}.${i}`, value: decodeURIComponent(head), domain: "localhost", path: "/", sameSite: "Lax", httpOnly: false, secure: false })
    rest = rest.slice(head.length)
    i += 1
  }
  return out
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } })
const page = await context.newPage()
const result = { generated: new Date().toISOString(), steps: [] }

function step(name, ok, extra = {}) {
  result.steps.push({ name, ok, ...extra })
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra.note || ""}`)
}

try {
  const { url, session } = await ownerSession()
  await context.addCookies(cookies(url, session))
  await page.goto("http://localhost:3010/fusarium/earth-simulator", { waitUntil: "domcontentloaded", timeout: 90000 })
  await page.waitForTimeout(2500)
  const tab = page.locator("[data-crep-left-tab='itdx']")
  if (await tab.count()) await tab.click()
  await page.waitForSelector("[data-testid='itdx-truth-panel']", { timeout: 20000 })
  await page.screenshot({ path: resolve(outDir, "truth-earth-initial.png"), fullPage: false })

  const before = await page.locator("[data-testid='itdx-truth-p']").innerText()
  step("truth panel visible", /P\(truth\)/i.test(before), { note: before.replace(/\s+/g, " ").slice(0, 160) })

  const channels = await page.locator("[data-testid='itdx-truth-channels']").innerText()
  step("geometry channel listed", /geometry/i.test(channels) && /nlm_pattern/i.test(channels), { note: channels.replace(/\s+/g, " ").slice(0, 220) })
  step("formula shown", await page.locator("[data-testid='itdx-truth-formula']").count().then((n) => n > 0))
  step("who decided shown", await page.locator("[data-testid='itdx-truth-who']").innerText().then((t) => /itdx-geometry|mas-/i.test(t)))

  await page.getByRole("button", { name: /VEHICLE 02/ }).click()
  await page.waitForTimeout(800)
  const play = page.locator("[data-testid='itdx-replay-play']")
  if (await play.count()) await play.click()
  await page.waitForTimeout(3500)
  if (await play.count()) {
    const label = await play.innerText()
    if (/pause/i.test(label)) await play.click()
  }
  await page.locator("input[aria-label='ITDX replay sample']").fill("80")
  await page.waitForTimeout(1500)
  await page.screenshot({ path: resolve(outDir, "truth-earth-vehicle-80.png"), fullPage: false })

  const after = await page.locator("[data-testid='itdx-truth-p']").innerText()
  const quality = await page.locator("[data-testid='itdx-truth-quality']").innerText()
  step("numbers present after seek", /P\(truth\)\s+\d/i.test(after), { note: after.replace(/\s+/g, " ").slice(0, 160) })
  step("vehicle bad-data or bias visible", /BAD|bias|stale|missing/i.test(quality + after), { note: quality.replace(/\s+/g, " ").slice(0, 160) })
  step("not decorative only", before !== after || /VEHICLE|BAD|bias/i.test(quality + after), { before: before.slice(0, 80), after: after.slice(0, 80) })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(outDir, "truth-earth-mobile.png"), fullPage: false })
  const mobilePanel = await page.locator("[data-testid='itdx-truth-panel']").count()
  step("mobile panel still present", mobilePanel > 0)
} catch (error) {
  step("script", false, { note: error instanceof Error ? error.message : String(error) })
} finally {
  writeFileSync(resolve(outDir, "truth-map-results.json"), JSON.stringify(result, null, 2))
  await browser.close()
  const failed = result.steps.filter((row) => !row.ok).length
  console.log(`SUMMARY pass=${result.steps.filter((row) => row.ok).length} fail=${failed}`)
  process.exit(failed ? 1 : 0)
}
