import { readFileSync, existsSync } from 'node:fs'
import { AO_ORIGIN_LAT, AO_ORIGIN_LNG, AO_PLACE, snapshot } from '../../lib/itdx/replay-core.mjs'
import {
  LOCAL_REPLAY_RUN_ID,
  MAS_TASK8_PATHS,
  buildCards,
  buildEvidenceSummary,
  nlmQualification,
  officialInjectsStatus,
  sevenRoleQualification,
} from '../../lib/itdx/run-narration.mjs'
import { masBase } from '../../lib/itdx/task8-client.mjs'

const rows = []
function row(name, status, proof) {
  rows.push({ name, status, proof })
  console.log(`${status.padEnd(12)} ${name} · ${proof}`)
}

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const wekaReceipt = 'C:/Users/Owner1/Downloads/ITDX_Weka_Demo_Kit/weka-demo/runs/20260909T172101017869Z/receipt.json'
if (existsSync(wekaReceipt)) {
  const receipt = JSON.parse(readFileSync(wekaReceipt, 'utf8'))
  const pass = receipt.status === 'PASS' && Array.isArray(receipt.checks) && receipt.checks.length === 14 && receipt.checks.every((c) => c.status === 'PASS')
  row('Weka 14/14', pass ? 'PROVEN' : 'UNQUALIFIED', `receipt ${receipt.status} checks=${receipt.checks?.length} (kit not rewritten)`)
} else {
  row('Weka 14/14', 'UNQUALIFIED', 'Receipt file not on this machine; kit was not rerun')
}

const fs = await fetch(env.FORMSPACE_BACKEND_URL.replace(/\/$/, '') + '/api/formspace')
const formspace = await fs.json()
row('FormSpace SHA', fs.ok && formspace.result?.model_sha256 ? 'PROVEN' : 'UNQUALIFIED', `${formspace.origin} ${formspace.result?.model_sha256 || 'missing'}`)

const mas = masBase()
const nlmH = await fetch(mas + '/api/nlm/health').then((r) => r.json())
const nlmC = await fetch(mas + '/api/nlm/training/checkpoints').then((r) => r.json())
const nlmP = await fetch(mas + '/api/nlm/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'ITDX synthetic track Fort Stewart', query_type: 'ecology', temperature: 0, max_tokens: 32 }),
}).then((r) => r.json())
const nlmQ = nlmQualification(nlmH, nlmC, nlmP)
row('NLM bind', nlmQ.qualification, nlmQ.missing_artifact || `model_loaded=${nlmH.model_loaded}`)

const task8Gets = []
for (const path of MAS_TASK8_PATHS) {
  const r = await fetch(mas + path)
  task8Gets.push(`${path}:${r.status}`)
}
const seven = sevenRoleQualification({ source: 'none', roles: [] })
row('Task 8 seven-role', seven.qualification, `${seven.missing_artifact} probes=${task8Gets.join(' ')}`)

const myca = await fetch(mas + '/api/myca/health').then(async (r) => ({ status: r.status, data: await r.json() }))
row('MYCA health', myca.status === 200 && myca.data?.is_conscious ? 'PROVEN' : 'UNQUALIFIED', `GET ${mas}/api/myca/health → ${myca.status} ${myca.data?.state || ''}`)

const avani = await fetch(mas + '/api/avani/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source_agent: 'itdx-task8',
    action_type: 'observe',
    description: 'Continue observation. Advisory only.',
    risk_tier: 'low',
  }),
})
const avaniBody = await avani.json()
row('AVANI evaluate', avani.ok ? 'PROVEN' : 'UNQUALIFIED', `POST /api/avani/evaluate → ${avani.status} approved=${avaniBody.approved}`)
row('AVANI /status', 'UNQUALIFIED', 'MAS GET /api/avani/status is 404; canonical GET /api/avani/health')

const evidence = buildEvidenceSummary({
  context: { runId: LOCAL_REPLAY_RUN_ID, datasetId: 'demo-11', dataOrigin: 'SYNTHETIC_EXERCISE' },
  bootstrap: { runs: [] },
  dataset: { dataset: { id: 'demo-11' }, total: 960 },
})
row('Evidence chip', evidence.status === 200 ? 'PROVEN' : 'UNQUALIFIED', `${evidence.detail}`)

const earlyTruth = snapshot(8)
const lateTruth = snapshot(80)
const unitP = earlyTruth.assets.find((asset) => asset.id === 'demo-unit-01')?.p_truth
const vehicleP = lateTruth.assets.find((asset) => asset.id === 'demo-vehicle-02')?.p_truth
const airFlags = lateTruth.assets.find((asset) => asset.id === 'demo-air-04')?.quality_flags || []
row(
  'Map truth geometry',
  typeof unitP === 'number' && typeof vehicleP === 'number' && vehicleP < unitP && airFlags.includes('stale') ? 'PROVEN' : 'UNQUALIFIED',
  `unit@8 P(truth)=${unitP?.toFixed(3)} vehicle@80=${vehicleP?.toFixed(3)} air flags=${airFlags.join(',')}`,
)
row('Earth land AO', AO_PLACE.includes('Fort Stewart') && AO_ORIGIN_LAT > 30 ? 'PROVEN' : 'UNQUALIFIED', `${AO_PLACE} ${AO_ORIGIN_LAT},${AO_ORIGIN_LNG}`)

const cards = buildCards({ replayIndex: 47, selected: { id: 'demo-vehicle-02', label: 'DEMO VEHICLE 02' }, formspace: formspace.result ? { ...formspace.result, origin: formspace.origin } : null, task8: { source: 'mas_governor', roles: [] } })
row('Explanation cards', cards.length === 8 && cards.some((c) => c.active) ? 'PROVEN' : 'UNQUALIFIED', cards.map((c) => c.id).join('→'))

const mindex = await fetch('http://192.168.0.189:8000/health')
row('MINDEX health', mindex.ok ? 'PROVEN' : 'UNQUALIFIED', `189:8000/health → ${mindex.status}`)
const species = await fetch('http://192.168.0.189:8000/api/species')
row('MINDEX species', species.status === 404 || species.status === 200 ? 'PROVEN' : 'UNQUALIFIED', `/api/species → ${species.status} empty-state (no fake taxonomy)`)

const injects = officialInjectsStatus(null)
row('Official injects 1–5', injects.status === 'NOT_SUPPLIED' ? 'PROVEN' : 'UNQUALIFIED', injects.note)

const nextEvidence = await fetch('http://localhost:3010/api/fusarium/itdx/evidence?runId=' + LOCAL_REPLAY_RUN_ID)
row('Next evidence auth', nextEvidence.status === 401 || nextEvidence.status === 200 ? 'PROVEN' : 'UNQUALIFIED', `GET /api/fusarium/itdx/evidence → ${nextEvidence.status} (401=owner gate, not 404)`)

console.log('\n=== MATRIX ===')
console.table(rows)
const silentGreen = rows.some((r) => r.name.includes('seven-role') && r.status === 'PROVEN' && !r.proof.includes('bound'))
if (silentGreen) {
  console.error('FAIL CLOSED: seven-role cannot be PROVEN without bound MAS roles')
  process.exit(1)
}
const required = ['Earth land AO', 'Explanation cards', 'Evidence chip', 'Official injects 1–5', 'Map truth geometry']
const failed = rows.filter((r) => required.includes(r.name) && r.status !== 'PROVEN')
if (failed.length) {
  console.error('Required proofs failed:', failed.map((f) => f.name).join(', '))
  process.exit(1)
}
