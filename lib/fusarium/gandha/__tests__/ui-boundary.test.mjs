import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const component = await readFile(new URL("../../../../components/fusarium/sensing/gandha-dashboard.tsx", import.meta.url), "utf8")

test("GANDHA preserves local-only gates and renders supplied chemical evidence", () => {
  assert.match(component, /GANDHA_MAX_FILE_BYTES = 8 \* 1024 \* 1024/)
  assert.match(component, /MultichannelTraceVisual/)
  assert.match(component, /HeatFieldVisual/)
  assert.match(component, /not compound identification/i)
  assert.match(component, /Back to Fusarium/)
  assert.match(component, /External training remains unbound/)
  assert.doesNotMatch(component, /fetch\(|WebSocket|EventSource|Math\.random|setInterval/)
})
