"use client";

import dynamic from "next/dynamic";

const EarthSimulatorContainer = dynamic(
  () =>
    import("@/components/earth-simulator/earth-simulator-container").then((m) => ({
      default: m.EarthSimulatorContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        Loading Earth Simulator...
      </div>
    ),
  }
);

export default function EarthSimulatorPage() {
  return (
    <div className="w-full h-screen bg-black text-white">
      <EarthSimulatorContainer />
    </div>
  );
}
