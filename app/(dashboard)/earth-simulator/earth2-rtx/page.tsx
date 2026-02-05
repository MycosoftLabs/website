/**
 * Earth-2 RTX Visualization Page - February 5, 2026
 *
 * Full-page Earth-2 RTX visualization with NVIDIA Omniverse integration.
 */

import { Metadata } from "next";
import Earth2HybridView from "@/components/earth2/Earth2HybridView";

export const metadata: Metadata = {
  title: "Earth-2 RTX | Mycosoft",
  description:
    "NVIDIA Earth-2 visualization with RTX rendering and AI weather models",
};

export default function Earth2RTXPage() {
  return (
    <div className="w-full h-screen bg-black">
      <Earth2HybridView
        initialMode="hybrid"
        showControls={true}
      />
    </div>
  );
}
