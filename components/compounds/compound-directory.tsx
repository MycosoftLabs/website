import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Compound } from "@/lib/data/compounds"

interface CompoundDirectoryProps {
  compounds: Compound[]
}

export function CompoundDirectory({ compounds }: CompoundDirectoryProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {compounds.map((compound) => (
        <Card key={compound.id}>
          <CardHeader>
            <CardTitle>{compound.name}</CardTitle>
            <CardDescription>{compound.formula}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{compound.description}</p>
              <div className="flex flex-wrap gap-2">
                {compound.chemicalClass && <Badge variant="secondary">{compound.chemicalClass}</Badge>}
              </div>
              {compound.molecularWeight && (
                <p className="text-sm">
                  <span className="font-medium">Molecular Weight:</span> {compound.molecularWeight}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
