import { redirect } from "next/navigation"

export default async function LegacyAncestrySpeciesNamePage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  redirect(`/fusarium/life-database/species/name/${encodeURIComponent(name)}`)
}
