import { SearchQaArtifactApp } from "@/components/search/qa/SearchQaArtifactApp"
import { buildSearchQaArtifact } from "@/lib/search/search-qa-artifact"

export const dynamic = "force-dynamic"

export default function SearchQaPage() {
  return <SearchQaArtifactApp initialPayload={buildSearchQaArtifact(2500)} />
}
