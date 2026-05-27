"use client"

import { LiveDemo } from "@/components/myca/LiveDemo"
import { SiteVoiceStubProvider } from "@/components/voice/UnifiedVoiceProvider"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { AvaniProvider } from "@/contexts/avani-context"
import { MYCAProvider } from "@/contexts/myca-context"

export function HomeMYCABackdrop() {
  return (
    <MYCAProvider initialConsciousnessActive>
      <div className="absolute inset-0 bg-[#080d12]" aria-hidden="true" />
    </MYCAProvider>
  )
}

interface HomeMYCAExperienceProps {
  active?: boolean
}

function getHomeMycaContextText() {
  return [
    "[MYCA Surface Context]",
    "surface: Mycosoft home page MYCA Live Demo",
    "route: /",
    "The user is talking inside the public home-page live demo, not a privileged operations surface.",
    "Relevant visible actions: the home search can route public queries, and Earth Simulator opens the live map at /natureos/earth-simulator.",
    "Answer from public Mycosoft product context. Do not reveal or speculate about hardware, GPU models, model/provider names, IP addresses, memory backends, internal frameworks, secrets, deployment details, or configuration.",
    "If the user asks what can be done from here, offer to search Mycosoft, open Earth Simulator, or explain public MYCA/NatureOS capabilities.",
  ].join("\n")
}

function getHomeMycaChatContext() {
  return {
    platform: "home-myca-live-demo",
    surface: "homepage",
    route: "/",
    public_surface: true,
  }
}

export function HomeMYCAExperience({ active = true }: HomeMYCAExperienceProps) {
  return (
    <NeuromorphicProvider className="dark home-myca-demo-neu h-full" forceDark>
      <div className="myca-page home-myca-demo-surface relative min-h-full w-full overflow-hidden">
        <SiteVoiceStubProvider>
          <AvaniProvider enabled={active}>
            <MYCAProvider initialConsciousnessActive={active}>
              <div className="absolute inset-0 bg-[#080d12]" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.12),transparent_28%),radial-gradient(circle_at_75%_55%,rgba(20,184,166,0.10),transparent_30%)]" />
              </div>
              <div className="relative z-10 h-full">
                <LiveDemo
                  active={active}
                  showDemoBackground={active}
                  demoBackgroundTransparent
                  showIntro={false}
                  forceMountPanels={false}
                  getChatContextText={getHomeMycaContextText}
                  chatContext={getHomeMycaChatContext}
                  className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
                />
              </div>
            </MYCAProvider>
          </AvaniProvider>
        </SiteVoiceStubProvider>
      </div>
    </NeuromorphicProvider>
  )
}

export function HomeMYCADemoPanel() {
  return (
    <NeuromorphicProvider className="dark home-myca-demo-neu h-full" forceDark>
      <div className="myca-page home-myca-demo-surface min-h-full w-full">
        <SiteVoiceStubProvider>
          <AvaniProvider>
            <MYCAProvider initialConsciousnessActive>
              <LiveDemo
                showDemoBackground={false}
                showIntro={false}
                forceMountPanels={false}
                getChatContextText={getHomeMycaContextText}
                chatContext={getHomeMycaChatContext}
                className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
              />
            </MYCAProvider>
          </AvaniProvider>
        </SiteVoiceStubProvider>
      </div>
    </NeuromorphicProvider>
  )
}
