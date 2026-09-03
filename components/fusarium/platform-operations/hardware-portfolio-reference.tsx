"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Boxes, ChevronDown, ChevronUp, Cpu, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react"
import type {
  HardwarePortfolioDeviceV1,
  HardwarePortfolioV1,
  PortfolioClaimState,
  PortfolioComputeTopologyEdgeV1,
  PortfolioComputeTopologyNodeV1,
  PortfolioSensorCapabilityV1,
  ProtocolReferenceV1,
  PortfolioSystemIntegrationReferenceV1,
  PortfolioTopologyEdgeV1,
} from "@/lib/fusarium/device-capabilities/hardware-portfolio-v3"

type LoadState = "loading" | "available" | "unavailable"

interface HardwarePortfolioEnvelope {
  state: "available"
  portfolio: HardwarePortfolioV1
  protocols: readonly ProtocolReferenceV1[]
  sharedSensing: {
    label: string
    declaredModalities: readonly string[]
    rule: string
  }
  consumerContract: HardwarePortfolioV1["consumerBinding"]
  consumerView: null
  installationAuthority: string
  mutationAuthority: false
}

const claimTone: Record<PortfolioClaimState, string> = {
  "declared-baseline": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "declared-optional": "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  "variant-dependent": "border-violet-400/30 bg-violet-400/10 text-violet-200",
  proposed: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  future: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200",
  unknown: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
}

const stateLabel: Record<PortfolioClaimState, string> = {
  "declared-baseline": "Baseline",
  "declared-optional": "Optional",
  "variant-dependent": "Variant",
  proposed: "Proposed",
  future: "Future",
  unknown: "Unknown",
}

function isPortfolioEnvelope(value: unknown): value is HardwarePortfolioEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  const portfolio = row.portfolio as Record<string, unknown> | undefined
  return row.state === "available"
    && Boolean(portfolio)
    && Array.isArray(portfolio?.devices)
    && Array.isArray(portfolio?.sensorCapabilities)
    && Array.isArray(portfolio?.computeTopologyNodes)
    && Array.isArray(portfolio?.computeTopologyEdges)
    && Boolean(row.consumerContract)
}

export function HardwarePortfolioReference() {
  const [state, setState] = useState<LoadState>("loading")
  const [envelope, setEnvelope] = useState<HardwarePortfolioEnvelope | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const load = useCallback(async () => {
    setState("loading")
    setReason(null)
    try {
      const response = await fetch("/api/fusarium/hardware-portfolio", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok || !isPortfolioEnvelope(body)) {
        setEnvelope(null)
        setState("unavailable")
        setReason(`The protected hardware reference is unavailable (HTTP ${response.status}).`)
        return
      }
      setEnvelope(body)
      setSelectedId((current) => current ?? body.portfolio.devices[0]?.id ?? null)
      setState("available")
    } catch {
      setEnvelope(null)
      setState("unavailable")
      setReason("The protected hardware reference could not be read.")
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const devices = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle || !envelope) return envelope?.portfolio.devices ?? []
    return envelope.portfolio.devices.filter((device) =>
      [device.label, device.id, device.deviceClass, ...device.variants]
        .some((value) => value.toLowerCase().includes(needle)),
    )
  }, [envelope, query])
  const selected = envelope?.portfolio.devices.find((device) => device.id === selectedId) ?? devices[0] ?? null
  const selectedSensors = selected && envelope
    ? envelope.portfolio.sensorCapabilities.filter((capability) => capability.deviceId === selected.id)
    : []
  const selectedComputeNodes = selected && envelope
    ? envelope.portfolio.computeTopologyNodes.filter((node) => node.deviceId === selected.id)
    : []
  const selectedComputeEdges = selected && envelope
    ? envelope.portfolio.computeTopologyEdges.filter((edge) => edge.deviceId === selected.id)
    : []

  return (
    <section aria-labelledby="hardware-portfolio-heading" className="mt-3 rounded-2xl border border-emerald-400/20 bg-black/55 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-4xl">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/75">Versioned device reference</p>
          <h2 id="hardware-portfolio-heading" className="mt-1 flex items-center gap-2 text-lg font-black"><Boxes size={18} className="text-emerald-300" />Hardware portfolio baseline</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">This reference describes supported device families, variants, interfaces, and candidate sensors for DIRTNet, MDP, and MMP integration. It never claims that a component is installed or online.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={state === "loading"} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw size={14} className={state === "loading" ? "animate-spin" : ""} />Refresh reference</button>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs font-bold">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{expanded ? "Collapse" : "Expand"}</button>
        </div>
      </div>

      {state === "unavailable" ? <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100"><TriangleAlert size={17} className="shrink-0" /><p>{reason} No installed device state is inferred.</p></div> : null}
      {state === "loading" ? <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4 text-xs text-zinc-400">Loading the owner-gated hardware reference…</div> : null}

      {expanded && envelope ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="rounded-xl border border-white/10 bg-zinc-950/70 p-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2">
              <Search size={14} className="text-zinc-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Filter hardware families" placeholder="Filter devices or variants" className="min-w-0 flex-1 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-600" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500"><span>Device families</span><span>{devices.length}</span></div>
            <div className="mt-2 grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
              {devices.map((device) => <DeviceChoice key={device.id} device={device} selected={device.id === selected?.id} onSelect={() => setSelectedId(device.id)} />)}
              {devices.length === 0 ? <p className="rounded-lg border border-white/5 bg-black/35 p-3 text-xs text-zinc-500">No reference family matches this filter.</p> : null}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
              <Fact label="Schema" value={envelope.portfolio.schema} />
              <Fact label="Contract revision" value={envelope.portfolio.version} />
              <Fact label="Source version" value={envelope.portfolio.source.sourceVersion} />
              <Fact label="Effective date" value={envelope.portfolio.effectiveDate} />
              <Fact label="Commercial handling" value={envelope.portfolio.commercialConfidentiality.replaceAll("_", " ")} />
              <Fact label="National-security class" value={envelope.portfolio.nationalSecurityClassification} />
            </div>
            <ConsumerBindingReference binding={envelope.consumerContract} />
            {selected ? <DeviceDetail device={selected} protocols={envelope.protocols} sensorCapabilities={selectedSensors} computeNodes={selectedComputeNodes} computeEdges={selectedComputeEdges} /> : null}
            <PortfolioTopologyReference edges={envelope.portfolio.topologyEdges} devices={envelope.portfolio.devices} />
            <SystemIntegrationReference references={envelope.portfolio.systemIntegrationReferences} devices={envelope.portfolio.devices} />
            <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-cyan-300" /><h3 className="text-xs font-black uppercase tracking-wider text-cyan-100">Shared {envelope.sharedSensing.label} options</h3></div>
              <div className="mt-2 flex flex-wrap gap-1.5">{envelope.sharedSensing.declaredModalities.map((modality) => <span key={modality} className="rounded-full border border-cyan-400/20 bg-black/35 px-2 py-1 text-[10px] text-cyan-100">{modality}</span>)}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{envelope.sharedSensing.rule}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ConsumerBindingReference({ binding }: { binding: HardwarePortfolioV1["consumerBinding"] }) {
  return (
    <section className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3" aria-labelledby="portfolio-consumer-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="portfolio-consumer-heading" className="text-xs font-black uppercase tracking-wider text-sky-100">Reference consumption boundary</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Device Manager, DIRTNet, MDP, and MMP may join this reference only through an exact canonical <code className="text-sky-200">portfolioFamilyId</code>. Names, device types, and capability lists never infer a family.</p>
        </div>
        <span className="rounded-full border border-sky-400/25 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-sky-200">Read only · no mutation</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{binding.compatibleConsumers.map((consumer) => <span key={consumer} className="rounded-full border border-sky-400/20 bg-black/35 px-2 py-1 text-[10px] text-sky-100">{consumer}</span>)}</div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{binding.installedMergeRule}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{binding.revisionRule}</p>
    </section>
  )
}

function endpointLabel(endpoint: PortfolioTopologyEdgeV1["from"], devices: readonly HardwarePortfolioDeviceV1[]) {
  if (endpoint.kind === "device-family") return devices.find((device) => device.id === endpoint.id)?.label ?? endpoint.id
  if (endpoint.kind === "shared-sensing-stack") return "BlueSight"
  return endpoint.id === "dirtnet" ? "DIRTNet" : "Fleet"
}

function PortfolioTopologyReference({ edges, devices }: { edges: readonly PortfolioTopologyEdgeV1[]; devices: readonly HardwarePortfolioDeviceV1[] }) {
  return (
    <section className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3" aria-labelledby="portfolio-topology-heading">
      <h3 id="portfolio-topology-heading" className="text-xs font-black uppercase tracking-wider text-emerald-100">DIRTNet and fleet topology claims</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Typed edges from the source portfolio. Every edge is a declared reference with deployment not observed; this is not a live network map.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {edges.map((edge) => (
          <div key={edge.id} className="rounded-lg border border-white/5 bg-black/35 p-3">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-zinc-100">
              <span>{endpointLabel(edge.from, devices)}</span><span className="text-emerald-300/70">→</span><span>{endpointLabel(edge.to, devices)}</span>
            </div>
            <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-emerald-200/70">{edge.scope} · {edge.relation}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{edge.note}</p>
            <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-amber-200/75">Source claim · deployment not observed</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SystemIntegrationReference({ references, devices }: { references: readonly PortfolioSystemIntegrationReferenceV1[]; devices: readonly HardwarePortfolioDeviceV1[] }) {
  return (
    <section className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-3" aria-labelledby="portfolio-systems-heading">
      <h3 id="portfolio-systems-heading" className="text-xs font-black uppercase tracking-wider text-violet-100">System and integration references</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Compatibility and architecture claims only. These records establish no deployed service, transport, credentials, synchronization, update path, or command authority.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {references.map((reference) => {
          const deviceLabels = reference.deviceRefs.map((id) => devices.find((device) => device.id === id)?.label ?? id)
          return (
            <div key={reference.id} className="rounded-lg border border-white/5 bg-black/35 p-3">
              <div className="flex items-start justify-between gap-2"><strong className="text-xs text-zinc-100">{reference.label}</strong><span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-violet-200">{reference.kind}</span></div>
              <p className="mt-1 text-[10px] text-zinc-500">{reference.expandedName ?? "Canonical product name"}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{reference.role} {reference.note}</p>
              <p className="mt-2 text-[9px] uppercase tracking-wider text-zinc-500">Scope: {reference.topologyScopes.join(", ") || "portfolio"}{deviceLabels.length ? ` · ${deviceLabels.join(", ")}` : ""}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-amber-200/75">Source claim · deployment not observed</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DeviceChoice({ device, selected, onSelect }: { device: HardwarePortfolioDeviceV1; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className={`rounded-lg border p-3 text-left transition ${selected ? "border-emerald-400/35 bg-emerald-400/10" : "border-white/5 bg-black/35 hover:border-white/15"}`}><span className="block text-xs font-black text-zinc-100">{device.label}</span><span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">{device.deviceClass}</span><span className="mt-2 block text-[9px] font-black uppercase tracking-wider text-amber-200/75">Declared reference · not observed</span></button>
}

function DeviceDetail({
  device,
  protocols,
  sensorCapabilities,
  computeNodes,
  computeEdges,
}: {
  device: HardwarePortfolioDeviceV1
  protocols: readonly ProtocolReferenceV1[]
  sensorCapabilities: readonly PortfolioSensorCapabilityV1[]
  computeNodes: readonly PortfolioComputeTopologyNodeV1[]
  computeEdges: readonly PortfolioComputeTopologyEdgeV1[]
}) {
  const relevantProtocols = protocols.filter((protocol) => device.protocolRefs.includes(protocol.id))
  const nodeLabel = (nodeRef: string) => computeNodes.find((node) => node.id === nodeRef)?.label ?? nodeRef
  return (
    <article className="mt-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{device.id}</p><h3 className="mt-1 flex items-center gap-2 text-lg font-black"><Cpu size={17} className="text-emerald-300" />{device.label}</h3><p className="mt-1 text-xs text-zinc-400">{device.deviceClass}</p></div><span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-200">Portfolio claim only</span></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{device.variants.map((variant) => <span key={variant} className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-zinc-300">{variant}</span>)}</div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
        {device.components.map((claim) => <div key={claim.id} className="rounded-lg border border-white/5 bg-black/35 p-3"><div className="flex items-start justify-between gap-2"><p className="text-xs font-bold text-zinc-100">{claim.label}</p><span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${claimTone[claim.claimState]}`}>{stateLabel[claim.claimState]}</span></div><p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{claim.category}{claim.model ? ` · ${claim.model}` : ""}</p><p className="mt-2 text-[11px] leading-relaxed text-zinc-400">{claim.note}</p></div>)}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-violet-400/15 bg-violet-400/5 p-3"><h4 className="text-[10px] font-black uppercase tracking-wider text-violet-200">Protocol references</h4>{relevantProtocols.map((protocol) => <p key={protocol.id} className="mt-2 text-[11px] leading-relaxed text-zinc-400"><strong className="text-zinc-200">{protocol.label}:</strong> {protocol.role} {protocol.note}</p>)}</div>
        <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 p-3"><h4 className="text-[10px] font-black uppercase tracking-wider text-amber-200">Configuration gaps</h4><ul className="mt-2 grid gap-2 text-[11px] leading-relaxed text-zinc-400">{device.unresolved.map((item) => <li key={item}>• {item}</li>)}</ul></div>
      </div>
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <section className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3" aria-label={`${device.label} normalized sensing claims`}>
          <div className="flex items-center justify-between gap-2"><h4 className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Normalized sensor capabilities</h4><span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{sensorCapabilities.length} claims</span></div>
          {sensorCapabilities.length ? <div className="mt-2 flex flex-wrap gap-1.5">{sensorCapabilities.map((capability) => <span key={capability.id} title={`${capability.componentRef} · ${capability.claimState}`} className="rounded-full border border-cyan-400/20 bg-black/35 px-2 py-1 text-[10px] text-cyan-100">{capability.capabilityId}</span>)}</div> : <p className="mt-2 text-[11px] text-zinc-500">No normalized sensing claim is declared for this family.</p>}
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">Every entry remains source-document claim, installation not observed, and adapter unbound.</p>
        </section>
        <section className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-3" aria-label={`${device.label} compute and control topology`}>
          <div className="flex items-center justify-between gap-2"><h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Compute and control topology</h4><span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Reference only</span></div>
          {computeNodes.length ? <div className="mt-2 flex flex-wrap gap-1.5">{computeNodes.map((node) => <span key={node.id} className={`rounded-full border px-2 py-1 text-[10px] ${claimTone[node.claimState]}`}>{node.label} · {stateLabel[node.claimState]}</span>)}</div> : <p className="mt-2 text-[11px] text-zinc-500">No multi-processor topology is declared for this family.</p>}
          {computeEdges.map((edge) => <div key={edge.id} className="mt-2 rounded-md border border-white/5 bg-black/35 p-2"><p className="text-[10px] font-bold text-zinc-200">{nodeLabel(edge.fromNodeRef)} <span className="text-emerald-300/70">→</span> {nodeLabel(edge.toNodeRef)}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-amber-200/75">{edge.relation} · {stateLabel[edge.claimState]} · not observed</p><p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{edge.note}</p></div>)}
        </section>
      </div>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3"><span className="text-[9px] font-black uppercase tracking-wider text-zinc-600">{label}</span><strong className="mt-1 block break-words text-xs text-zinc-200">{value}</strong></div>
}
