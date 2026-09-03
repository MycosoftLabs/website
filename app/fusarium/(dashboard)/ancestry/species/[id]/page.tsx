import { redirect } from "next/navigation"

export default async function LegacyAncestrySpeciesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/fusarium/life-database/species/${encodeURIComponent(id)}`)
}
