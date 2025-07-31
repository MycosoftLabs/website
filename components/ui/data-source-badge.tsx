import { Badge } from "@/components/ui/badge"
import { InfoIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DataSourceBadgeProps {
  source: "iNaturalist" | "ChemSpider" | "PubChem" | "Elsevier" | "MycoBank" | "FungiDB" | "Mycosoft"
}

export function DataSourceBadge({ source }: DataSourceBadgeProps) {
  const tooltipContent = {
    iNaturalist: "Data from the iNaturalist citizen science platform",
    ChemSpider: "Chemical data from the Royal Society of Chemistry's ChemSpider database",
    PubChem: "Chemical data from the National Institutes of Health's PubChem database",
    Elsevier: "Research papers from Elsevier's scientific database",
    MycoBank: "Taxonomic data from the MycoBank fungal database",
    FungiDB: "Genomic and functional data from the FungiDB database",
    Mycosoft: "Data curated by Mycosoft from multiple sources including research on over 10,000 mushroom species",
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="secondary" className="gap-1">
            <InfoIcon className="h-3 w-3" />
            {source}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent[source]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
