"use client";

import dynamic from "next/dynamic";

/**
 * Psathyrella Buoy — Ground Control Station.
 * The console is a heavy WebGL/canvas client surface, so it is loaded
 * client-only (ssr:false) and rendered full-bleed over the site chrome.
 */
const PsathyrellaConsole = dynamic(
  () => import("@/components/psathyrella/PsathyrellaConsole").then((m) => m.PsathyrellaConsole),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#04070e] text-cyan-300">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em]">
          <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
          Booting Psathyrella GCS…
        </div>
      </div>
    ),
  }
);

export default function PsathyrellaGcsPage() {
  return <PsathyrellaConsole />;
}
