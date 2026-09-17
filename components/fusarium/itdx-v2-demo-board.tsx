"use client"

import { useCallback, useEffect, useState } from "react"
import { GlassButton, GlassChip } from "@/components/ui/glass-button"
import { TRAIL_GLASS_PANEL, TrailGlassSection } from "@/components/fusarium/trail-glass-dock"
import { WekaCampaignPanel } from "@/components/fusarium/weka-campaign-panel"
import { LocalWekaPanel } from "@/components/fusarium/local-weka-panel"

interface Connectivity {
  mode?: "ONLINE" | "OFFLINE_LOCAL_WEKA"
  banner?: string
  mas?: { ok?: boolean; status?: number | null; ms?: number; error?: string | null }
  mindex?: { ok?: boolean; status?: number | null; ms?: number; error?: string | null }
}

interface NlmHonesty {
  bind?: string
  forecast_p?: null
  belief?: { model_loaded?: boolean; abstained?: boolean; weights_sha256?: string | null; parameter_count?: number | null }
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
    void fetch("/api/fusarium/itdx/connectivity")
      .then((r) => r.json())
      .then((json) => {
        setConnectivity(json)
        if (json.mode === "ONLINE") {
          void fetch("/api/fusarium/bluesight-trail/nlm")
            .then((n) => n.json())
            .then(setNlm)
            .catch(() => setNlm({ bind: "UNBOUND", forecast_p: null }))
        } else {
          setNlm({ bind: "UNBOUND", forecast_p: null })
        }
      })
      .catch(() => setConnectivity({ mode: "OFFLINE_LOCAL_WEKA", banner: "OFFLINE LOCAL WEKA" }))
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, 20000)
    return () => window.clearInterval(id)
  }, [refresh])

  const mode = connectivity?.mode ?? "OFFLINE_LOCAL_WEKA"
  const isOnline = mode === "ONLINE"

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
        <span>WEKA ≠ NLM · probe ≤ 1.5s</span>
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
            Glass rail, overhead map, FormSpace cells, Brain-style footholds vs object perimeters. Overlay contrast is a
            sibling pass — do not treat this iframe as a finished screenshot.
          </p>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <iframe
              title="BlueSight Trail AR"
              src="/natureos/bluesight-trail"
              className="h-[70vh] min-h-[420px] w-full bg-black"
            />
          </div>
        </TrailGlassSection>

        <TrailGlassSection
          id="nlm"
          title="FormSpace / NLM honesty"
          peek={`${isOnline ? "ONLINE" : "OFFLINE"} · bind ${nlm?.bind ?? "UNBOUND"} · p null`}
          open={dock.nlm}
          onToggle={() => toggle("nlm")}
        >
          <p className="font-mono">
            NLM {nlm?.bind ?? "UNBOUND"} · loaded {String(nlm?.belief?.model_loaded ?? false)} · abstain{" "}
            {String(nlm?.belief?.abstained ?? true)} · params {nlm?.belief?.parameter_count ?? "—"}
          </p>
          <p className="break-all font-mono text-[10px] text-zinc-500">
            weights {nlm?.belief?.weights_sha256 ?? "unbound offline or not yet fetched"}
          </p>
          <p className="text-zinc-500">
            Offline does not invent p. WEKA classify/cluster/filter is not NLM skill. forecast_p stays null.
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
