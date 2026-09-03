"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Atom, CheckCircle2, FileJson, FlaskConical, LockKeyhole, Upload } from "lucide-react"

type Inspection = {
  state: string
  evidence: {
    name: string | null
    identifiers: Record<string, string | null>
    suppliedMolecularWeight: number | null
    provenance: { source: string | null; sourceRecordId: string | null; observedAt: string | null }
  }
  deterministicChecks: {
    formulaParsed: boolean
    atomCounts: Record<string, number> | null
    totalAtoms: number | null
    formulaDerivedMolarMass: number | null
    formulaDerivedMolarMassUnit: string | null
    weightDifferencePercent: number | null
  }
  warnings: string[]
  boundaries: Record<string, boolean>
}

const initial = {
  name: "",
  formula: "",
  molecularWeight: "",
  smiles: "",
  inchi: "",
  inchikey: "",
  source: "",
  sourceRecordId: "",
  observedAt: "",
}

export function CompoundEvidenceWorkbench() {
  const [form, setForm] = useState(initial)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function update(key: keyof typeof initial, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function inspect() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/fusarium/compound-analyser/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, molecularWeight: form.molecularWeight ? Number(form.molecularWeight) : undefined }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "Inspection failed.")
      setInspection(body)
    } catch (cause) {
      setInspection(null)
      setError(cause instanceof Error ? cause.message : "Inspection failed.")
    } finally {
      setBusy(false)
    }
  }

  async function importJson(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.size > 16_384) return setError("Import exceeds the 16 KiB local limit.")
    try {
      const body = JSON.parse(await file.text()) as Record<string, unknown>
      setForm(Object.fromEntries(Object.keys(initial).map((key) => [key, body[key] == null ? "" : String(body[key])])) as typeof initial)
      setInspection(null)
    } catch {
      setError("Import must be a single JSON compound evidence object.")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const inputClass = "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400/50"

  return (
    <main className="min-h-full bg-[#070b0a] p-4 text-zinc-100 lg:p-6" data-compound-evidence-workbench>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-emerald-400/20 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300"><Atom className="h-4 w-4" /> Fusarium · evidence inspection</div>
          <h1 className="text-2xl font-semibold">Compound Analyser</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">Inspect supplied molecular identifiers, formula composition, and provenance without contacting external services or claiming a molecular simulation.</p>
        </div>
        <Link href="/fusarium" className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm hover:border-emerald-400/40">Back to Fusarium</Link>
      </header>

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        {[
          ["MINDEX", "UNAVAILABLE", "No authenticated source read"],
          ["RDKit", "UNBOUND", "No structure engine"],
          ["AutoDock", "UNBOUND", "No docking engine"],
          ["GROMACS", "UNBOUND", "No dynamics engine"],
        ].map(([name, state, note]) => <div key={name} className="rounded-lg border border-amber-400/20 bg-amber-950/10 p-3"><div className="text-xs text-zinc-500">{name}</div><div className="mt-1 font-mono text-sm text-amber-300">{state}</div><div className="mt-1 text-xs text-zinc-500">{note}</div></div>)}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <section className="rounded-xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold">Evidence record</h2><p className="text-xs text-zinc-500">All fields are operator supplied. Nothing is saved.</p></div>
            <div>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importJson(event.target.files?.[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs hover:border-emerald-400/40"><Upload className="h-4 w-4" /> Import JSON locally</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["name", "Compound name"], ["formula", "Formula (simple notation)"], ["molecularWeight", "Supplied molecular weight (g/mol)"], ["inchikey", "InChIKey"],
              ["smiles", "SMILES"], ["inchi", "InChI"], ["source", "Provenance source"], ["sourceRecordId", "Source record ID"], ["observedAt", "Evidence timestamp"],
            ] as const).map(([key, label]) => <label key={key} className={key === "smiles" || key === "inchi" ? "sm:col-span-2" : ""}><span className="mb-1 block text-xs text-zinc-400">{label}</span><input className={inputClass} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}
          </div>
          <button type="button" disabled={busy} onClick={() => void inspect()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md !bg-emerald-400 px-4 py-2 font-semibold !text-black hover:!bg-emerald-300 disabled:opacity-50"><FlaskConical className="h-4 w-4" /> {busy ? "Inspecting…" : "Run deterministic inspection"}</button>
          {error ? <div className="mt-3 rounded-md border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-300">{error}</div> : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl">
          <h2 className="font-semibold">Inspection output</h2>
          {!inspection ? <div className="mt-8 text-center text-zinc-500"><FileJson className="mx-auto mb-3 h-10 w-10 opacity-50" /><p>No inspection has been run.</p><p className="mt-1 text-xs">Provide a formula or identifier and provenance where available.</p></div> : <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Formula parsed" value={inspection.deterministicChecks.formulaParsed ? "YES" : "NO"} />
              <Metric label="Total atoms" value={inspection.deterministicChecks.totalAtoms?.toLocaleString() ?? "—"} />
              <Metric label="Formula-derived mass" value={inspection.deterministicChecks.formulaDerivedMolarMass == null ? "—" : `${inspection.deterministicChecks.formulaDerivedMolarMass} g/mol`} />
              <Metric label="Weight difference" value={inspection.deterministicChecks.weightDifferencePercent == null ? "—" : `${inspection.deterministicChecks.weightDifferencePercent}%`} />
            </div>
            {inspection.deterministicChecks.atomCounts ? <div className="rounded-lg border border-white/10 bg-black/20 p-3"><div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Element counts</div><div className="flex flex-wrap gap-2">{Object.entries(inspection.deterministicChecks.atomCounts).map(([element, count]) => <span key={element} className="rounded border border-emerald-400/20 bg-emerald-950/20 px-2 py-1 font-mono text-sm text-emerald-200">{element} {count}</span>)}</div></div> : null}
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"><div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Provenance</div><div>{inspection.evidence.provenance.source || "Not supplied"}</div><div className="text-xs text-zinc-500">{inspection.evidence.provenance.sourceRecordId || "No source record ID"}</div></div>
            {inspection.warnings.length ? <div className="rounded-lg border border-amber-400/25 bg-amber-950/10 p-3 text-sm text-amber-200"><div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Evidence warnings</div><ul className="space-y-1 text-xs">{inspection.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div> : <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-950/10 p-3 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" /> No bounded inspection warnings.</div>}
          </div>}
          <div className="mt-5 rounded-lg border border-sky-400/20 bg-sky-950/10 p-3 text-xs text-sky-200"><div className="mb-1 flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" /> Scientific boundary</div>This checks notation and arithmetic only. It does not confirm identity, structure, activity, toxicity, binding, stability, or efficacy. No simulation or write occurs.</div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-black/20 p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 font-mono text-lg text-emerald-200">{value}</div></div>
}
