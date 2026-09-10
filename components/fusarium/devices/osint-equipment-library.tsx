"use client"

import { useEffect, useState } from "react"
import { PUBLIC_OSINT_EQUIPMENT } from "@/lib/fusarium/osint/public-equipment-library"

interface RegistryRow {
  id: string
  name?: string
  source?: string
  status?: string
}

export function OsintEquipmentLibrary() {
  const [onHandIds, setOnHandIds] = useState<Set<string>>(new Set())
  const [liveCount, setLiveCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/earth-simulator/devices?refresh=1", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { devices?: RegistryRow[] } | null) => {
        if (cancelled || !payload?.devices) return
        const live = payload.devices.filter((row) => {
          const source = String(row.source || "")
          const status = String(row.status || "").toLowerCase()
          return ["live", "mas", "operator", "mindex"].includes(source)
            && (status === "online" || status === "connected")
        })
        setLiveCount(live.length)
        setOnHandIds(new Set(live.map((row) => row.id)))
      })
      .catch(() => {
        if (!cancelled) setLiveCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mt-4 min-w-0 rounded-xl border border-cyan-400/20 bg-slate-950/70 p-4 text-slate-100">
      <h2 className="text-base font-semibold">OSINT equipment library</h2>
      <p className="mt-2 text-sm text-slate-400">
        Public manufacturer / encyclopedia class cards only. These are <strong>not on-hand</strong> unless the live MAS / MINDEX registry names the same device.
        {liveCount === 0 ? " Live registry: no online devices." : liveCount == null ? "" : ` Live registry: ${liveCount} online device(s).`}
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {PUBLIC_OSINT_EQUIPMENT.map((card) => {
          const onHand = onHandIds.has(card.id)
          return (
            <li key={card.id} className="min-h-[44px] rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{card.name}</strong>
                <span className={onHand ? "text-emerald-300" : "text-amber-200"}>
                  {onHand ? "On-hand (registry)" : "OSINT / not on-hand"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{card.class} · {card.manufacturer}</p>
              <p className="mt-2 text-sm">{card.publicPayload}</p>
              <p className="mt-2 text-xs text-slate-500">Source: {card.source}. Classified specs: {card.classifiedSpecs}.</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
