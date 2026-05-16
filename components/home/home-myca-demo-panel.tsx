"use client"

import { LiveDemo } from "@/components/myca/LiveDemo"
import { MYCALiveDemoBackground } from "@/components/myca/MYCALiveDemoBackground"
import { SiteVoiceStubProvider } from "@/components/voice/UnifiedVoiceProvider"
import { NeuromorphicProvider } from "@/components/ui/neuromorphic"
import { AvaniProvider } from "@/contexts/avani-context"
import { MYCAProvider } from "@/contexts/myca-context"

export function HomeMYCABackdrop() {
  return (
    <MYCAProvider initialConsciousnessActive>
      <MYCALiveDemoBackground className="opacity-80" transparent={false} />
    </MYCAProvider>
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
                className="min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-start"
              />
            </MYCAProvider>
          </AvaniProvider>
        </SiteVoiceStubProvider>
      </div>
    </NeuromorphicProvider>
  )
}
