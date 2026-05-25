"use client"

import { MYCALiveActivityChordDiagram } from "@/components/myca/MYCALiveActivityChordDiagram"
import { MYCAChatWidget } from "@/components/myca/MYCAChatWidget"
import { MYCALiveDemoGlassStyles } from "@/components/myca/MYCALiveDemoGlassStyles"
import { MYCAProvider, useMYCA } from "@/contexts/myca-context"

function MYCAChordDemoSurface() {
  const { sessionId } = useMYCA()

  if (!sessionId) {
    return (
      <div className="myca-page myca-live-demo mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <div className="rounded-[8px] border border-white/20 bg-white/[0.025] p-8 text-white/70 backdrop-blur-md">
          Preparing live MYCA session...
        </div>
      </div>
    )
  }

  return (
    <div className="myca-page myca-live-demo mx-auto flex w-full max-w-[1560px] flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/70">
            MYCA live activity prototype
          </p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
            Chord interaction test
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/62">
          This surface uses live MYCA context and real system endpoints. Send a message to add
          live response flow on top of the audited system wiring.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <MYCALiveActivityChordDiagram height={760} />
        <MYCAChatWidget
          active
          title="Talk to MYCA"
          className="h-[760px] min-h-[620px] border border-white/22 bg-white/[0.025] text-white xl:sticky xl:top-20"
        />
      </div>
    </div>
  )
}

export function MYCAChordDemoClient() {
  return (
    <MYCAProvider initialConsciousnessActive>
      <MYCALiveDemoGlassStyles />
      <MYCAChordDemoSurface />
    </MYCAProvider>
  )
}
