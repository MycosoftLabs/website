"use client"

import { useState } from "react"
import { DeviceMovementPanel } from "./device-movement-panel"

/**
 * Earth Simulator mechanical/C2 panel. Map overlays are painted by CREP
 * layer toggles so this host does not mount a second live COP.
 */
export function EarthSimMovementHost() {
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-none absolute bottom-3 left-2 right-2 z-20 max-w-xl pb-[env(safe-area-inset-bottom)] md:left-3 md:right-auto">
      <div className="pointer-events-auto max-h-[46vh] overflow-y-auto overflow-x-hidden overscroll-contain">
        <button
          type="button"
          className="mb-2 min-h-[44px] min-w-[44px] rounded-md border border-cyan-400/30 bg-slate-950/90 px-3 text-base text-cyan-100 touch-manipulation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide movement / C2" : "Show movement / C2"}
        </button>
        {open ? <DeviceMovementPanel compact title="Earth Sim movement" /> : null}
      </div>
    </div>
  )
}
