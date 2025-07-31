import type { TaxonomicClassification } from "@/types/fungi"

interface FungiTaxonomyProps {
  taxonomy: TaxonomicClassification
}

export function FungiTaxonomy({ taxonomy }: FungiTaxonomyProps) {
  const taxonomyLevels = [
    { level: "Kingdom", value: taxonomy.kingdom },
    { level: "Phylum", value: taxonomy.phylum },
    { level: "Class", value: taxonomy.class },
    { level: "Order", value: taxonomy.orderName },
    { level: "Family", value: taxonomy.family },
    { level: "Genus", value: taxonomy.genus },
    { level: "Species", value: taxonomy.species },
  ]

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <table className="w-full">
          <tbody>
            {taxonomyLevels.map((item, index) => (
              <tr key={item.level} className={`${index % 2 === 0 ? "bg-muted/50" : ""}`}>
                <td className="py-2 px-4 font-medium">{item.level}</td>
                <td className="py-2 px-4 text-muted-foreground">
                  {item.level === "Species" ? <span className="italic">{item.value}</span> : item.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-muted rounded-md">
        <h3 className="font-medium mb-2">Taxonomic Hierarchy</h3>
        <div className="flex flex-col items-center">
          {taxonomyLevels.map((item, index) => (
            <div key={item.level} className="text-center">
              <div className="bg-card px-4 py-2 rounded-md border shadow-sm">
                {item.level === "Species" ? <span className="italic">{item.value}</span> : item.value}
              </div>
              {index < taxonomyLevels.length - 1 && <div className="h-6 w-0.5 bg-muted-foreground/30 mx-auto" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
