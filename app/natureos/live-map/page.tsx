"use client";

/**
 * Live Device Map - deck.gl visualization for device fleet tracking
 * 
 * This page dynamically imports the map content to avoid SSR/build issues
 * with deck.gl and luma.gl dependencies.
 * 
 * Route: /natureos/live-map
 */

import dynamic from "next/dynamic";

// Dynamically import the entire map content to avoid deck.gl SSR issues
const LiveMapContent = dynamic(
  () => import("@/components/maps/LiveMapContent").then((mod) => mod.LiveMapContent),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Loading Live Map...</div>
      </div>
    ),
  }
);

export default function LiveMapPage() {
  return <LiveMapContent />;
}
