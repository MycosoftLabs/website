import Link from 'next/link'
import { MYCAFloatingButton } from "@/components/myca/MYCAFloatingButton"

const scientificNav = [
  { href: '/scientific', label: 'Overview' },
  { href: '/scientific/lab', label: 'Laboratory' },
  { href: '/scientific/simulation', label: 'Simulations' },
  { href: '/scientific/experiments', label: 'Experiments' },
  { href: '/scientific/bio', label: 'Bio Interfaces' },
  { href: '/scientific/memory', label: 'Memory' },
]

export default function ScientificLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh">
      <aside className="w-64 border-r bg-muted/40 p-4 hidden lg:block">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Scientific</h2>
          <p className="text-sm text-muted-foreground">MYCA Research Platform</p>
        </div>
        <nav className="space-y-1">
          {scientificNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 p-3 border rounded-lg bg-background">
          <h3 className="text-sm font-medium mb-2">Quick Stats</h3>
          <div className="text-xs text-muted-foreground">
            No data available yet.
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
      <MYCAFloatingButton
        title="MYCA Scientific Assistant"
        className="right-auto left-4"
      />
    </div>
  )
}
