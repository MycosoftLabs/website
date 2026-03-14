import Link from "next/link"

const NAV_ITEMS = [
  { href: "/natureos/devices", label: "Manager" },
  { href: "/natureos/devices/registry", label: "Registry" },
  { href: "/natureos/devices/telemetry", label: "Telemetry" },
  { href: "/natureos/devices/alerts", label: "Alerts" },
  { href: "/natureos/devices/map", label: "Map" },
  { href: "/natureos/devices/insights", label: "Insights" },
  { href: "/natureos/devices/fleet", label: "Fleet" },
  { href: "/natureos/devices/onsite-ai", label: "On-Site AI" },
]

export function DeviceSubnav() {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border bg-background p-3 text-sm">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
