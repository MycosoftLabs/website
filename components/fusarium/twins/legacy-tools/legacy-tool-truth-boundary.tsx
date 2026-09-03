"use client"

import Link from "next/link"
import { ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

export type FusariumLegacyToolId = "retrosynthesis" | "digital-twin" | "physics-sim"

interface FusariumLegacyToolTruthBoundaryProps {
  children: ReactNode
  toolId: FusariumLegacyToolId
}

const TOOL_TRUTH = {
  retrosynthesis: {
    eyebrow: "Fusarium chemistry evidence boundary",
    title: "Retrosynthesis",
    mode: "LOCKED",
    providerState: "CONTENT WITHHELD",
    summary:
      "The inherited NatureOS demonstration is not mounted because it contains unreviewed synthesis and cultivation details. A future Fusarium chemistry workflow must be evidence-bounded and separately approved.",
    replacements: [
      ["Pathway design for target compounds with MINDEX context.", "Bundled illustrative pathways; MINDEX and NLM are not probed by this page."],
      ["Connected to NatureOS, MAS, MINDEX, and MycoBrain telemetry.", "Provider state is declared by the Fusarium boundary above; this mounted page implies no connection."],
      ["NLM Chemistry Layer", "BUNDLED ILLUSTRATIVE DATA"],
      ["Analyzing biosynthetic pathway...", "Loading bundled illustrative pathway..."],
      ["Querying MINDEX and NLM chemistry modules", "No provider call; using the bundled local example"],
      ["Pathway analysis in progress", "Illustrative pathway only"],
      ["Check MINDEX for updated information", "MINDEX is not probed by this page"],
      ["The NLM chemistry layer integrates with MINDEX compound data and", "This frozen page does not call NLM, MINDEX, or ChemSpider; its bundled examples and"],
      ["ChemSpider to provide accurate pathway predictions.", "fixed illustrative values are unverified and must not be treated as pathway predictions."],
      ["Export Pathway Data", "Export control unavailable"],
      ["Open in Alchemy Lab", "Alchemy Lab handoff unavailable"],
      ["Open in Genetic Circuit", "Genetic Circuit handoff unavailable"],
    ],
  },
  "digital-twin": {
    eyebrow: "Fusarium passive twin-read boundary",
    title: "Digital Twin",
    mode: "LIVE READ SEAM",
    providerState: "UNBOUND / NOT PROBED",
    summary:
      "No device or provider is connected at mount time. A Fusarium-local adapter may issue a passive same-origin GET for an operator-supplied device ID; an HTTP response alone does not prove identity, freshness, calibration, or a synchronized digital twin.",
    replacements: [
      ["Real-time device synchronization powered by MycoBrain telemetry.", "Passive device read seam; provider, identity, freshness, and synchronization are unbound until verified."],
      ["Connected to NatureOS, MAS, MINDEX, and MycoBrain telemetry.", "Provider state is declared by the Fusarium boundary above; this mounted page implies no connection."],
      ["No telemetry data available. Connect a device to view live readings.", "No validated telemetry is present. A successful, typed same-origin read is required before values render."],
      ["No digital twin state available. Connect a device to view synchronization data.", "No validated twin state is present. Provider reachability does not prove synchronization."],
      ["Connecting...", "Checking same-origin read..."],
      ["Disconnected", "UNBOUND / NOT PROBED"],
      ["Connected", "HTTP RESPONSE RECEIVED"],
      ["Connect", "Check read seam"],
      ["Auto-update", "Repeat passive read"],
    ],
  },
  "physics-sim": {
    eyebrow: "Fusarium simulation truth boundary",
    title: "Physics Simulator",
    mode: "SIMULATED",
    providerState: "NO SOLVER OR FIELD PROVIDER",
    summary:
      "This frozen NatureOS page produces unseeded client-side random values after local delays. It does not run a quantum solver, force field, weather source, geomagnetic model, lunar ephemeris, or calibrated fruiting forecast.",
    replacements: [
      ["Physics-based modeling for NatureOS environments.", "Client-side stochastic demonstration; all generated values are SIMULATED."],
      ["Connected to NatureOS, MAS, MINDEX, and MycoBrain telemetry.", "Provider state is declared by the Fusarium boundary above; this mounted page implies no connection."],
      ["NLM Physics Layer", "STOCHASTIC CLIENT DEMO"],
      ["QISE Engine • Molecular Dynamics • Field Physics", "SIMULATED samples • no solver • no field provider"],
      ["Configure and run quantum-inspired molecular simulations", "Generate unseeded illustrative molecular values in the browser"],
      ["Computing Quantum States...", "Generating simulated values..."],
      ["Quantum-Inspired Eigensolver Output", "Synthetic quantum-inspired result sample"],
      ["Molecular Dynamics Trajectory", "Synthetic coordinate sample"],
      ["Tensor Network Decomposition", "Synthetic tensor-network sample"],
      ["Analyze geomagnetic, lunar, and atmospheric influences on fungal growth", "Generate random illustrative field values; no environmental source is queried"],
      ["Fetching Field Data...", "Generating simulated field values..."],
      ["Analyze Field Conditions", "Generate Simulated Field Conditions"],
      ["Fruiting Prediction", "Simulated Fruiting Value"],
      ["Fruiting Probability", "Simulated Probability"],
      ["Optimal Date", "Simulated Date"],
      ["About QISE", "About this stochastic demo"],
      ["(Quantum-Inspired Simulation Engine) uses variational", "(legacy label) does not run a quantum solver here; it uses client-side random"],
      ["algorithms to approximate quantum ground states on classical hardware.", "values to produce illustrative outputs only."],
      ["decompose molecular systems into manageable", "are represented by a synthetic client-side placeholder rather than a tensor decomposition;"],
      ["matrices for systems up to 50+ atoms.", "no molecular system is computed."],
      ["simulates atomic motion using classical", "produces random coordinate samples here; no classical"],
      ["force fields for real-time trajectory analysis.", "force field or real-time analysis is executed."],
      ["Export Data", "Export unavailable"],
    ],
  },
} as const

function rewritePayloadLabels(root: Node, replacements: readonly (readonly [string, string])[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()

  while (node) {
    const original = node.nodeValue ?? ""
    let rewritten = original
    for (const [source, target] of replacements) rewritten = rewritten.replaceAll(source, target)
    if (rewritten !== original) node.nodeValue = rewritten
    node = walker.nextNode()
  }

  if (!(root instanceof Element)) return
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("[aria-label], [title]")]) {
    for (const attribute of ["aria-label", "title"]) {
      const original = element.getAttribute(attribute)
      if (!original) continue
      let rewritten = original
      for (const [source, target] of replacements) rewritten = rewritten.replaceAll(source, target)
      if (rewritten !== original) element.setAttribute(attribute, rewritten)
    }
  }

  const unavailableControls = new Set([
    "Export control unavailable",
    "Alchemy Lab handoff unavailable",
    "Genetic Circuit handoff unavailable",
    "Export unavailable",
  ])
  for (const button of root.querySelectorAll<HTMLButtonElement>("button")) {
    if (!unavailableControls.has(button.textContent?.trim() ?? "")) continue
    if (!button.disabled) button.disabled = true
    if (button.getAttribute("aria-disabled") !== "true") button.setAttribute("aria-disabled", "true")
    if (!button.hasAttribute("data-fusarium-unavailable-control")) {
      button.setAttribute("data-fusarium-unavailable-control", "")
    }
    if (button.title !== "Unavailable in this bounded Fusarium mount") {
      button.title = "Unavailable in this bounded Fusarium mount"
    }
  }
}

export function FusariumLegacyToolTruthBoundary({
  children,
  toolId,
}: FusariumLegacyToolTruthBoundaryProps) {
  const payloadRef = useRef<HTMLDivElement>(null)
  const [rewriteReady, setRewriteReady] = useState(false)
  const truth = TOOL_TRUTH[toolId]

  useEffect(() => {
    const payload = payloadRef.current
    if (!payload) return

    let observer: MutationObserver | null = null
    let maintenanceTimer: number | null = null
    let cancelled = false

    setRewriteReady(false)

    const rewrite = (root: Node) => rewritePayloadLabels(root, truth.replacements)
    const start = () => {
      if (cancelled) return
      rewrite(payload)
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "characterData") rewrite(record.target.parentNode ?? record.target)
          if (record.type === "attributes") rewrite(record.target)
          for (const node of record.addedNodes) rewrite(node)
        }
      })
      observer.observe(payload, {
        attributes: true,
        attributeFilter: ["aria-label", "title"],
        characterData: true,
        childList: true,
        subtree: true,
      })
      maintenanceTimer = window.setInterval(() => rewrite(payload), 500)
      setRewriteReady(true)
    }

    // The inherited payload remains hidden and non-interactive through SSR and
    // hydration. Rewrite its truth labels first, then expose it in one render.
    // This prevents stale provider claims and enabled unavailable controls from
    // appearing during the former delayed post-hydration rewrite window.
    start()

    return () => {
      cancelled = true
      if (maintenanceTimer !== null) window.clearInterval(maintenanceTimer)
      observer?.disconnect()
    }
  }, [truth])

  return (
    <section
      className="min-h-full w-full"
      data-fusarium-legacy-tool={toolId}
      data-provider-state={truth.providerState}
      data-truth-mode={truth.mode}
    >
      <header className="border-b border-emerald-300/20 bg-[#07110d] px-4 py-4 text-zinc-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {truth.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{truth.title}</h1>
            <p className="mt-2 max-w-5xl text-sm leading-6 text-zinc-300">{truth.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Mounted tool truth state">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                Mode · {truth.mode}
              </span>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
                Provider · {truth.providerState}
              </span>
              <span className="rounded-full border border-zinc-500/40 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                UNCLASSIFIED
              </span>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Fusarium tool navigation">
            <Link
              href="/fusarium/tools"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 text-sm font-bold text-emerald-100 hover:bg-emerald-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Tools Hub
            </Link>
            <Link
              href="/fusarium"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-300 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> Fusarium overview
            </Link>
          </nav>
        </div>
      </header>
      <div
        ref={payloadRef}
        aria-hidden={rewriteReady ? undefined : "true"}
        data-fusarium-legacy-payload={toolId}
        data-rewrite-ready={rewriteReady ? "true" : "false"}
        hidden={!rewriteReady}
      >
        {children}
      </div>
    </section>
  )
}
