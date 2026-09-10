/** Packaged ITDX v1.4 lab UI and catalog. Optional 8765 compute is not a gate. */
import {readFileSync, existsSync} from 'node:fs'
import {dirname, join, normalize, sep} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}
const STATIC_CSRF = 'itdx-static-lab-unbound'

function firstExisting(paths) {
  return paths.find((path) => existsSync(path)) || paths[0]
}

export function labWebRoot() {
  return firstExisting([join(here, 'lab-web'), join(process.cwd(), 'lib/itdx/lab-web'), join(process.cwd(), 'itdx/app/web')])
}

export function labCatalogRoot() {
  return firstExisting([join(here, 'lab-catalog'), join(process.cwd(), 'lib/itdx/lab-catalog')])
}

function readJson(name, fallback) {
  const path = join(labCatalogRoot(), name)
  if (!existsSync(path)) return fallback
  return JSON.parse(readFileSync(path, 'utf8'))
}

function readCsvTasks() {
  const path = join(labCatalogRoot(), 'task_objectives.csv')
  if (!existsSync(path)) return []
  const [header, ...rows] = readFileSync(path, 'utf8').trim().split(/\r?\n/)
  const keys = header.split(',')
  return rows.map((line) => {
    const cols = line.split(',')
    const task = Object.fromEntries(keys.map((key, i) => [key, cols[i] || '']))
    task.reference_ids = []
    task.reference_status = 'NO_LINKED_SOURCE'
    return task
  })
}

export function staticDocuments() {
  return readJson('documents.json', [])
}

export function staticLabBootstrap() {
  const documents = staticDocuments()
  return {
    version: '1.4.0',
    csrf_token: STATIC_CSRF,
    tasks: readJson('tasks.json', []),
    scenarios: readJson('scenarios.json', []),
    requirements: readJson('requirements.json', []),
    constraints: readJson('constraints.json', {}),
    datasets: [
      {
        id: 'demo-11',
        title: 'Coastal Sentinel • reproducible synthetic replay',
        mode: 'SYNTHETIC_TEST',
        seed: 11,
        record_count: 960,
        schema: 'itdx-dataset/v1',
        provenance: {source: 'ITDX local synthetic generator v1', physical_field_evidence: false},
      },
    ],
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      sha256: doc.sha256,
      bytes: doc.bytes,
      pages: doc.pages,
      tables: doc.tables,
    })),
    runs: [],
    suites: [],
    signing_available: false,
    services: readJson('services.json', {}),
    source_manifest: readJson('source_manifest.json', []),
    active_jobs: [],
    runtime: {
      platform: 'website-static-lab',
      python: 'NOT_SUPPLIED',
      uptime_seconds: 0,
      data_dir: 'lib/itdx/lab-catalog',
      storage: 'Packaged Fusarium ITDX catalog; optional 8765 SQLite compute is NOT_SUPPLIED',
      network: 'MAS 188 + MINDEX 189 cite path remains SUPPLIED independently of 8765',
    },
    lab_ui: 'SUPPLIED',
    optional_compute: 'NOT_SUPPLIED',
    connection_status: 'STATIC_UI',
    qualification: 'LAB_UI_SUPPLIED',
    note: 'ITDX v1.4 application UI is packaged in the website. Optional 8765/8766 compute stays NOT_SUPPLIED until bound. Google Maps traffic/pathways stay SUPPLIED on the website BFF.',
  }
}

export function staticWorkspace() {
  const documents = staticDocuments().map((doc) => ({
    id: doc.id,
    name: doc.name,
    sha256: doc.sha256,
    bytes: doc.bytes,
    page_count: doc.pages || 1,
    pack_id: null,
    data_origin: 'SUPPLIED_DOCUMENT',
    markings: ['UNCLASSIFIED'],
    related_tasks: [],
    extraction: 'Identity and SHA-256 from the packaged document index. Page bytes stay in the optional 8765 pack.',
  }))
  return {
    schema: 'itdx-document-workspace/v1',
    packs: [],
    documents,
    tasks: readCsvTasks(),
    notes: [],
    checks: [],
    boundary: 'Source reference availability is separate from task implementation or evaluator acceptance.',
  }
}

export function staticWorkspacePage(id, page = 1) {
  const doc = staticWorkspace().documents.find((row) => row.id === id)
  if (!doc) return null
  const text =
    'Packaged document identity is SUPPLIED. Extracted page text is served when the optional 8765 ITDX service is bound. ' +
    `Document: ${doc.name}. SHA-256: ${doc.sha256}. This is not a live COP and does not invent page prose.`
  return {
    document: doc,
    page: Number(page) || 1,
    text,
    text_sha256: 'NOT_SUPPLIED',
    preview_available: false,
    citation: `${doc.name}, identity SHA-256 ${doc.sha256}`,
    source_date: null,
    data_origin: doc.data_origin,
  }
}

export function staticFormspace() {
  return {
    origin: 'NOT_SUPPLIED',
    result: null,
    behavior: null,
    validation: null,
    weka: null,
    note: 'Optional Form Space observatory 8766 is NOT_SUPPLIED. Atlas chrome still mounts.',
  }
}

export function staticFormAtlas() {
  return {
    counts: {forms: 0, systems: 0, behaviors: 0, observations: 0, claims: 0},
    domains: [],
    kinds: [],
    forms: [],
    coverage: 'Local atlas chrome is packaged. Optional 8766 observatory data is NOT_SUPPLIED.',
  }
}

export function staticEmptyList() {
  return []
}

export function readLabStatic(urlPath) {
  const relative = String(urlPath || '').replace(/^\/+/, '')
  if (!relative || relative.includes('\0')) return null
  const root = labWebRoot()
  const resolved = normalize(join(root, relative))
  const rootNorm = normalize(root) + sep
  if (resolved !== normalize(root) && !resolved.startsWith(rootNorm)) return null
  if (!existsSync(resolved)) return null
  const ext = resolved.slice(resolved.lastIndexOf('.'))
  return {bytes: readFileSync(resolved), type: TYPES[ext] || 'application/octet-stream'}
}

export function staticComputeDenied() {
  return {
    connection_status: 'NOT_SUPPLIED',
    qualification: 'NOT_SUPPLIED',
    error: 'Optional 8765/8766 compute is NOT_SUPPLIED. The packaged ITDX application UI remains available.',
    note: 'MAS 188 + MINDEX 189 + Google Maps BFF stay the v1.4 cite path. No invented p. live COP stays false.',
  }
}
