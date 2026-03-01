"use client"

export default function VizceralDemo() {
  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh] bg-black">
      <div className="absolute top-3 left-3 z-10 max-w-[320px] rounded-md border border-border bg-background/80 p-3 text-xs backdrop-blur">
        <div className="font-medium">Vizceral (Traffic Graphs)</div>
        <p className="mt-1 text-muted-foreground">
          WebGL traffic graph visualization. This library requires live network/flow data from
          your backend (no mock data). Use this tab to review the project and integration
          path before wiring it to CREP or Earth Engine feeds.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href="https://github.com/Netflix/vizceral"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded border border-border bg-background/70 px-2 text-[11px]"
          >
            View repo
          </a>
          <a
            href="https://github.com/Netflix/vizceral/blob/master/USAGE.md"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded border border-border bg-background/70 px-2 text-[11px]"
          >
            Usage guide
          </a>
        </div>
      </div>

      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Data-driven demo will render once a live feed is connected.
      </div>
    </div>
  )
}
