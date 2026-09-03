import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const component = await readFile(new URL("../../../..//components/fusarium/sensing/sine-replay-workbench.tsx", import.meta.url), "utf8")
const dashboard = await readFile(new URL("../../../..//components/fusarium/sensing/sine-dashboard.tsx", import.meta.url), "utf8")

test("SINE local replay is explicit, bounded, visual, and separate from the server library", () => {
  assert.match(component, /MAX_FILE_BYTES = 2 \* 1024 \* 1024/)
  assert.match(component, /WaveformVisual/)
  assert.match(component, /SpectrumVisual/)
  assert.match(component, /mode: "REPLAY"|REPLAY evidence/)
  assert.match(component, /no detector, model, device connection, or classification is implied/i)
  assert.doesNotMatch(component, /fetch\(|WebSocket|EventSource|Math\.random|setInterval/)
  assert.match(dashboard, /Back to Fusarium/)
  assert.match(dashboard, /SineAcousticPlayer embedded/)
})
