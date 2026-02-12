"use client";

import { useEffect } from "react";

/**
 * Dashboard Layout
 * 
 * Provides a fullscreen layout for dashboard pages like CREP.
 * Hides the global header and footer for a clean fullscreen experience.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Add class to hide header/footer on mount
    document.body.classList.add("dashboard-fullscreen");
    document.documentElement.classList.add("dashboard-fullscreen");
    
    // Clean up on unmount
    return () => {
      document.body.classList.remove("dashboard-fullscreen");
      document.documentElement.classList.remove("dashboard-fullscreen");
    };
  }, []);

  return <>{children}</>;
}
