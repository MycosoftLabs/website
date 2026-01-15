/**
 * Dashboard Layout
 * 
 * Provides a layout wrapper for dashboard pages like CREP.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="w-full">{children}</div>
}
