import { redirect } from "next/navigation"

export default async function LegacyAncestryTaxonomyPage({
  params,
}: {
  params: Promise<{ rank: string; name: string }>
}) {
  const { rank, name } = await params
  redirect(
    `/fusarium/life-database/taxonomy/${encodeURIComponent(rank)}/${encodeURIComponent(name)}`,
  )
}
