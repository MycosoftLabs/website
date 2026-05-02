"use client"

import dynamic from "next/dynamic"

function DevicesPortalChunkLoading() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="h-9 w-9 border-2 border-purple-500/25 border-t-purple-400 rounded-full animate-spin"
        aria-hidden
      />
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium text-foreground">Preparing Devices catalog&hellip;</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          First open in dev compiles a large client bundle (Framer Motion + neuromorphic UI). If this
          lasts more than a minute, check the terminal running{" "}
          <code className="text-foreground/90">npm run dev:next-only</code> for errors. Try{" "}
          <code className="text-foreground/90">npm run dev:next-turbo</code> for faster incremental builds.
        </p>
      </div>
    </div>
  )
}

/** `ssr: false` must live in a Client Component (Next 15). */
const DevicesPortalLazy = dynamic(
  () =>
    import("@/components/devices/devices-portal").then((mod) => ({
      default: mod.DevicesPortal,
    })),
  {
    ssr: false,
    loading: () => <DevicesPortalChunkLoading />,
  }
)

export default function DevicesPortalLoader() {
  return <DevicesPortalLazy />
}
