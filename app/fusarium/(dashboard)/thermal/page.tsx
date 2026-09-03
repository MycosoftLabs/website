import type { Metadata } from "next"
import { ThermalDashboard } from "@/components/fusarium/sensing/thermal-dashboard"

export const metadata: Metadata = {
  title: "Thermal Field Laboratory | Fusarium",
  description: "Radiometric thermal sequence validation, visualization, differential analysis, and evidence export.",
}

export default function FusariumThermalPage() {
  return <ThermalDashboard />
}
