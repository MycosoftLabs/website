import { FusariumCatalogBrowser } from "@/components/fusarium/personnel/personnel-panels"

export const metadata = { title: "Personnel catalog | Fusarium", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default function FusariumPersonnelPage() {
  return <FusariumCatalogBrowser />
}
