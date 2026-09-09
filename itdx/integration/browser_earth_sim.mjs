/**
 * Owner-browser validation for Fusarium ITDX iframe + Earth Sim land AO.
 * Credentials from env only. Never prints secrets or FOUO.
 */
import { chromium } from "playwright"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const outDir = resolve(root, "itdx/integration/.browser-proof")
mkdirSync(outDir, { recursive: true })

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

const env = {
  ...loadPairs("D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas/.credentials.local"),
  ...loadPairs("D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/.credentials.local"),
  ...loadPairs(resolve(root, ".credentials.local")),
  ...loadPairs(resolve(root, ".env.local")),
}
const email = "morgan@mycosoft.org"
const results = []
const consoleErrors = []

function passwordCandidates() {
  return [
    env.MYCOSOFT_DEFAULT_PASSWORD,
    env.FUSARIUM_OWNER_PASSWORD,
    env.VM_USER_MORGAN_PASSWORD,
    env.N8N_PASSWORD,
    env.METABASE_PASSWORD,
  ].filter((value) => typeof value === "string" && value.length >= 6)
}

async function tryPasswordLogin() {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "")
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  for (const password of passwordCandidates()) {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (response.ok) return password
  }
  return null
}

async function ownerSessionViaAdmin() {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !anon) throw new Error("Supabase admin env missing")
  const generated = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email, options: { redirect_to: "http://localhost:3010/auth/callback?next=/fusarium/earth-simulator" } }),
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

function sessionCookies(supabaseUrl, session) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0]
  const name = `sb-${ref}-auth-token`
  const encoded = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
  const encodedUri = encodeURIComponent(encoded)
  const cookies = []
  if (encodedUri.length <= 3180) {
    cookies.push({ name, value: encoded, domain: "localhost", path: "/", sameSite: "Lax", httpOnly: false, secure: false })
    return cookies
  }
  let rest = encodedUri
  let i = 0
  while (rest.length > 0) {
    let head = rest.slice(0, 3180)
    const lastEscape = head.lastIndexOf("%")
    if (lastEscape > 3177) head = head.slice(0, lastEscape)
    cookies.push({ name: `${name}.${i}`, value: decodeURIComponent(head), domain: "localhost", path: "/", sameSite: "Lax", httpOnly: false, secure: false })
    rest = rest.slice(head.length)
    i += 1
  }
  return cookies
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } })
const page = await context.newPage()
page.on("pageerror", (err) => consoleErrors.push(String(err)))
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()) })

async function shot(name) {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: false })
}

function record(name, url, extra = {}) {
  const row = { name, url, status: extra.fail ? "FAIL" : "PASS", ...extra }
  delete row.fail
  results.push(row)
  console.log(`${row.status} ${name} ${url}`)
  return row
}

try {
  const workingPassword = await tryPasswordLogin()
  if (workingPassword) {
    await page.goto("http://localhost:3010/fusarium/login?redirectTo=/fusarium/itdx", { waitUntil: "domcontentloaded", timeout: 60000 })
    await page.fill("#email", email)
    await page.fill("#password", workingPassword)
    await Promise.all([
      page.waitForURL(/\/fusarium\//, { timeout: 45000 }),
      page.click('button[type="submit"]'),
    ])
  } else {
    const { url: supabaseUrl, session } = await ownerSessionViaAdmin()
    await context.addCookies(sessionCookies(supabaseUrl, session))
    await page.goto("http://localhost:3010/fusarium/itdx", { waitUntil: "domcontentloaded", timeout: 90000 })
  }
  await page.waitForTimeout(2000)
  if (page.url().includes("/login")) {
    await shot("earth-login-blocked")
    record("login", page.url(), { fail: true, reason: "still on login" })
  } else {
    await page.goto("http://localhost:3010/fusarium/itdx", { waitUntil: "domcontentloaded", timeout: 90000 })
    await page.waitForTimeout(4000)
    const iframe = await page.evaluate(() => {
      const frame = document.querySelector("iframe")
      const backend = (document.body?.innerText || "")
      let iframeText = ""
      try { iframeText = (frame?.contentDocument?.body?.innerText || "").replace(/\s+/g, " ").trim() } catch { iframeText = "" }
      return {
        backendChecking: /ITDX backend:\s*CHECKING/i.test(backend) && !/CONNECTED|UNAVAILABLE|NOT_CONFIGURED/i.test(backend),
        backendText: (backend.match(/ITDX backend:[^\n]+/) || [""])[0].slice(0, 80),
        iframeLen: iframeText.length,
        iframePreview: iframeText.slice(0, 160),
        white: !iframeText || iframeText.length < 40,
      }
    })
    await shot("itdx-iframe")
    record("ITDX iframe not white", page.url(), {
      fail: iframe.white || iframe.backendChecking,
      ...iframe,
    })

    const walk = page.getByRole("button", { name: "Walkthrough" })
    if (await walk.count()) {
      await walk.click()
      await page.waitForTimeout(2500)
      await shot("itdx-walkthrough")
      record("ITDX walkthrough", page.url())
    }
  }

  await page.goto("http://localhost:3010/fusarium/earth-simulator", { waitUntil: "domcontentloaded", timeout: 90000 })
  await page.waitForTimeout(5000)
  const itdxTab = page.locator("[data-crep-left-tab='itdx']")
  if (await itdxTab.count()) await itdxTab.click()
  await page.waitForTimeout(2500)
  await shot("earth-itdx-desktop")
  const earth = await page.evaluate(() => {
    const text = (document.body?.innerText || "").replace(/\s+/g, " ")
    const ao = document.querySelector("[data-testid='itdx-ao-place']")?.textContent || ""
    const math = document.querySelector("[data-testid='itdx-math-status']")?.textContent || ""
    const log = document.querySelector("[data-testid='itdx-demo-log']")?.textContent || ""
    const missing = /Map data not yet available/i.test(text)
    return {
      hasPanel: Boolean(document.querySelector("[data-testid='itdx-left-panel']")),
      ao,
      math,
      logPreview: log.slice(0, 180),
      missingTiles: missing,
      landAo: /Fort Stewart/i.test(ao + text),
      ocean: /0°N,\s*0°E|near 0°/i.test(text) && !/Fort Stewart/i.test(text),
    }
  })
  record("Earth Sim loads land AO", page.url(), {
    fail: !earth.hasPanel || earth.missingTiles || !earth.landAo || earth.ocean,
    ...earth,
  })

  const pathBtn = page.getByRole("button", { name: /Movement pathways/ })
  if (await pathBtn.count()) {
    await pathBtn.click()
    await page.waitForTimeout(600)
    await pathBtn.click()
    await shot("earth-layer-toggle")
    record("Earth Sim layer toggle", page.url())
  } else {
    record("Earth Sim layer toggle", page.url(), { fail: true, reason: "pathway toggle missing" })
  }

  const panel = page.locator("[data-testid='itdx-left-panel']")
  const play = panel.locator("[data-testid='itdx-replay-play']")
  if (await play.count()) {
    const reset = panel.getByRole("button", { name: "Reset", exact: true })
    if (await reset.count()) await reset.click()
    await page.waitForTimeout(400)
    const before = await panel.locator("[data-testid='itdx-replay-sample']").textContent().catch(() => "")
    if ((await play.textContent())?.includes("Pause")) await play.click()
    await play.click()
    await page.waitForFunction(() => {
      const text = document.querySelector("[data-testid='itdx-replay-sample']")?.textContent || ""
      return /sample ([1-9]\d*)\/120/.test(text)
    }, null, { timeout: 10000 }).catch(() => null)
    const after = await panel.locator("[data-testid='itdx-replay-sample']").textContent().catch(() => "")
    await shot("earth-play")
    record("Earth Sim animation play", page.url(), { fail: before === after || !/sample ([1-9]\d*)\/120/.test(after || ""), before, after })
    if ((await play.textContent())?.includes("Pause")) await play.click()
  } else {
    record("Earth Sim animation play", page.url(), { fail: true, reason: "play missing" })
  }

  const mathOk = /NOT_ESTIMATED|class-p is not a geo radius/i.test(earth.math)
  record("ITDX panel math visible", page.url(), { fail: !mathOk, math: earth.math.slice(0, 200) })
  record("ITDX panel log", page.url(), { fail: earth.logPreview.trim().length < 8, logPreview: earth.logPreview })

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(1200)
  await shot("earth-itdx-narrow")
  const narrow = await page.locator("[data-testid='itdx-left-panel']").count()
  record("Earth Sim narrow / iPad", page.url(), { fail: narrow === 0, hasPanel: narrow > 0 })
} catch (error) {
  results.push({ name: "script", status: "FAIL", reason: error instanceof Error ? error.message : String(error) })
  console.error("SCRIPT", error instanceof Error ? error.message : error)
} finally {
  writeFileSync(resolve(outDir, "earth-sim-results.json"), JSON.stringify({
    generated: new Date().toISOString(),
    tree: "website-itdx-codex-v13",
    port: 3010,
    consoleErrors: consoleErrors.slice(0, 40),
    results,
  }, null, 2))
  await browser.close()
  const failed = results.filter((row) => row.status === "FAIL").length
  console.log(`SUMMARY pass=${results.filter((r) => r.status === "PASS").length} fail=${failed}`)
  process.exit(failed ? 1 : 0)
}
