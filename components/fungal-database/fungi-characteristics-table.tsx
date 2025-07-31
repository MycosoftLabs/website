import type { FungiCharacteristics } from "@/types/fungi"

interface FungiCharacteristicsTableProps {
  characteristics: FungiCharacteristics
}

export function FungiCharacteristicsTable({ characteristics }: FungiCharacteristicsTableProps) {
  const characteristicRows = [
    { label: "Cap Shape", value: characteristics?.capShape },
    { label: "Cap Surface", value: characteristics?.capSurface },
    { label: "Cap Color", value: characteristics?.capColor },
    { label: "Bruises", value: characteristics?.bruises ? "Yes" : "No" },
    { label: "Odor", value: characteristics?.odor },
    { label: "Gill Attachment", value: characteristics?.gillAttachment },
    { label: "Gill Spacing", value: characteristics?.gillSpacing },
    { label: "Gill Color", value: characteristics?.gillColor },
    { label: "Stalk Shape", value: characteristics?.stalkShape },
    { label: "Stalk Root", value: characteristics?.stalkRoot },
    { label: "Stalk Surface Above Ring", value: characteristics?.stalkSurfaceAboveRing },
    { label: "Stalk Surface Below Ring", value: characteristics?.stalkSurfaceBelowRing },
    { label: "Stalk Color Above Ring", value: characteristics?.stalkColorAboveRing },
    { label: "Stalk Color Below Ring", value: characteristics?.stalkColorBelowRing },
    { label: "Veil Type", value: characteristics?.veilType },
    { label: "Veil Color", value: characteristics?.veilColor },
    { label: "Ring Number", value: characteristics?.ringNumber?.toString() ?? "0" },
    { label: "Ring Type", value: characteristics?.ringType },
    { label: "Spore Print Color", value: characteristics?.sporePrintColor },
    { label: "Population", value: characteristics?.population },
    { label: "Substrate", value: characteristics?.substrate },
  ]

  return (
    <div className="border rounded-md">
      <table className="w-full">
        <tbody>
          {characteristicRows.map((row, index) => (
            <tr key={row.label} className={`${index % 2 === 0 ? "bg-muted/50" : ""}`}>
              <td className="py-2 px-4 font-medium">{row.label}</td>
              <td className="py-2 px-4 text-muted-foreground">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
