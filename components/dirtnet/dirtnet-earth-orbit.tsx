"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Network } from "lucide-react"
import { ProductIcon } from "@/components/brand/product-icon"
import { GlassButton } from "@/components/ui/glass-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DIRTNET_ORBIT_DEVICES,
  type DirtNetOrbitDevice,
} from "@/components/dirtnet/dirtnet-devices"
import { cn } from "@/lib/utils"

function polarPosition(angleDeg: number, radiusPercent: number) {
  const rad = (angleDeg * Math.PI) / 180
  const x = 50 + radiusPercent * Math.cos(rad)
  const y = 50 + radiusPercent * Math.sin(rad)
  return { left: `${x}%`, top: `${y}%` }
}

function OrbitNode({
  device,
  angleDeg,
  onSelect,
  delay,
}: {
  device: DirtNetOrbitDevice
  angleDeg: number
  onSelect: (device: DirtNetOrbitDevice) => void
  delay: number
}) {
  const prefersReducedMotion = useReducedMotion()
  const pos = polarPosition(angleDeg, 38)

  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={pos}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, delay }}
    >
      <button
        type="button"
        onClick={() => onSelect(device)}
        className={cn(
          "group flex min-h-[44px] min-w-[44px] flex-col items-center gap-1.5 rounded-2xl border border-black/10 bg-white/55 p-2",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl",
          "transition hover:scale-105 hover:bg-white/75",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
          "dark:border-white/20 dark:bg-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_32px_rgba(0,0,0,0.45)] dark:hover:bg-white/16"
        )}
        aria-label={`Open ${device.name} DirtNet details`}
      >
        <span className="myco-glass-tile flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
          <ProductIcon
            product={device.product}
            variant="glass"
            className="h-9 w-9 sm:h-10 sm:w-10"
            title={device.name}
          />
        </span>
        <span className="hidden max-w-[5.5rem] text-center text-[10px] font-medium leading-tight text-foreground/80 sm:block">
          {device.name}
        </span>
      </button>
    </motion.div>
  )
}

export function DirtNetEarthOrbit() {
  const [selected, setSelected] = useState<DirtNetOrbitDevice | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const devices = useMemo(() => DIRTNET_ORBIT_DEVICES, [])
  const step = 360 / devices.length

  return (
    <>
      <div className="relative mx-auto w-full max-w-3xl">
        {/* Desktop / tablet orbit */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-[36rem] md:block">
          <div className="absolute inset-[12%] rounded-full border border-black/10 dark:border-white/15" />
          <div className="absolute inset-[22%] rounded-full border border-dashed border-black/10 dark:border-white/12" />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.55),transparent_58%)] dark:bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.08),transparent_60%)]" />

          {!prefersReducedMotion ? (
            <motion.div
              className="pointer-events-none absolute inset-[18%] rounded-full border border-black/5 dark:border-white/10"
              animate={{ rotate: 360 }}
              transition={{ duration: 90, ease: "linear", repeat: Infinity }}
            />
          ) : null}

          {devices.map((device, index) => (
            <OrbitNode
              key={device.id}
              device={device}
              angleDeg={index * step - 90}
              onSelect={setSelected}
              delay={0.08 * index}
            />
          ))}

          <div className="absolute left-1/2 top-1/2 z-10 flex w-[42%] max-w-[11rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
            <Link
              href="/natureos/earth-simulator"
              className="group flex min-h-[44px] w-full flex-col items-center gap-2 rounded-full border border-black/10 bg-white/70 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_20px_40px_rgba(15,23,42,0.14)] backdrop-blur-2xl transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/16"
            >
              <ProductIcon
                product="earth-simulator"
                variant="glass"
                className="h-16 w-16 sm:h-20 sm:w-20"
                title="Earth Simulator"
              />
              <span className="text-xs font-semibold tracking-wide text-foreground">Earth</span>
              <span className="text-[10px] text-muted-foreground">Open Earth Simulator</span>
            </Link>
          </div>
        </div>

        {/* Mobile: center Earth + touch grid */}
        <div className="md:hidden">
          <div className="mx-auto mb-6 flex max-w-xs flex-col items-center gap-3 rounded-3xl border border-black/10 bg-white/55 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_36px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/20 dark:bg-white/10">
            <ProductIcon
              product="earth-simulator"
              variant="glass"
              className="h-20 w-20"
              title="Earth Simulator"
            />
            <p className="text-sm font-semibold">Earth at the center</p>
            <p className="text-xs text-muted-foreground">
              Tap a device to see how it joins DirtNet.
            </p>
            <GlassButton href="/natureos/earth-simulator" dataAnalytics="dirtnet_mobile_earth">
              Earth Simulator
            </GlassButton>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {devices.map((device) => (
              <button
                key={device.id}
                type="button"
                onClick={() => setSelected(device)}
                className="flex min-h-[44px] flex-col items-center gap-2 rounded-2xl border border-black/10 bg-white/50 p-3 text-center backdrop-blur-xl transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/16"
              >
                <span className="myco-glass-tile flex h-12 w-12 items-center justify-center">
                  <ProductIcon
                    product={device.product}
                    variant="glass"
                    className="h-8 w-8"
                    title={device.name}
                  />
                </span>
                <span className="text-xs font-medium leading-tight">{device.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="myco-glass-surface max-h-[90dvh] overflow-y-auto border-black/10 dark:border-white/20 sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <div className="mb-3 flex items-center gap-3">
                  <span className="myco-glass-tile flex h-12 w-12 items-center justify-center">
                    <ProductIcon
                      product={selected.product}
                      variant="glass"
                      className="h-8 w-8"
                      title={selected.name}
                    />
                  </span>
                  <div>
                    <DialogTitle>{selected.name}</DialogTitle>
                    <DialogDescription>{selected.tagline}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/5">
                <Image
                  src={selected.image}
                  alt={selected.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 512px"
                />
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <div>
                  <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Network className="h-3.5 w-3.5" />
                    What it does
                  </h3>
                  <p className="text-foreground/90">{selected.whatItDoes}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    DirtNet contribution
                  </h3>
                  <p className="text-foreground/90">{selected.dirtNetRole}</p>
                </div>
              </div>

              <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-start">
                <GlassButton href={selected.href} dataAnalytics={`dirtnet_device_${selected.id}`}>
                  Open {selected.name}
                </GlassButton>
                <GlassButton onClick={() => setSelected(null)}>Close</GlassButton>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
