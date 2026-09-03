import { redirect } from "next/navigation"

export default async function FusariumLifeDatabaseTaxonomyRoute({ params }: { params: Promise<{ rank: string; name: string }> }) {
  const { name } = await params
  redirect(`/fusarium/life-database/explorer?search=${encodeURIComponent(name)}`)
}
