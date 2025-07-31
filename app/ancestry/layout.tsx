import type React from "react"

export default function AncestryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 text-white p-2 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Fungal Ancestry</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/natureos" className="text-sm font-medium text-foreground/80 hover:text-green-600">
              NatureOS
            </a>
            <a href="/ancestry/fungal-database" className="text-sm font-medium text-foreground/80 hover:text-green-600">
              Explorer
            </a>
            <a
              href="/ancestry/phylogeny-viewer"
              className="text-sm font-medium text-foreground/80 hover:text-green-600"
            >
              Phylogeny
            </a>
            <a href="/ancestry/fungal-database" className="text-sm font-medium text-foreground/80 hover:text-green-600">
              Database
            </a>
            <a
              href="/natureos/apps/ancestry?tab=tools"
              className="text-sm font-medium text-foreground/80 hover:text-green-600"
            >
              Tools
            </a>
          </nav>
          <button className="md:hidden p-2 text-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-background border-t py-6 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-foreground/70">© {new Date().getFullYear()} Mycosoft Fungal Ancestry</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-sm text-foreground/70 hover:text-green-600">
                Privacy
              </a>
              <a href="#" className="text-sm text-foreground/70 hover:text-green-600">
                Terms
              </a>
              <a href="#" className="text-sm text-foreground/70 hover:text-green-600">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
