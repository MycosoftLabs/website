"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  Activity,
  Atom,
  Beaker,
  Binary,
  Boxes,
  Braces,
  CircleDot,
  FlaskConical,
  GitBranch,
  ImageIcon,
  Link2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/ui/glowing-border"
import { MoleculeViewer } from "@/components/visualizations/MoleculeViewer"

interface CompoundRow {
  id: string | number
  name: string
  formula?: string | null
  molecular_formula?: string | null
  molecular_weight?: string | number | null
  inchikey?: string | null
  inchi_key?: string | null
  inchi?: string | null
  pubchem_id?: string | number | null
  cid?: string | number | null
  smiles?: string | null
  canonical_smiles?: string | null
  isomeric_smiles?: string | null
  iupac_name?: string | null
  chemical_class?: string | null
  compound_type?: string | null
  species_count?: number | null
  sourceSpecies?: string[] | null
  source_species?: string[] | null
  synonyms?: string[] | null
  description?: string | null
  xlogp?: number | null
  tpsa?: number | null
  complexity?: number | null
  h_bond_donors?: number | null
  h_bond_acceptors?: number | null
  rotatable_bonds?: number | null
  heavy_atom_count?: number | null
  exact_mass?: number | null
  monoisotopic_mass?: number | null
  lipinski_violations?: number | null
  source?: string | null
  source_url?: string | null
}

interface CompoundListPayload {
  data?: CompoundRow[]
  compounds?: CompoundRow[]
  total?: number
  count?: number
  limit?: number
  offset?: number
  source?: string
  error?: string
  message?: string
}

type SdfAtom = {
  x: number
  y: number
  z: number
  element: string
}

type SdfBond = {
  from: number
  to: number
  order: number
}

type SdfModel = {
  atoms: SdfAtom[]
  bonds: SdfBond[]
}

type ModuleStatus = "live" | "ready" | "pending" | "empty" | "interactive"

const ELEMENT_META: Record<string, { name: string; atomicNumber: number; color: number }> = {
  H: { name: "Hydrogen", atomicNumber: 1, color: 0xffffff },
  C: { name: "Carbon", atomicNumber: 6, color: 0x94a3b8 },
  N: { name: "Nitrogen", atomicNumber: 7, color: 0x60a5fa },
  O: { name: "Oxygen", atomicNumber: 8, color: 0xf87171 },
  F: { name: "Fluorine", atomicNumber: 9, color: 0x4ade80 },
  P: { name: "Phosphorus", atomicNumber: 15, color: 0xfacc15 },
  S: { name: "Sulfur", atomicNumber: 16, color: 0xfbbf24 },
  Cl: { name: "Chlorine", atomicNumber: 17, color: 0x86efac },
  K: { name: "Potassium", atomicNumber: 19, color: 0xc084fc },
  Ca: { name: "Calcium", atomicNumber: 20, color: 0xd9f99d },
  Fe: { name: "Iron", atomicNumber: 26, color: 0xfb923c },
  Zn: { name: "Zinc", atomicNumber: 30, color: 0xa78bfa },
  Br: { name: "Bromine", atomicNumber: 35, color: 0xf97316 },
  I: { name: "Iodine", atomicNumber: 53, color: 0xc084fc },
}

function cidFrom(row: CompoundRow | null): string | null {
  const cid = row?.cid ?? row?.pubchem_id
  return cid == null || String(cid).trim() === "" ? null : String(cid)
}

function formulaFrom(row: CompoundRow | null): string | null {
  return row?.molecular_formula || row?.formula || null
}

function smilesFrom(row: CompoundRow | null): string | null {
  return row?.canonical_smiles || row?.smiles || row?.isomeric_smiles || null
}

function keyFrom(row: CompoundRow | null): string | null {
  return row?.inchi_key || row?.inchikey || row?.inchi || smilesFrom(row)
}

function numberText(value: unknown): string {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "--"
}

function rowsFromPayload(body: CompoundListPayload): CompoundRow[] {
  const rows = Array.isArray(body.data) ? body.data : Array.isArray(body.compounds) ? body.compounds : []
  return rows.filter((row) => row && typeof row.name === "string" && row.name.trim())
}

function normalizeCompound(row: CompoundRow): CompoundRow {
  return {
    ...row,
    id: row.id ?? row.cid ?? row.pubchem_id ?? row.name,
    cid: row.cid ?? row.pubchem_id,
    molecular_formula: row.molecular_formula ?? row.formula,
    canonical_smiles: row.canonical_smiles ?? row.smiles,
    inchi_key: row.inchi_key ?? row.inchikey,
  }
}

function parseFormula(formula: string | null): Array<{ element: string; count: number }> {
  if (!formula) return []
  const matches = formula.matchAll(/([A-Z][a-z]?)(\d*)/g)
  const counts = new Map<string, number>()

  for (const match of matches) {
    const element = match[1]
    const count = match[2] ? Number(match[2]) : 1
    counts.set(element, (counts.get(element) ?? 0) + (Number.isFinite(count) ? count : 1))
  }

  return [...counts.entries()].map(([element, count]) => ({ element, count }))
}

function parseSdf(text: string): SdfModel | null {
  const lines = text.split(/\r?\n/)
  if (lines.length < 5) return null
  const counts = lines[3]
  const atomCount = Number.parseInt(counts.slice(0, 3).trim(), 10)
  const bondCount = Number.parseInt(counts.slice(3, 6).trim(), 10)
  if (!Number.isFinite(atomCount) || atomCount <= 0) return null

  const atoms: SdfAtom[] = []
  for (let index = 0; index < atomCount; index += 1) {
    const line = lines[4 + index] ?? ""
    const parts = line.trim().split(/\s+/)
    const x = Number(parts[0])
    const y = Number(parts[1])
    const z = Number(parts[2])
    const element = parts[3]
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && element) {
      atoms.push({ x, y, z, element })
    }
  }

  const bonds: SdfBond[] = []
  for (let index = 0; index < bondCount; index += 1) {
    const line = lines[4 + atomCount + index] ?? ""
    const parts = line.trim().split(/\s+/)
    const from = Number(parts[0]) - 1
    const to = Number(parts[1]) - 1
    const order = Number(parts[2])
    if (Number.isFinite(from) && Number.isFinite(to) && atoms[from] && atoms[to]) {
      bonds.push({ from, to, order: Number.isFinite(order) ? order : 1 })
    }
  }

  return { atoms, bonds }
}

function moduleBadge(status: ModuleStatus) {
  if (status === "live" || status === "ready" || status === "interactive") {
    return {
      label: status,
      className: "border-green-500/40 text-green-200",
    }
  }

  if (status === "empty") {
    return {
      label: "empty",
      className: "border-amber-500/40 text-amber-200",
    }
  }

  return {
    label: "pending",
    className: "border-cyan-500/40 text-cyan-200",
  }
}

function Molecule3DViewer({ compound }: { compound: CompoundRow | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [model, setModel] = useState<SdfModel | null>(null)
  const [status, setStatus] = useState<"ready" | "pending" | "loading">("pending")
  const cid = cidFrom(compound)

  useEffect(() => {
    let alive = true
    setModel(null)
    if (!cid) {
      setStatus("pending")
      return
    }

    setStatus("loading")
    void fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(cid)}/SDF?record_type=3d`, {
      cache: "force-cache",
    })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (!alive) return
        const parsed = parseSdf(text)
        setModel(parsed)
        setStatus(parsed ? "ready" : "pending")
      })
      .catch(() => {
        if (!alive) return
        setStatus("pending")
      })

    return () => {
      alive = false
    }
  }, [cid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !model) return undefined

    const scene = new THREE.Scene()
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000)
    const group = new THREE.Group()
    const bounds = new THREE.Box3()

    for (const atom of model.atoms) {
      bounds.expandByPoint(new THREE.Vector3(atom.x, atom.y, atom.z))
    }
    const center = bounds.getCenter(new THREE.Vector3())
    const size = Math.max(bounds.getSize(new THREE.Vector3()).length(), 1)
    camera.position.set(0, 0, Math.max(size * 1.6, 8))

    const atomGeometry = new THREE.SphereGeometry(0.22, 32, 24)
    for (const atom of model.atoms) {
      const meta = ELEMENT_META[atom.element] ?? { color: 0x38bdf8 }
      const material = new THREE.MeshStandardMaterial({ color: meta.color, roughness: 0.38, metalness: 0.08 })
      const mesh = new THREE.Mesh(atomGeometry, material)
      mesh.position.set(atom.x - center.x, atom.y - center.y, atom.z - center.z)
      group.add(mesh)
    }

    const bondMaterial = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.45 })
    for (const bond of model.bonds) {
      const a = model.atoms[bond.from]
      const b = model.atoms[bond.to]
      const start = new THREE.Vector3(a.x - center.x, a.y - center.y, a.z - center.z)
      const end = new THREE.Vector3(b.x - center.x, b.y - center.y, b.z - center.z)
      const direction = new THREE.Vector3().subVectors(end, start)
      const length = direction.length()
      const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, length, 16), bondMaterial)
      cylinder.position.copy(start).add(direction.multiplyScalar(0.5))
      cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(end, start).normalize())
      group.add(cylinder)
    }

    scene.add(group)
    scene.add(new THREE.AmbientLight(0xffffff, 1.3))
    const light = new THREE.DirectionalLight(0xffffff, 1.8)
    light.position.set(2, 4, 8)
    scene.add(light)

    let frame = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      renderer.setSize(width, height, false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const animate = () => {
      frame = window.requestAnimationFrame(animate)
      group.rotation.y += 0.008
      group.rotation.x = Math.sin(Date.now() / 1600) * 0.16
      renderer.render(scene, camera)
    }

    resize()
    animate()
    window.addEventListener("resize", resize)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      renderer.dispose()
      atomGeometry.dispose()
      bondMaterial.dispose()
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
  }, [model])

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-md bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {!model ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
          <Boxes className={status === "loading" ? "h-8 w-8 animate-pulse text-lime-300" : "h-8 w-8 text-gray-600"} />
          <div>
            <p className="text-sm font-medium text-white">{status === "loading" ? "Loading 3D conformer" : "3D conformer pending"}</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">
              The viewer renders PubChem 3D SDF coordinates when a compound has a CID. MINDEX should persist conformers
              so this does not depend on live external lookup.
            </p>
          </div>
        </div>
      ) : null}
      {model ? (
        <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs text-lime-200">
          {model.atoms.length.toLocaleString()} atoms / {model.bonds.length.toLocaleString()} bonds
        </div>
      ) : null}
    </div>
  )
}

export function ChemistrySection() {
  const [rows, setRows] = useState<CompoundRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [databasePending, setDatabasePending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("psilocybin")
  const [selected, setSelected] = useState<CompoundRow | null>(null)
  const [detail, setDetail] = useState<CompoundRow | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailPending, setDetailPending] = useState(false)

  const activeCompound = detail ?? selected

  const lookupDetail = useCallback(async (nameOrId: string) => {
    const lookup = nameOrId.trim()
    if (!lookup) return

    setDetailLoading(true)
    setDetailPending(false)
    try {
      const response = await fetch(`/api/mindex/compounds/detail?name=${encodeURIComponent(lookup)}`, { cache: "no-store" })
      const body = (await response.json().catch(() => ({}))) as CompoundRow
      if (!response.ok || !body?.name) {
        setDetailPending(true)
        return
      }
      setDetail(normalizeCompound(body))
    } catch {
      setDetailPending(true)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setDatabasePending(false)
    if (query.trim()) {
      void lookupDetail(query)
    }
    try {
      const params = new URLSearchParams({ limit: "80", offset: "0" })
      if (query.trim()) {
        params.set("search", query.trim())
        params.set("q", query.trim())
      }
      const response = await fetch(`/api/natureos/mindex/compounds?${params.toString()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      })
      const body = (await response.json().catch(() => ({}))) as CompoundListPayload
      const nextRows = response.ok ? rowsFromPayload(body).map(normalizeCompound) : []
      setRows(nextRows)
      setTotal(typeof body.total === "number" ? body.total : typeof body.count === "number" ? body.count : nextRows.length)
      setDatabasePending(!response.ok || body.source === "fallback" || body.source === "error")
      if (nextRows.length > 0) {
        setSelected((current) => current ?? nextRows[0])
      }
      if (nextRows.length === 0 && query.trim()) {
        await lookupDetail(query)
      }
    } catch {
      setRows([])
      setTotal(null)
      setDatabasePending(true)
      if (query.trim()) await lookupDetail(query)
    } finally {
      setLoading(false)
    }
  }, [lookupDetail, query])

  useEffect(() => {
    void load()
  }, [load])

  const elements = useMemo(() => parseFormula(formulaFrom(activeCompound)), [activeCompound])
  const sourceSpecies = activeCompound?.sourceSpecies ?? activeCompound?.source_species ?? []
  const hasStructure = !!(cidFrom(activeCompound) || smilesFrom(activeCompound) || activeCompound?.name)
  const hasProperties = !!(activeCompound?.molecular_weight || activeCompound?.xlogp || activeCompound?.tpsa || activeCompound?.complexity)

  const modules = [
    {
      label: "Compound database",
      icon: Beaker,
      status: rows.length > 0 ? ("live" as const) : databasePending ? ("pending" as const) : loading ? ("pending" as const) : ("empty" as const),
      detail: rows.length > 0 ? `${rows.length.toLocaleString()} loaded rows in this view` : "MINDEX compound index is waiting for local rows",
    },
    {
      label: "Molecular structures",
      icon: Atom,
      status: hasStructure ? ("ready" as const) : ("pending" as const),
      detail: hasStructure ? "2D structure and 3D conformer workspace available" : "needs CID, SMILES, or structure file",
    },
    {
      label: "Chemical interactions",
      icon: GitBranch,
      status: sourceSpecies.length > 0 || (activeCompound?.species_count ?? 0) > 0 ? ("live" as const) : ("pending" as const),
      detail: "species links, pathways, products, byproducts, and interaction graph",
    },
    {
      label: "Simulation engines",
      icon: Binary,
      status: "interactive" as const,
      detail: "DWSIM, Cantera, RDKit, and OpenChemistry adapters planned for chemistry services",
    },
  ]

  const propertyRows = [
    ["Formula", formulaFrom(activeCompound)],
    ["Molecular weight", numberText(activeCompound?.molecular_weight)],
    ["Exact mass", numberText(activeCompound?.exact_mass)],
    ["XLogP", numberText(activeCompound?.xlogp)],
    ["TPSA", numberText(activeCompound?.tpsa)],
    ["Complexity", numberText(activeCompound?.complexity)],
    ["H donors", numberText(activeCompound?.h_bond_donors)],
    ["H acceptors", numberText(activeCompound?.h_bond_acceptors)],
    ["Rotatable bonds", numberText(activeCompound?.rotatable_bonds)],
    ["Heavy atoms", numberText(activeCompound?.heavy_atom_count)],
  ].filter(([, value]) => value && value !== "--")

  return (
    <div className="space-y-6">
      <GlassCard color="green">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Atom className="h-5 w-5 text-lime-400" />
              MINDEX chemical computer
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
              Compound database, molecular structures, elemental composition, species links, interaction graph, and
              simulation adapters for real chemistry work.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading || detailLoading}
            className="min-h-[44px] border-lime-500/40 text-lime-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading || detailLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon
            const badge = moduleBadge(module.status)
            return (
              <div key={module.label} className="rounded-md border border-white/10 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-white">
                      <Icon className="h-4 w-4 text-lime-300" />
                      {module.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{module.detail}</p>
                  </div>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <GlassCard color="cyan">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Compound search</h3>
              <p className="text-sm text-gray-400">MINDEX rows first, PubChem detail lookup when the local index is empty.</p>
            </div>
            <Badge variant="outline" className={databasePending ? "border-cyan-500/40 text-cyan-200" : "border-green-500/40 text-green-200"}>
              {databasePending ? "sync pending" : rows.length > 0 ? "database live" : "live lookup"}
            </Badge>
          </div>

          <div className="mb-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load()
                }}
                placeholder="Search compounds, formulas, CIDs, SMILES"
                className="min-h-[44px] border-cyan-500/30 bg-black/40 pl-10 text-white"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()} className="min-h-[44px] border-cyan-500/40 text-cyan-200">
              Search
            </Button>
          </div>

          {detailPending ? (
            <div className="mb-4 rounded-md border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
              Compound detail lookup is waiting on a resolvable name, CID, or SMILES record.
            </div>
          ) : null}

          <div className="max-h-[560px] overflow-auto rounded-md border border-white/10">
            <div className="divide-y divide-white/10">
              {rows.map((compound) => {
                const active = activeCompound?.id === compound.id
                return (
                  <button
                    key={String(compound.id)}
                    type="button"
                    onClick={() => {
                      setSelected(compound)
                      setDetail(null)
                      if (compound.name) void lookupDetail(compound.name)
                    }}
                    className={`grid w-full gap-3 p-4 text-left transition md:grid-cols-[88px_1fr] ${
                      active ? "bg-lime-500/10" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <MoleculeViewer name={compound.name} cid={cidFrom(compound) ?? undefined} smiles={smilesFrom(compound) ?? undefined} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{compound.name}</p>
                      <p className="mt-1 truncate font-mono text-xs text-gray-500">{keyFrom(compound) ?? "structure key pending"}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formulaFrom(compound) ? <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">{formulaFrom(compound)}</Badge> : null}
                        <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                          {((compound.species_count ?? 0) || sourceSpecies.length).toLocaleString()} species links
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
              {rows.length === 0 ? (
                <div className="p-4 text-sm leading-6 text-gray-400">
                  MINDEX compound rows are not loaded yet for this query. The detail workspace can still hydrate a real
                  compound from live PubChem by name while the local compound index is filled.
                </div>
              ) : null}
            </div>
          </div>

          {total != null ? <p className="mt-2 text-xs text-gray-500">Reported index total: {total.toLocaleString()}</p> : null}
        </GlassCard>

        <GlassCard color="purple">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-purple-300" />
                Molecular workspace
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {activeCompound?.name ? activeCompound.name : "Select or search a compound to hydrate structure data."}
              </p>
            </div>
            {activeCompound?.source ? (
              <Badge variant="outline" className="w-fit border-purple-500/40 text-purple-200">
                {activeCompound.source}
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-md bg-white/5 p-3">
              <MoleculeViewer
                name={activeCompound?.name}
                cid={cidFrom(activeCompound) ?? undefined}
                smiles={smilesFrom(activeCompound) ?? undefined}
                size="full"
                showLink
              />
            </div>
            <Molecule3DViewer compound={activeCompound} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <Braces className="h-4 w-4 text-cyan-300" />
                Chemical identity
              </h4>
              <div className="space-y-2 text-xs">
                <p className="break-words text-gray-400">
                  <span className="text-gray-500">IUPAC:</span> {activeCompound?.iupac_name || "pending"}
                </p>
                <p className="break-all font-mono text-gray-400">
                  <span className="text-gray-500">InChIKey:</span> {activeCompound?.inchi_key || activeCompound?.inchikey || "pending"}
                </p>
                <p className="break-all font-mono text-gray-400">
                  <span className="text-gray-500">SMILES:</span> {smilesFrom(activeCompound) || "pending"}
                </p>
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <Activity className="h-4 w-4 text-lime-300" />
                Properties
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {propertyRows.map(([label, value]) => (
                  <div key={label} className="rounded bg-white/5 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-gray-500">{label}</p>
                    <p className="font-mono text-xs text-white">{value}</p>
                  </div>
                ))}
                {propertyRows.length === 0 ? <p className="col-span-2 text-xs text-gray-500">Property vector pending.</p> : null}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard color="orange">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <CircleDot className="h-5 w-5 text-orange-300" />
            Element composition
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {elements.map(({ element, count }) => {
              const meta = ELEMENT_META[element]
              return (
                <div key={element} className="rounded-md border border-white/10 bg-white/[0.045] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-2xl text-white">{element}</p>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-200">
                      x{count}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {meta ? `${meta.name}; atomic #${meta.atomicNumber}` : "periodic metadata pending"}
                  </p>
                </div>
              )
            })}
            {elements.length === 0 ? <p className="text-sm text-gray-500">Formula needed to derive element composition.</p> : null}
          </div>
        </GlassCard>

        <GlassCard color="green">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <GitBranch className="h-5 w-5 text-green-300" />
            Interaction graph
          </h3>
          <div className="space-y-3">
            <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
              <p className="text-sm font-medium text-white">Biological sources</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                {sourceSpecies.length > 0
                  ? sourceSpecies.slice(0, 8).join(", ")
                  : "Taxon-compound source links will populate from MINDEX once PubChem/ChemSpider joins are loaded."}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.045] p-3">
              <p className="text-sm font-medium text-white">Interactions and products</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                Reaction partners, precursors, byproducts, enzymes, thermodynamics, and evidence links will appear as
                the interaction graph fills in.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard color="cyan">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <FlaskConical className="h-5 w-5 text-cyan-300" />
            Compute adapters
          </h3>
          <div className="grid gap-2">
            {["OpenChemistry / RDKit", "DWSIM process simulator", "Cantera kinetics", "DNA / molecular computing"].map((item) => (
              <div key={item} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.045] px-3 py-2">
                <span className="text-sm text-white">{item}</span>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
                  adapter
                </Badge>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
