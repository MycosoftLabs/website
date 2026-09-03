import assert from "node:assert/strict"
import { chromium } from "playwright-core"

const baseUrl = process.env.FUSARIUM_BASE_URL ?? "http://127.0.0.1:8012"
const executablePath = process.env.FUSARIUM_BROWSER_EXECUTABLE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
const provenance = { sourceId: "qa-local", sourceRef: "local://browser-qa", sourceRecordId: "qa-source", receivedAt: "2026-09-01T12:01:00.000Z" }
const cases = [
  { slug: "chain-of-custody", kind: "custody", title: "Chain of Custody Ledger Inspector", action: "Inspect custody chain", input: { schemaVersion: "fusarium-chain-of-custody/v1", evidenceId: "qa-evidence", classification: "UNCLASSIFIED", provenance, events: [] }, state: "empty" },
  { slug: "evidence-timeline", kind: "timeline", title: "Evidence Timeline Builder", action: "Build timeline", input: { schemaVersion: "fusarium-evidence-timeline-source/v1", timelineId: "qa-timeline", classification: "UNCLASSIFIED", records: [{ recordId: "qa-record", eventType: "observation", summary: "Operator-supplied QA record", observedAt: "2026-09-01T12:00:00.000Z", recordedAt: "2026-09-01T12:01:00.000Z", classification: "UNCLASSIFIED", provenance }] }, state: "verified" },
  { slug: "field-packet", kind: "packet", title: "Field Packet Builder", action: "Build field packet", input: { schemaVersion: "fusarium-field-packet-source/v1", packetId: "qa-packet", classification: "UNCLASSIFIED", assembledAt: "2026-09-01T12:02:00.000Z", assembledByRef: "qa-operator", missionArea: { id: "qa-area", label: "QA area" }, timeWindow: { start: "2026-09-01T12:00:00.000Z", end: "2026-09-01T13:00:00.000Z" }, provenance, records: [] }, state: "empty" },
  { slug: "evidence-diff", kind: "diff", title: "Evidence Diff", action: "Compare revisions", input: { schemaVersion: "fusarium-evidence-diff-source/v1", classification: "UNCLASSIFIED", left: { evidenceId: "qa-evidence", classification: "UNCLASSIFIED", revision: 1, recordedAt: "2026-09-01T12:00:00.000Z", provenance, records: [] }, right: { evidenceId: "qa-evidence", classification: "UNCLASSIFIED", revision: 2, recordedAt: "2026-09-01T12:01:00.000Z", provenance: { ...provenance, sourceRecordId: "qa-source-2" }, records: [] } }, state: "empty" },
]
const viewports = [{ name: "desktop", width: 1600, height: 900 }, { name: "mobile", width: 390, height: 844 }]
const browser = await chromium.launch({ executablePath, headless: true, args: ["--disable-background-networking", "--disable-extensions", "--no-first-run"] })
let assertions = 0
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
    for (const entry of cases) {
      const page = await context.newPage()
      const errors = []
      page.on("pageerror", (error) => errors.push(error.message))
      const response = await page.goto(`${baseUrl}/fusarium/tools/${entry.slug}`, { waitUntil: "domcontentloaded", timeout: 45_000 })
      assert.equal(response?.status(), 200); assertions += 1
      await page.locator(`[data-evidence-operation="${entry.kind}"]`).waitFor({ state: "visible" })
      await page.getByRole("heading", { name: entry.title, exact: true }).waitFor({ state: "visible" }); assertions += 1
      assert.match(await page.locator(`[data-evidence-operation="${entry.kind}"]`).innerText(), /No evidence has been supplied or processed/); assertions += 1
      await page.waitForTimeout(500)
      await page.getByLabel(`${entry.title} JSON`).fill(JSON.stringify(entry.input))
      const action = page.getByRole("button", { name: entry.action, exact: true })
      await action.waitFor({ state: "visible" })
      await page.waitForFunction((label) => {
        const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === label)
        return button && !button.hasAttribute("disabled")
      }, entry.action)
      await action.click()
      await page.locator("section[aria-live=polite]").getByText(entry.state, { exact: true }).waitFor({ state: "visible" })
      assert.equal((await page.locator("section[aria-live=polite]").getByText(entry.state, { exact: true }).innerText()).toLowerCase(), entry.state); assertions += 1
      assert.equal(errors.length, 0, `${viewport.name} ${entry.slug}: ${errors.join(" | ")}`); assertions += 1
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
      assert.equal(overflow, false, `${viewport.name} ${entry.slug} has horizontal overflow`); assertions += 1
      await page.close()
    }
    await context.close()
  }
  console.log(JSON.stringify({ routes: cases.length, viewports: viewports.length, assertions }))
} finally {
  await browser.close()
}
