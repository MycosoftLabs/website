import { notFound } from "next/navigation"
import { FUSARIUM_SECTIONS } from "@/components/fusarium/fusarium-catalog"
import { FusariumWorkspace } from "./fusarium-workspace"

/**
 * Every console workspace except the ones with their own folder.
 *
 * /fusarium/earth-simulator has an explicit route and wins over this dynamic
 * segment, so it is unaffected. Anything not in the catalog 404s rather than
 * rendering an empty shell for a page that does not exist.
 */
export const dynamic = "force-dynamic"

export default async function FusariumAppPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  for (const section of FUSARIUM_SECTIONS) {
    const item = section.items.find((i) => i.id === slug)
    if (item) return <FusariumWorkspace appId={item.id} title={item.title} section={section.title} />
  }

  notFound()
}
