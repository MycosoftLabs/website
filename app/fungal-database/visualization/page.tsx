import { FungalDataVisualization } from "@/components/fungal-database/visualization"

export const metadata = {
  title: "Data Visualization | Fungal Database",
  description: "Visualize fungal data with interactive charts and graphs",
}

export default function VisualizationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Data Visualization</h1>
        <p className="text-muted-foreground mt-1">Explore fungal data through interactive visualizations</p>
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-700 mt-4 rounded-full" />
      </div>

      <FungalDataVisualization />
    </div>
  )
}
