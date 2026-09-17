"use client"

import { useCallback, useEffect, useState } from "react"
import { BlueSightTrailLab } from "@/components/fusarium/bluesight-trail-lab"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import { TRAIL_GLASS_PANEL, TrailGlassSection } from "@/components/fusarium/trail-glass-dock"
import { WekaCampaignPanel } from "@/components/fusarium/weka-campaign-panel"
import { LocalWekaPanel } from "@/components/fusarium/local-weka-panel"
import { nlmServiceChip } from "@/lib/fusarium/bluesight/formspace-nlm"

interface Connectivity {
  mode?: "ONLINE" | "OFFLINE_LOCAL_WEKA"
  banner?: string
  wan_status?: "WAN_DOWN" | "WAN_UNPROBED"
  forecast_status?: "FORECAST_ABSTAIN"
  nlm?: {
    ok?: boolean
    bind?: string
    nlm_status?: string
    model_loaded?: boolean
    weights_sha256?: string | null
    weight_count?: number | null
    parameter_count?: number | null
  }
  mas?: { ok?: boolean; status?: number | null; ms?: number; error?: string | null }
  mindex?: { ok?: boolean; status?: number | null; ms?: number; error?: string | null }
}

interface NlmHonesty {
  bind?: string
  nlm_status?: string
  forecast_p?: null
  forecast_status?: "FORECAST_ABSTAIN"
  weight_count?: number | null
  weights_sha256?: string | null
  belief?: {
    model_loaded?: boolean
    abstained?: boolean
    weights_sha256?: string | null
    parameter_count?: number | null
  }
}

export function ItdxV2DemoBoard() {
  const [connectivity, setConnectivity] = useState<Connectivity | null>(null)
  const [nlm, setNlm] = useState<NlmHonesty | null>(null)
  const [dock, setDock] = useState({
    trail: true,
    nlm: true,
    wekaCampaign: true,
    localWeka: true,
    clock: false,
  })

  const refresh = useCallback(() => {
    const forceOffline =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("force") === "offline"
    void fetch(`/api/fusarium/itdx/connectivity${forceOffline ? "?force=offline" : ""}`)
      .then((r) => r.json())
      .then(setConnectivity)
      .catch(() => setConnectivity({ mode: "OFFLINE_LOCAL_WEKA", banner: "OFFLINE LOCAL WEKA", wan_status: "WAN_DOWN" }))
    void fetch("/api/fusarium/bluesight-trail/nlm")
      .then((n) => n.json())
      .then(setNlm)
      .catch(() => setNlm({ bind: "MAS_NLM_DOWN", nlm_status: "MAS_NLM_DOWN", forecast_p: null }))
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 20000)
    return () => window.clearInterval(id)
  }, [refresh])

  const mode = connectivity?.mode ?? "OFFLINE_LOCAL_WEKA"
  const isOnline = mode === "ONLINE"
  const modelLoaded = Boolean(nlm?.belief?.model_loaded ?? connectivity?.nlm?.model_loaded)
  const nlmChip = nlmServiceChip({
    nlm_status: nlm?.nlm_status ?? connectivity?.nlm?.nlm_status,
    bind: nlm?.bind ?? connectivity?.nlm?.bind,
    model_loaded: modelLoaded,
  })
  const nlmDown = nlmChip.includes("MAS_NLM_DOWN")
  const weightsSha = nlm?.belief?.weights_sha256 ?? nlm?.weights_sha256 ?? connectivity?.nlm?.weights_sha256 ?? null
  const weightCount = nlm?.weight_count ?? connectivity?.nlm?.weight_count ?? null
  const parameterCount = nlm?.belief?.parameter_count ?? connectivity?.nlm?.parameter_count ?? null

  function toggle(id: keyof typeof dock) {
    setDock((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-dvh bg-[#031018] text-zinc-100">
      <div className="border-b border-amber-400/50 bg-amber-500/15 px-4 py-2 text-xs sm:text-sm">
        <strong className="tracking-widest">LOCAL DEMO</strong>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="tracking-widest">SYNTHETIC EXERCISE</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono">live: false</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono">forecast_p: null</span>
      </div>
      <div className={`border-b px-4 py-2 text-xs sm:text-sm ${isOnline ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-white/5"}`}>
        <strong className="tracking-widest">{connectivity?.banner ?? "OFFLINE LOCAL WEKA"}</strong>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono">MAS {connectivity?.mas?.ok ? "bound" : "unbound"}</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono">MINDEX {connectivity?.mindex?.ok ? "bound" : "unbound"}</span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono" data-testid="itdx-v2-wan-chip">
          {connectivity?.wan_status ?? "WAN_UNPROBED"}
        </span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className={`font-mono ${nlmDown ? "text-red-300" : "text-cyan-200"}`} data-testid="itdx-v2-nlm-chip">
          {nlmChip}
        </span>
        <span className="mx-2 text-zinc-500">·</span>
        <span className="font-mono" data-testid="itdx-v2-forecast-chip">
          {connectivity?.forecast_status ?? nlm?.forecast_status ?? "FORECAST_ABSTAIN"}
        </span>
        <span className="mx-2 text-zinc-500">·</span>
        <span>WEKA ≠ NLM · probe ≤ 3.5s</span>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4">
        <section className={TRAIL_GLASS_PANEL}>
          <GlassChip>ITDX 2.0 demo board</GlassChip>
          <p className="mt-2 text-sm text-zinc-300">
            Fusarium-integrated local demo. Online uses MAS 188 / MINDEX 189 / NLM / campaign BFFs. Offline still
            scores Mycosoft ARFFs with local Java + weka.jar. Visibility pass in flight on 3010.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <GlassButton href="/natureos/bluesight-trail">Open Trail AR (ungated)</GlassButton>
            <GlassButton href="/fusarium/itdx">Open Fusarium ITDX lab</GlassButton>
            <GlassButton onClick={refresh}>Re-probe backends</GlassButton>
          </div>
        </section>

        <TrailGlassSection
          id="trail"
          title="Trail AR"
          peek="SIMULATION · live: false · two clocks (source fps vs overlay)"
          open={dock.trail}
          onToggle={() => toggle("trail")}
        >
          <p>
            In-page player (not a nested iframe). Glass rail, overhead map, footholds vs object perimeters. Overlay
            clocks: source fps vs overlay Hz. live: false.
          </p>
          <div
            data-testid="itdx-v2-trail-player"
            className="min-h-[420px] overflow-visible rounded-xl border border-white/10 bg-black"
          >
            {dock.trail ? <BlueSightTrailLab surface="natureos" embed /> : null}
          </div>
        </TrailGlassSection>

        <TrailGlassSection
          id="nlm"
          title="FormSpace / NLM honesty"
          peek={`${isOnline ? "ONLINE" : "OFFLINE"} · ${nlmChip} · p null`}
          open={dock.nlm}
          onToggle={() => toggle("nlm")}
        >
          <p className="font-mono" data-testid="itdx-v2-nlm-rail">
            {nlmChip} · live: false · forecast_p: null ·{" "}
            {nlm?.forecast_status ?? "FORECAST_ABSTAIN"} / AVANI PAUSE · loaded{" "}
            {String(nlm?.belief?.model_loaded ?? false)} · weights {weightCount ?? "—"} · params{" "}
            {nlm?.belief?.parameter_count ?? "—"}
          </p>
          <p className="break-all font-mono text-[10px] text-zinc-500">
            loaded sha {weightsSha ?? "sha not yet reported"}
          </p>
          <p className="text-zinc-500">
            Null p is abstain, not a missing NLM. WAN_DOWN / force=offline still binds LAN MAS 188{" "}
            <span className="font-mono">/api/nlm</span>. Only MAS_NLM_DOWN means NLM is not running. WEKA ≠ NLM.
          </p>
        </TrailGlassSection>

        <WekaCampaignPanel open={dock.wekaCampaign} onToggle={() => toggle("wekaCampaign")} />
        <LocalWekaPanel open={dock.localWeka} onToggle={() => toggle("localWeka")} />

        <TrailGlassSection
          id="clock"
          title="Fusarium scenario clock"
          peek="NOT_SUPPLIED on this tree · Trail AR video clock is the demo clock"
          open={dock.clock}
          onToggle={() => toggle("clock")}
        >
          <p>
            Scenario-sim BFF is not in this working tree. The demo clock is the Trail AR replay (source fps vs overlay
            Hz). Civil / non-US Part B stays later. Fort Stewart AO is SYNTHETIC EXERCISE if mentioned.
          </p>
        </TrailGlassSection>
      </div>
    </div>
  )
}
