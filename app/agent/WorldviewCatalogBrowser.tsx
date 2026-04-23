"use client"

/**
 * Live catalog browser for /agent — Apr 23, 2026
 *
 * Fetches /api/worldview/v1/catalog + /api/worldview/v1/bundles and
 * renders a filterable table so agents (and humans) can see every
 * dataset + bundle + cost + scope without reading the source.
 *
 * Free endpoint — no auth required.
 */

import { useState, useEffect } from "react"

interface Dataset {
  id: string
  name: string
  category: string
  description: string
  scope: string
  cost_per_request_cents: number
  rate_weight: number
  cache_ttl_s: number
  response_shape: string
  supports: { bbox?: boolean; cursor?: boolean; time_range?: boolean; stream?: boolean; tile?: boolean; id_lookup?: boolean }
  example: string
}

interface Bundle {
  id: string
  name: string
  description: string
  datasets: string[]
  scope: string
  cost_per_request_cents: number
  rate_weight: number
  cache_ttl_s: number
  fetch_url: string
}

export default function WorldviewCatalogBrowser() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [scope, setScope] = useState<string>("all")
  const [tab, setTab] = useState<"datasets" | "bundles">("datasets")

  useEffect(() => {
    Promise.all([
      fetch("/api/worldview/v1/catalog").then((r) => r.json()),
      fetch("/api/worldview/v1/bundles").then((r) => r.json()),
    ])
      .then(([cat, bun]) => {
        setDatasets(cat.datasets || [])
        setBundles(bun.bundles || [])
        setLoading(false)
      })
      .catch((e) => {
        setErr(e?.message || "fetch failed")
        setLoading(false)
      })
  }, [])

  const filteredDatasets = datasets.filter((d) => {
    if (scope !== "all" && d.scope !== scope) return false
    if (!filter) return true
    const hay = `${d.id} ${d.name} ${d.description} ${d.category}`.toLowerCase()
    return filter.toLowerCase().split(/\s+/).every((tok) => hay.includes(tok))
  })

  const filteredBundles = bundles.filter((b) => {
    if (scope !== "all" && b.scope !== scope) return false
    if (!filter) return true
    const hay = `${b.id} ${b.name} ${b.description} ${b.datasets.join(" ")}`.toLowerCase()
    return filter.toLowerCase().split(/\s+/).every((tok) => hay.includes(tok))
  })

  if (loading) return <div className="text-sm text-zinc-400">Loading catalog…</div>
  if (err) return <div className="text-sm text-red-400">Catalog fetch failed: {err}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="filter datasets…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[180px] bg-zinc-900/50 border border-zinc-700 rounded px-2.5 py-1.5 text-sm text-white"
        />
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="bg-zinc-900/50 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
        >
          <option value="all">All scopes</option>
          <option value="public">Public</option>
          <option value="agent">Agent</option>
          <option value="fusarium">Fusarium</option>
          <option value="ops">Ops</option>
        </select>
        <div className="inline-flex rounded border border-zinc-700 overflow-hidden">
          <button
            onClick={() => setTab("datasets")}
            className={`px-3 py-1.5 text-xs transition-colors ${tab === "datasets" ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            Datasets ({filteredDatasets.length})
          </button>
          <button
            onClick={() => setTab("bundles")}
            className={`px-3 py-1.5 text-xs transition-colors ${tab === "bundles" ? "bg-cyan-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            Bundles ({filteredBundles.length})
          </button>
        </div>
      </div>

      {tab === "datasets" ? (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-900/60 text-zinc-400 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-left">Scope</th>
                  <th className="px-3 py-2 text-left">Supports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-900/40">
                    <td className="px-3 py-2 font-mono text-[11px] text-cyan-400 whitespace-nowrap">{d.id}</td>
                    <td className="px-3 py-2 text-white">{d.name}</td>
                    <td className="px-3 py-2 text-zinc-400 text-[11px]">{d.category}</td>
                    <td className="px-3 py-2 text-right text-white font-mono">{d.cost_per_request_cents}¢</td>
                    <td className="px-3 py-2 text-right text-zinc-400 font-mono">{d.rate_weight}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${scopeColor(d.scope)}`}>
                        {d.scope}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-zinc-500">
                      {[
                        d.supports.bbox && "bbox",
                        d.supports.cursor && "cursor",
                        d.supports.time_range && "time",
                        d.supports.stream && "sse",
                        d.supports.tile && "tile",
                        d.supports.id_lookup && "id",
                      ].filter(Boolean).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBundles.map((b) => (
            <div key={b.id} className="border border-zinc-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-cyan-400">{b.id}</div>
                  <div className="text-sm text-white font-semibold mt-0.5">{b.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{b.description}</div>
                  <div className="text-[10px] text-zinc-500 mt-2 flex gap-2 flex-wrap">
                    {b.datasets.map((d) => (
                      <span key={d} className="font-mono bg-zinc-900/60 rounded px-1.5 py-0.5">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${scopeColor(b.scope)}`}>
                    {b.scope}
                  </span>
                  <div className="text-sm text-white font-mono mt-1">{b.cost_per_request_cents}¢</div>
                  <div className="text-[10px] text-zinc-500">rate {b.rate_weight}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function scopeColor(scope: string): string {
  switch (scope) {
    case "public":  return "bg-zinc-700/30 text-zinc-300 border-zinc-600/50"
    case "agent":   return "bg-cyan-600/20 text-cyan-300 border-cyan-500/40"
    case "fusarium": return "bg-red-600/20 text-red-300 border-red-500/40"
    case "ops":     return "bg-amber-600/20 text-amber-300 border-amber-500/40"
    default:         return "bg-zinc-700/30 text-zinc-300 border-zinc-600/50"
  }
}
