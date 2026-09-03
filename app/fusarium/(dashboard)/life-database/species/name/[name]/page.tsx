import { redirect } from "next/navigation"

export default async function FusariumLifeDatabaseNameRoute({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  redirect(`/fusarium/life-database/explorer?search=${encodeURIComponent(name)}`)
}
