/**
 * Search route (server `page.tsx`): delegates to a client entry that loads the
 * heavy search UI with `next/dynamic` and `ssr: false` (required inside a client file in Next 15+).
 */

import { SearchClientEntry } from "./SearchClientEntry"
import { SearchQaArtifactApp } from "@/components/search/qa/SearchQaArtifactApp"
import { buildSearchQaArtifact } from "@/lib/search/search-qa-artifact"

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qaMode = params?.qa === "1" || params?.qa === "true"
  if (qaMode) {
    return <SearchQaArtifactApp initialPayload={buildSearchQaArtifact(2500)} />
  }

  return <SearchClientEntry />
}
