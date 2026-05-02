/**
 * Shown while the /devices RSC shell resolves.
 * The interactive catalog defers to a lazy-loaded client chunk (DevicesPortal).
 */
export default function DevicesRouteLoading() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="h-9 w-9 border-2 border-purple-500/25 border-t-purple-400 rounded-full animate-spin"
        aria-hidden
      />
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium text-foreground">Loading Devices&hellip;</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This page bundles a large interactive catalog (animations, imagery). On the first visit in local
          dev, Next.js may compile that chunk for 20&ndash;60s. Subsequent visits are faster.
        </p>
      </div>
    </div>
  )
}
