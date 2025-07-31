import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function FungalDatabaseHeader() {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fungal Database Explorer</h1>
          <p className="text-muted-foreground mt-1">Explore comprehensive data on various fungal species</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/ancestry/fungal-database/advanced-search">
              <Search className="mr-2 h-4 w-4" />
              Advanced Search
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ancestry/fungal-database/visualization">Visualize Data</Link>
          </Button>
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-700 mt-4 rounded-full" />
    </div>
  )
}
