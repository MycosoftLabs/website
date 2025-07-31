import { AdvancedSearchForm } from "@/components/fungal-database/advanced-search-form"

export const metadata = {
  title: "Advanced Search | Fungal Database",
  description: "Search the fungal database with advanced filters and options",
}

export default function AdvancedSearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Advanced Search</h1>
        <p className="text-muted-foreground mt-1">Search the fungal database with advanced filters and options</p>
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-700 mt-4 rounded-full" />
      </div>

      <AdvancedSearchForm />
    </div>
  )
}
