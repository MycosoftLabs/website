import assert from "node:assert/strict"
import { chromium } from "playwright-core"

const baseURL = process.env.FUSARIUM_QA_URL ?? "http://127.0.0.1:8012"
const origin = new URL(baseURL).origin
const executablePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"

async function establishOwnerSession(context, redirectTo) {
  const response = await context.request.post(`${baseURL}/api/auth/local-dev-session`, {
    headers: { Origin: origin },
    data: { redirectTo },
    failOnStatusCode: false,
  })
  const body = await response.json().catch(() => null)
  assert.equal(response.status(), 200)
  assert.equal(body?.success, true)
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const anonymous = await browser.newContext()
  const denied = await anonymous.request.get(`${baseURL}/api/fusarium/life-database/not-a-record`)
  assert.equal(denied.status(), 401)
  await anonymous.close()

  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await establishOwnerSession(context, "/fusarium/life-database/explorer?search=Amanita")

  const catalog = await context.request.get(
    `${baseURL}/api/fusarium/life-database?query=Amanita&limit=5&include_incomplete=true`,
  )
  assert.equal(catalog.status(), 200)
  const catalogBody = await catalog.json()
  assert.equal(catalogBody?.source_state, "available")
  assert.equal(Array.isArray(catalogBody?.species), true)
  assert.equal(catalogBody.species.length > 0, true)
  assert.equal(
    catalogBody.species.some((candidate) =>
      String(candidate?.scientific_name ?? "").toLocaleLowerCase().includes("amanita"),
    ),
    true,
  )

  const record = catalogBody.species.find((candidate) => candidate?.uuid || candidate?.id)
  assert.ok(record)
  const recordId = encodeURIComponent(record.uuid || String(record.id))
  const coreStartedAt = performance.now()
  const coreProfile = await context.request.get(
    `${baseURL}/api/fusarium/life-database/${recordId}?type=species&enrich=0`,
  )
  const coreLatencyMs = Math.round(performance.now() - coreStartedAt)
  assert.equal(coreProfile.status(), 200)
  const coreBody = await coreProfile.json()
  assert.equal(coreBody?.enrichment?.state, "deferred")
  assert.equal(coreBody?.species?.scientific_name, record.scientific_name)
  assert.equal(coreLatencyMs < 10_000, true, `core profile latency ${coreLatencyMs}ms exceeded 10 seconds`)
  const profile = await context.request.get(
    `${baseURL}/api/fusarium/life-database/${recordId}?type=species`,
  )
  assert.equal(profile.status(), 200)
  const profileBody = await profile.json()
  assert.equal(typeof profileBody?.species?.scientific_name, "string")
  assert.equal(profileBody.species.scientific_name.length > 0, true)
  assert.equal(typeof profileBody?.profile, "object")
  for (const key of ["genetics", "genomes", "compounds", "observations"]) {
    assert.match(profileBody.profile[key]?.state ?? "", /^(available|unavailable)$/)
  }

  for (const viewport of [{ width: 1600, height: 900 }, { width: 390, height: 844 }]) {
    const page = await context.newPage()
    const pageErrors = []
    page.on("pageerror", (error) => pageErrors.push(error.message))
    await page.setViewportSize(viewport)
    await page.goto(`${baseURL}/fusarium/life-database/species/${recordId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    await page.getByText(profileBody.species.scientific_name, { exact: true }).first().waitFor({ timeout: 60_000 })
    assert.equal(await page.getByText("Profile coverage unavailable", { exact: true }).count(), 0)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      false,
    )
    assert.deepEqual(pageErrors, [])
    await page.close()
  }

  await context.close()
  console.log(
    `life-database browser QA: protected catalog and unified profile passed for ${profileBody.species.scientific_name}; core ${coreLatencyMs}ms`,
  )
} finally {
  await browser.close()
}
