// One-off: parse the SanDiegoWebCam /streams page (saved HTML) → list LIVE videos.
import { readFile } from "node:fs/promises"
const html = await readFile(process.env.TEMP + "/sdwebcam-streams.html", "utf8")
const m = html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});<\/script>/) || html.match(/var ytInitialData = (\{[\s\S]*?\});/)
if (!m) { console.log("no ytInitialData"); process.exit(0) }
let data
try { data = JSON.parse(m[1]) } catch (e) { console.log("parse fail", e.message); process.exit(1) }
const found = new Map()
function walk(node) {
  if (!node || typeof node !== "object") return
  if (Array.isArray(node)) { for (const x of node) walk(x); return }
  const vr = node.videoRenderer
  if (vr && vr.videoId) {
    const id = vr.videoId
    const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || ""
    const overlays = JSON.stringify(vr.thumbnailOverlays || [])
    const badges = JSON.stringify(vr.badges || []) + JSON.stringify(vr.thumbnailOverlays || [])
    const isLive = /"style":"LIVE"/.test(overlays) || /LIVE_NOW|isLive/i.test(badges) ||
      /watching/i.test(JSON.stringify(vr.viewCountText || {}))
    if (!found.has(id)) found.set(id, { title, isLive })
  }
  for (const k of Object.keys(node)) walk(node[k])
}
walk(data)
const live = [...found.entries()].filter(([, v]) => v.isLive)
const notLive = [...found.entries()].filter(([, v]) => !v.isLive)
console.log(`TOTAL videos=${found.size}  LIVE=${live.length}  other=${notLive.length}`)
console.log("=== LIVE ===")
for (const [id, v] of live) console.log(`  ${id}  ${v.title}`)
console.log("=== OTHER (most recent first) ===")
for (const [id, v] of notLive.slice(0, 20)) console.log(`  ${id}  ${v.title}`)
