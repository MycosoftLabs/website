"use client"

export default function XnoHubDemo() {
  return (
    <div className="absolute inset-0 w-full h-full min-h-[60vh] bg-black">
      <div className="absolute top-3 left-3 z-10 max-w-[260px] rounded-md border border-border bg-background/80 p-2 text-xs backdrop-blur">
        <div className="font-medium">XNOHub Globe (Live)</div>
        <p className="mt-1 text-muted-foreground">
          Live 3D globe demo from XNOHub. If the embed is blocked, open it in a new tab.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href="https://xnohub.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded border border-border bg-background/70 px-2 text-[11px]"
          >
            Open live demo
          </a>
          <a
            href="https://github.com/dalindev/XNOHub.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center rounded border border-border bg-background/70 px-2 text-[11px]"
          >
            View repo
          </a>
        </div>
      </div>

      <iframe
        title="XNOHub Globe Demo"
        src="https://xnohub.com"
        className="h-full w-full"
        allow="fullscreen; autoplay; clipboard-read; clipboard-write"
      />
    </div>
  )
}
