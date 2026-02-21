"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

interface ChemicalParamsPanelProps {
  compounds: Record<string, number>
  enzymes: Record<string, boolean>
  onCompoundChange: (compound: string, concentration: number) => void
  onEnzymeToggle: (enzyme: string, enabled: boolean) => void
}

export function ChemicalParamsPanel({
  compounds,
  enzymes,
  onCompoundChange,
  onEnzymeToggle,
}: ChemicalParamsPanelProps) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Chemical Simulation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Object.entries(compounds).map(([compound, value]) => (
            <div key={compound} className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                {compound.replace(/_/g, " ")}
                <span className="font-mono">{value.toFixed(2)}</span>
              </Label>
              <Slider
                value={[value]}
                min={0}
                max={100}
                step={0.5}
                onValueChange={([next]) => onCompoundChange(compound, next)}
              />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Object.entries(enzymes).map(([enzyme, enabled]) => (
            <div key={enzyme} className="flex items-center justify-between gap-2">
              <Label className="text-xs">{enzyme.replace(/_/g, " ")}</Label>
              <Switch checked={enabled} onCheckedChange={(next) => onEnzymeToggle(enzyme, next)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
