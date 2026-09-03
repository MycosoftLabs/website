import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const helper = await readFile(new URL("./fusarium-operator-login.ts", import.meta.url), "utf8")
const page = await readFile(new URL("../app/defense/fusarium/page.tsx", import.meta.url), "utf8")
const cta = await readFile(new URL("../app/defense/fusarium/explore-platform-cta.tsx", import.meta.url), "utf8")
const loginPage = await readFile(new URL("../app/fusarium/login/page.tsx", import.meta.url), "utf8")
const telemetry = await readFile(new URL("../app/api/natureos/devices/telemetry/route.ts", import.meta.url), "utf8")
const network = await readFile(new URL("../app/api/devices/network/route.ts", import.meta.url), "utf8")

test("defense Fusarium Explore CTA uses the public login helper", () => {
  assert.match(page, /import \{ FusariumExploreCta \} from "\.\/explore-platform-cta"/)
  assert.match(page, /<FusariumExploreCta \/>/)
  assert.match(cta, /Explore the Platform/)
  assert.doesNotMatch(page, /href="#nlm"/)
  assert.doesNotMatch(page, /127\.0\.0\.1/)
})

test("Explore CTA href is the public mycosoft.com path, never loopback", () => {
  assert.match(helper, /FUSARIUM_PUBLIC_LOGIN_HREF = "https:\/\/mycosoft.com\/fusarium\/login"/)
  assert.match(helper, /FUSARIUM_SANDBOX_LOGIN_HREF = "https:\/\/sandbox.mycosoft.com\/fusarium\/login"/)
  assert.match(helper, /FUSARIUM_OPERATOR_LOGIN_PATH = "\/fusarium\/login"/)
  assert.match(cta, /getFusariumLoginHref/)
  assert.match(cta, /FUSARIUM_PUBLIC_LOGIN_HREF/)
  assert.doesNotMatch(helper, /https?:\/\/127\.0\.0\.1/)
  assert.doesNotMatch(cta, /https?:\/\/127\.0\.0\.1/)
})

test("public operator login lives at /fusarium/login and uses Supabase", () => {
  assert.match(loginPage, /createClient/)
  assert.match(loginPage, /isFusariumOwnerEmail/)
  assert.match(loginPage, /FusariumLoginForm/)
})

test("operational website APIs require Fusarium owner before fetch", () => {
  assert.match(telemetry, /requireFusariumOwner/)
  assert.match(telemetry, /fusariumOperationalDeniedResponse/)
  assert.match(network, /requireFusariumOwner/)
  assert.match(network, /fusariumOperationalDeniedResponse/)
  const telemetryAuthIndex = telemetry.indexOf("requireFusariumOwner")
  const telemetryFetchIndex = telemetry.indexOf("fetchRealDeviceTelemetry")
  assert.ok(telemetryAuthIndex > -1 && telemetryAuthIndex < telemetryFetchIndex)
})
