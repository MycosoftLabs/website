/**
 * Shown while the RSC shell for /dashboard/crep is loading.
 * The map itself defers to CREPDashboardLoader (huge client chunk + WebGL).
 */
export default function CrepRouteLoading() {
  return (
    <div className="min-h-dvh bg-[#0a0f1e] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="h-9 w-9 border-2 border-cyan-500/25 border-t-cyan-400 rounded-full animate-spin"
        aria-hidden
      />
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium text-cyan-100/90">Loading CREP&hellip;</p>
        <p className="text-xs text-cyan-200/60 leading-relaxed">
          The map pack (WebGL, deck.gl, MapLibre) is very large. In local dev the first
          open can take 30&ndash;90s while Next compiles. After the first load, this route
          is faster. For daily CREP work you can use{" "}
          <code className="text-cyan-300/90">npm run dev:crep</code> on port 3020.
        </p>
      </div>
    </div>
  )
}
