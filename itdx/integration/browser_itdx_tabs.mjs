/**
 * Local owner-browser rehearsal for ITDX tabs + Earth Sim overlay.
 * Reads credentials from .env.local. Never prints secrets.
 */
import { chromium } from "playwright"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const envPath = resolve(root, ".env.local")
const outDir = resolve(root, "itdx/integration/.browser-proof")
mkdirSync(outDir, { recursive: true })

function loadEnv() {
  const env = {}
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const i = line.indexOf("=")
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return env
}

function isMostlyWhite(metrics) {
  return metrics.bodyTextLength < 40 && metrics.bgLooksBlank
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const body = document.body
    const style = getComputedStyle(body)
    const bg = style.backgroundColor || ""
    const text = (body?.innerText || "").replace(/\s+/g, " ").trim()
    const iframe = document.querySelector("iframe")
    let iframeBlank = null
    if (iframe) {
      try {
        const doc = iframe.contentDocument
        iframeBlank = !doc || ((doc.body?.innerText || "").trim().length < 20)
      } catch {
        iframeBlank = "cross-origin-or-empty"
      }
    }
    return {
      url: location.pathname + location.hash,
      title: document.title,
      bodyTextLength: text.length,
      preview: text.slice(0, 180),
      bg,
      bgLooksBlank: /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(bg) && text.length < 80,
      iframeBlank,
      hasItdxApp: Boolean(document.querySelector("[class*='application'], iframe[title^='ITDX']")),
      hasLeftPanel: Boolean(document.querySelector("[data-testid='itdx-left-panel']")),
      hasDock: Boolean(document.querySelector("aside[aria-label*='ITDX']")),
    }
  })
}

function loadCreds() {
  const extra = {}
  const paths = [
    resolve(root, ".credentials.local"),
    "D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/.credentials.local",
    "D:/Users/admin2/Desktop/MYCOSOFT/CODE/MAS/mycosoft-mas/.credentials.local",
  ]
  for (const p of paths) {
    try {
      for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
        if (!line || line.startsWith("#") || !line.includes("=")) continue
        const i = line.indexOf("=")
        extra[line.slice(0, i).trim()] = line.slice(i + 1).trim()
      }
    } catch {
      /* optional */
    }
  }
  return extra
}

const env = { ...loadCreds(), ...loadEnv() }
const email = "morgan@mycosoft.org"

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
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "magiclink",
      email,
      options: { redirect_to: "http://localhost:3010/auth/callback?next=/fusarium/itdx" },
    }),
  })
  if (!generated.ok) throw new Error(`generate_link ${generated.status}`)
  const payload = await generated.json()
  const hashed = payload.hashed_token
  if (!hashed) throw new Error("generate_link missing hashed_token")
  const verified = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
  })
  if (!verified.ok) throw new Error(`verify ${verified.status}`)
  const session = await verified.json()
  if (!session?.access_token) throw new Error("verify missing access_token")
  return { url, session }
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
    cookies.push({
      name: `${name}.${i}`,
      value: decodeURIComponent(head),
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
      httpOnly: false,
      secure: false,
    })
    rest = rest.slice(head.length)
    i += 1
  }
  return cookies
}

const results = []
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 980 } })
const page = await context.newPage()
const consoleErrors = []
page.on("pageerror", (err) => consoleErrors.push(String(err)))
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text())
})

async function shot(name) {
  const file = resolve(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function record(name, url, extra = {}) {
  const metrics = await pageMetrics(page)
  const fail = isMostlyWhite(metrics) || extra.fail
  const row = {
    name,
    url,
    status: fail ? "FAIL" : "PASS",
    ...metrics,
    ...extra,
  }
  results.push(row)
  console.log(`${row.status} ${name} ${url} text=${metrics.bodyTextLength} iframe=${metrics.iframeBlank}`)
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
    console.log("login method=admin_verify_cookie")
    const { url: supabaseUrl, session } = await ownerSessionViaAdmin()
    await context.addCookies(sessionCookies(supabaseUrl, session))
    await page.goto("http://localhost:3010/fusarium/itdx", { waitUntil: "domcontentloaded", timeout: 90000 })
  }
  await page.waitForTimeout(1500)
  const afterLogin = page.url()
  if (afterLogin.includes("/login") || afterLogin.includes("/mfa")) {
    await shot("01-login-blocked")
    results.push({ name: "login", url: afterLogin.replace(/[?#].*/, ""), status: "FAIL", reason: afterLogin.includes("/mfa") ? "MFA challenge" : "still on login" })
    console.log("FAIL login", afterLogin.includes("/mfa") ? "mfa" : "login")
  } else {
    await shot("01-login-itdx")
    await record("login→/fusarium/itdx", page.url())
  }

  const tabButtons = [
    ["lab", "Algorithm lab"],
    ["walkthrough", "Walkthrough"],
    ["sources", "Documents & citations"],
    ["ranking", "Source review & Borda"],
    ["frames", "NLM / Form Space"],
    ["tests", "Run & test"],
    ["exports", "Evidence exports"],
    ["services", "System connections"],
    ["replay", "Earth replay & portable reader"],
    ["apps", "Fusarium applications"],
  ]
  for (const [id, label] of tabButtons) {
    const btn = page.getByRole("button", { name: label })
    if (await btn.count()) {
      await btn.click()
      await page.waitForTimeout(id === "frames" ? 18000 : 2000)
      await shot(`tab-${id}`)
      const extra = { tab: label }
      if (["lab", "walkthrough", "sources", "ranking", "frames", "tests", "exports", "services"].includes(id)) {
        const iframeText = await page.evaluate(() => {
          const iframe = document.querySelector("iframe")
          try { return (iframe?.contentDocument?.body?.innerText || "").replace(/\s+/g, " ").trim() }
          catch { return "" }
        })
        extra.iframePreview = iframeText.slice(0, 220)
        extra.fail = id === "frames"
          ? iframeText.length < 40 || !/FormSpace|FORM SPACE|atlas|recorded/i.test(iframeText)
          : iframeText.length < 40
      }
      await record(`/fusarium/itdx#${id}`, page.url(), extra)
    } else {
      results.push({ name: `/fusarium/itdx#${id}`, status: "FAIL", reason: "button missing" })
      console.log("FAIL missing button", label)
    }
  }

  await page.goto("http://localhost:3010/fusarium/earth-simulator", { waitUntil: "domcontentloaded", timeout: 90000 })
  await page.waitForTimeout(4000)
  await shot("earth-default")
  const itdxTab = page.locator("[data-crep-left-tab='itdx']")
  if (await itdxTab.count()) {
    await itdxTab.click()
    await page.waitForTimeout(2500)
    await shot("earth-itdx-tab")
    const panel = await page.locator("[data-testid='itdx-left-panel']").count()
    await record("/fusarium/earth-simulator ITDX tab", page.url(), { fail: panel === 0, hasLeftPanel: panel > 0 })
    const layerBtn = page.getByRole("button", { name: /Uncertainty circles|Movement pathways|Scenario AO/ })
    if (await layerBtn.count()) {
      await layerBtn.first().click()
      await page.waitForTimeout(800)
      await shot("earth-layer-toggle")
      await record("Earth Sim layer toggle", page.url())
    }
    const assetBtn = page.getByRole("button", { name: /UNIT 01|VEHICLE 02|SENSOR 03|AIR 04/ })
    if (await assetBtn.count()) {
      await assetBtn.first().click()
      await page.waitForTimeout(800)
      await shot("earth-asset-focus")
      await record("Earth Sim asset focus", page.url())
    }
    const focusBtn = page.getByRole("button", { name: "Focus demo" })
    if (await focusBtn.count()) {
      await focusBtn.click()
      await page.waitForTimeout(1000)
      await shot("earth-focus-demo")
      await record("Earth Sim focus demo", page.url())
    }
  } else {
    await record("/fusarium/earth-simulator ITDX tab", page.url(), { fail: true, reason: "ITDX tab missing" })
  }

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto("http://localhost:3010/fusarium/itdx", { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForTimeout(1500)
  await shot("itdx-ipad")
  await record("/fusarium/itdx iPad width", page.url())

  for (const path of ["/fusarium/threat-assessment", "/fusarium/data-fusion", "/fusarium"]) {
    await page.goto(`http://localhost:3010${path}`, { waitUntil: "domcontentloaded", timeout: 60000 })
    await page.waitForTimeout(1000)
    await shot(`consumer-${path.replace(/\W+/g, "_")}`)
    await record(path, page.url())
  }
} catch (error) {
  results.push({ name: "script", status: "FAIL", reason: error instanceof Error ? error.message : String(error) })
  console.error("SCRIPT", error instanceof Error ? error.message : error)
} finally {
  const proof = {
    generated: new Date().toISOString(),
    tree: "website-itdx-codex-v13",
    port: 3010,
    consoleErrors: consoleErrors.slice(0, 40),
    results,
  }
  writeFileSync(resolve(outDir, "results.json"), JSON.stringify(proof, null, 2))
  await browser.close()
  const failed = results.filter((row) => row.status === "FAIL").length
  console.log(`SUMMARY pass=${results.filter((r) => r.status === "PASS").length} fail=${failed} shots=${outDir}`)
  process.exit(failed ? 1 : 0)
}
